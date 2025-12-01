package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/platform/s3client"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	"go.uber.org/zap"
)

// Using v1 API with gemini-2.5-flash
const geminiURL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"

// AgentService handles AI-powered search queries
type AgentService struct {
	apiKey        string
	listingsRepo  repository.ListingRepo
	imagesRepo    repository.ImageRepo // for primary image lookup
	s3            *s3client.Client     // for presign
	expiryMinutes int                  // presign expiry
	logger        *zap.Logger
}

// ====== Helper: keyword expansion ======

// expandKeywords adds variants like "cmpe 202" / "cmpe-202" for tokens such as "cmpe202".
func expandKeywords(src []string) []string {
	var out []string
	seen := map[string]struct{}{}

	add := func(s string) {
		s = strings.ToLower(strings.TrimSpace(s))
		if s == "" {
			return
		}
		if _, ok := seen[s]; ok {
			return
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}

	for _, tok := range src {
		add(tok)

		t := strings.ToLower(strings.TrimSpace(tok))
		if t == "" {
			continue
		}
		collapsed := strings.ReplaceAll(strings.ReplaceAll(t, " ", ""), "-", "")
		alpha, numeric := splitAlphaNumeric(collapsed)
		if alpha != "" && numeric != "" {
			add(alpha + numeric)       // cmpe202
			add(alpha + " " + numeric) // cmpe 202
			add(alpha + "-" + numeric) // cmpe-202
		}
	}
	return out
}

func splitAlphaNumeric(s string) (alpha, numeric string) {
	i := -1
	for idx, r := range s {
		if r >= '0' && r <= '9' {
			i = idx
			break
		}
	}
	if i <= 0 || i >= len(s)-1 {
		return "", ""
	}
	alpha, numeric = s[:i], s[i:]

	for _, r := range alpha {
		if r < 'a' || r > 'z' {
			return "", ""
		}
	}
	for _, r := range numeric {
		if r < '0' || r > '9' {
			return "", ""
		}
	}
	return
}

// ====== Helper: course-code based narrowing (CMPE 202, MATH 133A, etc.) ======

// courseCodeRe matches patterns like "CMPE 202", "cmpe-202", "MATH 133A"
var courseCodeRe = regexp.MustCompile(`(?i)\b([a-z]{2,5})\s*[- ]?\s*(\d{2,3}[a-z]?)\b`)

// extractCourseTokens pulls out course-like tokens from the query and returns
// variants ("cmpe202", "cmpe 202", "cmpe-202").
func extractCourseTokens(text string) []string {
	text = strings.ToLower(text)
	matches := courseCodeRe.FindAllStringSubmatch(text, -1)
	if len(matches) == 0 {
		return nil
	}

	var raw []string
	for _, m := range matches {
		if len(m) < 3 {
			continue
		}
		alpha := strings.TrimSpace(m[1])
		num := strings.TrimSpace(m[2])
		if alpha == "" || num == "" {
			continue
		}
		raw = append(raw,
			alpha+num,     // cmpe202
			alpha+" "+num, // cmpe 202
			alpha+"-"+num, // cmpe-202
		)
	}

	if len(raw) == 0 {
		return nil
	}
	return expandKeywords(raw) // dedup + normalize
}

// filterListingsByStrongTokens keeps only listings whose title/description
// contains any of the strong course tokens. If none match, it falls back
// to the original slice (so generic queries still work).
func filterListingsByStrongTokens(query string, listings []domain.Listing) []domain.Listing {
	tokens := extractCourseTokens(query)
	if len(tokens) == 0 {
		// no course-like tokens -> don't filter
		return listings
	}

	var filtered []domain.Listing
	for _, l := range listings {
		text := strings.ToLower(l.Title + " " + l.Description)
		matched := false
		for _, tok := range tokens {
			tok = strings.ToLower(strings.TrimSpace(tok))
			if tok == "" {
				continue
			}
			if strings.Contains(text, tok) {
				matched = true
				break
			}
		}
		if matched {
			filtered = append(filtered, l)
		}
	}

	// If we found at least one exact-ish match, return those.
	// Otherwise, keep original results so user still sees something.
	if len(filtered) > 0 {
		return filtered
	}
	return listings
}

// ====== Robust DB search with retries ======

// searchListingsWithRetries tries multiple Q variants and relaxes filters if needed.
func (s *AgentService) searchListingsWithRetries(ctx context.Context, intent *SearchIntent) ([]domain.Listing, error) {
	base := repository.ListParams{
		Category: intent.Category,
		PriceMin: intent.MinPrice,
		PriceMax: intent.MaxPrice,
		Status:   "active",
		Limit:    10,
		Offset:   0,
		Sort:     "created_desc",
	}

	var variants []string
	if len(intent.Keywords) > 0 {
		// expanded keywords first (cmpe202 / cmpe 202 / cmpe-202)
		variants = append(variants, strings.Join(expandKeywords(intent.Keywords), " "))
		// raw keywords
		variants = append(variants, strings.Join(intent.Keywords, " "))
	}
	// also try with empty q
	variants = append(variants, "")

	type attempt struct {
		p      repository.ListParams
		reason string
	}
	var tries []attempt

	// A: category + q variants
	for _, q := range variants {
		p := base
		p.Q = q
		tries = append(tries, attempt{p, "category+q"})
	}
	// B: drop category, keep q
	for _, q := range variants {
		p := base
		p.Category = ""
		p.Q = q
		tries = append(tries, attempt{p, "q-only"})
	}
	// C: broad — drop category, drop q
	tries = append(tries, attempt{base, "broad-no-q-no-category"})
	tries[len(tries)-1].p.Category = ""
	tries[len(tries)-1].p.Q = ""

	for _, t := range tries {
		s.logger.Info("search attempt",
			zap.String("reason", t.reason),
			zap.String("q", t.p.Q),
			zap.String("category", t.p.Category),
			zap.Any("min", t.p.PriceMin),
			zap.Any("max", t.p.PriceMax),
		)
		items, _, err := s.listingsRepo.List(ctx, t.p)
		if err != nil {
			return nil, err
		}
		if len(items) > 0 {
			return items, nil
		}
	}
	return nil, nil
}

// ====== Chat entrypoint (WS event: chat.message → pubsub.chat.request → here) ======

func (s *AgentService) ProcessChat(ctx context.Context, text string) (string, []pubsub.ListingInfo, error) {
	t := strings.TrimSpace(text)
	l := strings.ToLower(t)

	// Very light small-talk router
	if isGreeting(l) {
		return "Hey! 👋 I’m the CampusHub assistant. Tell me what you’re looking for, like “used CMPE 202 textbook under $40”.", nil, nil
	}
	if isThanks(l) {
		return "You’re welcome! If you want, tell me a course or item and I’ll check what’s available.", nil, nil
	}

	// Treat as product search
	intent := &SearchIntent{Keywords: []string{}}

	// 1) Try LLM intent
	if strings.TrimSpace(s.apiKey) != "" {
		if aiIntent, err := s.extractSearchIntent(ctx, t); err == nil {
			intent = aiIntent
		}
	}

	// 2) Heuristic backup if LLM was empty or too vague
	if len(intent.Keywords) == 0 && intent.Category == "" && intent.MinPrice == nil && intent.MaxPrice == nil {
		intent = s.simpleIntentFromText(l)
	} else {
		// Even if LLM extracted some fields, try to extract prices heuristically as backup
		if intent.MinPrice == nil && intent.MaxPrice == nil {
			minPrice, maxPrice := extractPriceFromText(l)
			if minPrice != nil || maxPrice != nil {
				intent.MinPrice = minPrice
				intent.MaxPrice = maxPrice
			}
		}
	}

	// 3) Robust search with retries
	items, err := s.searchListingsWithRetries(ctx, intent)
	if err != nil {
		return "", nil, err
	}

	// 4) Extra narrowing for course-like queries (CMPE 202, MATH 133A, ...)
	items = filterListingsByStrongTokens(text, items)

	// 5) Rank and filter by relevance
	items = s.rankAndFilterByRelevance(text, intent, items)

	// 6) Map to DTOs
	results := s.toFullListingInfos(ctx, items)
	answer := s.generateAnswer(t, intent, len(results))
	return answer, results, nil
}

func isGreeting(l string) bool {
	// Only treat as greeting if it's a short message that's primarily a greeting
	// This prevents "hi, I need a calculator" from being treated as just a greeting
	l = strings.TrimSpace(l)
	
	// Remove common punctuation for comparison
	cleanL := strings.Trim(l, "!?.,;:")
	cleanL = strings.ToLower(cleanL)
	
	// If it's too long, it's probably not just a greeting
	if len(cleanL) > 50 {
		return false
	}
	
	// Exact matches for common greetings (case-insensitive, punctuation-agnostic)
	exactGreetings := []string{"hi", "hello", "hey", "howdy", "greetings", "hii", "helloo", "heyy"}
	for _, g := range exactGreetings {
		if cleanL == g {
			return true
		}
	}
	
	// Check if it starts with a greeting word followed by conversational words only
	greetingWords := []string{"hi", "hello", "hey", "howdy", "greetings"}
	for _, g := range greetingWords {
		if cleanL == g {
			return true // Exact match
		}
		
		// Check if it starts with greeting + space/punctuation
		if strings.HasPrefix(cleanL, g+" ") || strings.HasPrefix(cleanL, g+"!") || strings.HasPrefix(cleanL, g+"?") {
			// Get the rest after the greeting
			rest := cleanL[len(g):]
			rest = strings.TrimSpace(rest)
			rest = strings.Trim(rest, "!?.,;:")
			
			// If rest is empty or just conversational words, it's a greeting
			if rest == "" {
				return true
			}
			
			// List of product/search-related words that indicate it's NOT just a greeting
			productWords := []string{
				"find", "search", "looking", "need", "want", "buy", "sell", "price", 
				"textbook", "book", "laptop", "calculator", "furniture", "electronics", 
				"clothing", "under", "cheap", "affordable", "macbook", "iphone", "cmpe",
			}
			
			// If rest contains product words, it's NOT just a greeting
			for _, pw := range productWords {
				if strings.Contains(rest, pw) {
					return false
				}
			}
			
			// List of conversational follow-ups that are OK (these make it still a greeting)
			conversationalFollowups := []string{
				"there", "how are you", "what's up", "how's it going", "nice to meet", 
				"good to see", "how do you do", "pleasure", "nice", "good", "fine",
			}
			
			// If rest contains conversational followups, it's still a greeting
			for _, cf := range conversationalFollowups {
				if strings.Contains(rest, cf) {
					return true
				}
			}
			
			// If rest is very short (1-2 words) and no product words, likely a greeting
			words := strings.Fields(rest)
			if len(words) <= 2 && len(rest) < 20 {
				return true
			}
		}
	}
	
	return false
}

func isThanks(l string) bool {
	thanks := []string{"thanks", "thank you", "thx", "appreciate", "grateful"}
	for _, t := range thanks {
		if strings.Contains(l, t) {
			return true
		}
	}
	return false
}

// isConversational checks if the query is a conversational question (not a product search)
func isConversational(l string) bool {
	// First, check for product-related terms - if present, it's NOT just conversational
	productIndicators := []string{
		"find", "search", "looking for", "need", "want", "buy", "sell", "price", 
		"textbook", "book", "laptop", "calculator", "furniture", "electronics", 
		"clothing", "under $", "cheap", "affordable", "macbook", "iphone", 
		"textbooks", "books", "cmpe", "math", "course",
	}
	
	for _, pi := range productIndicators {
		if strings.Contains(l, pi) {
			return false // Has product indicators, treat as search
		}
	}
	
	// Check for clear conversational patterns
	conversationalPatterns := []string{
		"how are you", "how's it going", "what's up", "what are you", "who are you",
		"what can you do", "what do you", "can you help", "tell me about yourself",
		"what is campus", "explain campus", "describe campus",
	}
	for _, cp := range conversationalPatterns {
		if strings.Contains(l, cp) {
			return true
		}
	}
	
	// For very short queries (less than 20 chars) without product words, treat as conversational
	// But only if they're clearly questions or conversational
	if len(l) < 20 {
		questionWords := []string{"what", "who", "how", "why", "when", "where", "can", "do", "are", "is", "you"}
		hasQuestionWord := false
		for _, qw := range questionWords {
			if strings.Contains(l, qw) {
				hasQuestionWord = true
				break
			}
		}
		if hasQuestionWord {
			return true
		}
	}
	
	return false
}

// extractPriceFromText extracts price constraints from natural language text
func extractPriceFromText(text string) (*float64, *float64) {
	text = strings.ToLower(text)
	var minPrice, maxPrice *float64
	
	// Regex patterns for price extraction
	// Match patterns like: "under $500", "under 900$", "under 1600 dollars", "below $100", "less than $200", "max $300", "up to $500"
	underPattern := regexp.MustCompile(`(?:under|below|less than|max|maximum|up to|at most|cheaper than)\s*\$?\s*(\d+(?:\.\d+)?)\s*\$?`)
	// Match patterns like: "over $50", "above $100", "at least $200", "minimum $300", "more than $400"
	overPattern := regexp.MustCompile(`(?:over|above|at least|minimum|more than)\s*\$?\s*(\d+(?:\.\d+)?)\s*\$?`)
	
	// Extract max price (under/below/less than)
	if matches := underPattern.FindStringSubmatch(text); len(matches) > 1 {
		if price, err := strconv.ParseFloat(matches[1], 64); err == nil {
			maxPrice = &price
		}
	}
	
	// Extract min price (over/above/at least)
	if matches := overPattern.FindStringSubmatch(text); len(matches) > 1 {
		if price, err := strconv.ParseFloat(matches[1], 64); err == nil {
			minPrice = &price
		}
	}
	
	return minPrice, maxPrice
}

func (s *AgentService) simpleIntentFromText(l string) *SearchIntent {
	intent := &SearchIntent{}
	if l != "" {
		intent.Keywords = strings.Fields(l)
	}
	
	// Extract prices from the query
	intent.MinPrice, intent.MaxPrice = extractPriceFromText(l)
	
	switch {
	case strings.Contains(l, "textbook") || strings.Contains(l, "book"):
		intent.Category = "Textbooks"
	case strings.Contains(l, "macbook") || strings.Contains(l, "laptop") || strings.Contains(l, "electronics") || strings.Contains(l, "iphone"):
		intent.Category = "Electronics"
	case strings.Contains(l, "desk") || strings.Contains(l, "chair") || strings.Contains(l, "furniture"):
		intent.Category = "Furniture"
	}
	return intent
}

// ====== Constructors ======

// NewAgentService creates a basic agent service (no media enrichment)
func NewAgentService(apiKey string, listingsRepo repository.ListingRepo, logger *zap.Logger) *AgentService {
	return &AgentService{
		apiKey:       apiKey,
		listingsRepo: listingsRepo,
		logger:       logger,
	}
}

// NewAgentServiceFull creates agent service with image + S3 enrichment
func NewAgentServiceFull(apiKey string, listingsRepo repository.ListingRepo, imagesRepo repository.ImageRepo, s3 *s3client.Client, expiryMinutes int, logger *zap.Logger) *AgentService {
	return &AgentService{
		apiKey:        apiKey,
		listingsRepo:  listingsRepo,
		imagesRepo:    imagesRepo,
		s3:            s3,
		expiryMinutes: expiryMinutes,
		logger:        logger,
	}
}

// ====== Gemini types ======

type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// Parsed search intent
type SearchIntent struct {
	Category string   `json:"category"`
	Keywords []string `json:"keywords"`
	MinPrice *float64 `json:"minPrice"`
	MaxPrice *float64 `json:"maxPrice"`
}

// ====== Agent entrypoint (WS event: agent.search → pubsub.agent.request → here) ======

// ProcessQuery returns DB results enriched for frontend consumption
func (s *AgentService) ProcessQuery(ctx context.Context, query string) (string, []pubsub.ListingInfo, error) {
	s.logger.Info("ProcessQuery called", zap.String("query", query))

	t := strings.TrimSpace(query)
	l := strings.ToLower(t)

	// CRITICAL: Handle greetings and conversational queries FIRST, before any search
	// These should return immediately without doing any database queries
	
	// Handle greetings - must be strict to avoid false positives
	if isGreeting(l) {
		s.logger.Info("Detected greeting, returning greeting response", zap.String("query", query))
		return "Hey! 👋 I'm the CampusHub assistant. I can help you find products on campus or just chat! Try asking me \"MacBook under $500\" or \"used CMPE 202 textbook\" or just say \"how are you\"!", nil, nil
	}
	
	// Handle thanks
	if isThanks(l) {
		s.logger.Info("Detected thanks, returning thanks response", zap.String("query", query))
		return "You're welcome! 😊 If you need anything else, just ask. I can help you find products or answer questions!", nil, nil
	}
	
	// Handle conversational questions - check these BEFORE doing any search
	if isConversational(l) {
		s.logger.Info("Detected conversational query, returning conversational response", zap.String("query", query))
		if strings.Contains(l, "how are you") || strings.Contains(l, "how's it going") || strings.Contains(l, "what's up") {
			return "I'm doing great, thanks for asking! 😊 I'm here to help you find products on CampusHub. What are you looking for today?", nil, nil
		}
		if strings.Contains(l, "what are you") || strings.Contains(l, "who are you") {
			return "I'm the CampusHub AI assistant! I help students find products like textbooks, electronics, furniture, and more. Just tell me what you're looking for, and I'll search our listings for you.", nil, nil
		}
		if strings.Contains(l, "what can you do") || strings.Contains(l, "help me") || strings.Contains(l, "can you help") {
			return "I can help you:\n• Search for products (e.g., \"MacBook under $500\")\n• Find textbooks by course (e.g., \"CMPE 202 textbook\")\n• Chat and answer questions\n\nJust ask me anything!", nil, nil
		}
		// Generic conversational response
		return "I'm here to help! I can search for products on CampusHub or chat with you. What would you like to know?", nil, nil
	}
	
	// If we get here, it's likely a product search - proceed with search logic
	s.logger.Info("Query appears to be a product search, proceeding with search", zap.String("query", query))

	// Start with an empty intent
	intent := &SearchIntent{Keywords: []string{}}

	// 1) Try LLM-based intent extraction (Gemini)
	if strings.TrimSpace(s.apiKey) != "" {
		if aiIntent, err := s.extractSearchIntent(ctx, t); err == nil {
			intent = aiIntent
		} else {
			s.logger.Error("Gemini intent extraction failed in ProcessQuery, using heuristic", zap.Error(err))
		}
	} else {
		s.logger.Warn("No LLM key configured in ProcessQuery, using heuristic intent extraction")
	}

	// 2) Heuristic backup if LLM gave us nothing useful
	if len(intent.Keywords) == 0 && intent.Category == "" && intent.MinPrice == nil && intent.MaxPrice == nil {
		s.logger.Info("ProcessQuery: LLM intent empty, falling back to simpleIntentFromText")
		intent = s.simpleIntentFromText(l)
	} else {
		// Even if LLM extracted some fields, try to extract prices heuristically as backup
		if intent.MinPrice == nil && intent.MaxPrice == nil {
			minPrice, maxPrice := extractPriceFromText(l)
			if minPrice != nil || maxPrice != nil {
				s.logger.Info("ProcessQuery: Extracted prices heuristically as LLM backup",
					zap.Any("minPrice", minPrice),
					zap.Any("maxPrice", maxPrice),
				)
				intent.MinPrice = minPrice
				intent.MaxPrice = maxPrice
			}
		}
	}

	s.logger.Info("ProcessQuery final intent",
		zap.String("category", intent.Category),
		zap.Strings("keywords", intent.Keywords),
		zap.Any("minPrice", intent.MinPrice),
		zap.Any("maxPrice", intent.MaxPrice),
	)

	// 3) Use the same robust search as chat
	listings, err := s.searchListingsWithRetries(ctx, intent)
	if err != nil {
		return "", nil, err
	}

	// 4) Narrow to course-specific listings if query contains "cmpe 202" etc.
	listings = filterListingsByStrongTokens(query, listings)

	// 5) Rank and filter by relevance to ensure precise matches
	listings = s.rankAndFilterByRelevance(query, intent, listings)

	// 6) Map to DTOs and build an answer string
	results := s.toFullListingInfos(ctx, listings)
	answer := s.generateAnswer(query, intent, len(results))
	return answer, results, nil
}

// Fallback: simple extraction + DB query (no LLM key or LLM failure)
func (s *AgentService) processWithoutChatGPT(ctx context.Context, query string) (string, []pubsub.ListingInfo, error) {
	ql := strings.ToLower(strings.TrimSpace(query))

	// Reuse the same heuristic intent builder
	intent := s.simpleIntentFromText(ql)

	s.logger.Info("processWithoutChatGPT intent",
		zap.String("category", intent.Category),
		zap.Strings("keywords", intent.Keywords),
		zap.Any("min", intent.MinPrice),
		zap.Any("max", intent.MaxPrice),
	)

	// Use the same robust search
	listings, err := s.searchListingsWithRetries(ctx, intent)
	if err != nil {
		return "", nil, err
	}

	// Narrow by strong tokens if present
	listings = filterListingsByStrongTokens(query, listings)

	// Rank and filter by relevance
	listings = s.rankAndFilterByRelevance(query, intent, listings)

	results := s.toFullListingInfos(ctx, listings)
	answer := s.generateAnswer(query, intent, len(results))
	return answer, results, nil
}

// ====== LLM intent extraction ======

func (s *AgentService) extractSearchIntent(ctx context.Context, query string) (*SearchIntent, error) {
	prompt := `You are a campus marketplace assistant. Analyze the user's query and extract search parameters.
Return ONLY a valid JSON object with these fields:
- category: one of "Textbooks", "Electronics", "Furniture", "Clothing", "Other", or "" if not specified
- keywords: array of relevant search terms (remove filler words like "I want", "to buy", "need")
- minPrice: minimum price as number or null
- maxPrice: maximum price as number or null

IMPORTANT: Extract prices from phrases like "under $500", "under 900$", "under 1600 dollars", "below $100", "less than $200", "max $300", "maximum $400", "up to $500", "at most $600", "cheaper than $700", "over $50", "above $100", "at least $200", "minimum $300", "more than $400".

Examples:
Query: "used textbook for cmpe202"
{"category":"Textbooks","keywords":["cmpe202","used"],"minPrice":null,"maxPrice":null}

Query: "MacBook under $500"
{"category":"Electronics","keywords":["MacBook"],"minPrice":null,"maxPrice":500}

Query: "i want to buy iphone 17 pro under 900$"
{"category":"Electronics","keywords":["iphone","17","pro"],"minPrice":null,"maxPrice":900}

Query: "i need macbook pro under 1600 dollars"
{"category":"Electronics","keywords":["macbook","pro"],"minPrice":null,"maxPrice":1600}

Query: "cheap desk"
{"category":"Furniture","keywords":["desk","cheap"],"minPrice":null,"maxPrice":null}

Now analyze this query: ` + query

	reqBody := GeminiRequest{
		Contents: []GeminiContent{
			{Parts: []GeminiPart{{Text: prompt}}},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}
	url := fmt.Sprintf("%s?key=%s", geminiURL, s.apiKey)

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := (&http.Client{}).Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini api error: %d - %s", resp.StatusCode, string(body))
	}

	var gr GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&gr); err != nil {
		return nil, err
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from gemini")
	}

	content := gr.Candidates[0].Content.Parts[0].Text
	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start == -1 || end == -1 {
		return nil, fmt.Errorf("invalid json in gemini response")
	}
	jsonStr := content[start : end+1]

	var intent SearchIntent
	if err := json.Unmarshal([]byte(jsonStr), &intent); err != nil {
		return nil, fmt.Errorf("failed to parse intent json: %w", err)
	}
	return &intent, nil
}

// ====== Optional simple search (still used by some code) ======

// Build repo params and query DB (simple version)
func (s *AgentService) searchListings(ctx context.Context, intent *SearchIntent) ([]domain.Listing, error) {
	params := repository.ListParams{
		Category: intent.Category,
		PriceMin: intent.MinPrice,
		PriceMax: intent.MaxPrice,
		Status:   "active", // must match your data
		Limit:    10,       // top results
		Offset:   0,
		Sort:     "created_desc", // same as HTTP default
	}
	if len(intent.Keywords) > 0 {
		params.Q = strings.Join(intent.Keywords, " ")
	}
	listings, _, err := s.listingsRepo.List(ctx, params)
	return listings, err
}

// ====== Relevance ranking and filtering ======

// extractProductKeywords extracts the core product keywords from a natural language query
// Removes filler words like "I want", "looking for", "need", etc.
func extractProductKeywords(query string) []string {
	query = strings.ToLower(strings.TrimSpace(query))
	
	// Remove common filler phrases
	fillerPhrases := []string{
		"i want", "i need", "i'm looking for", "i am looking for",
		"looking for", "need", "want", "search for", "find",
		"show me", "give me", "can i get", "do you have",
	}
	for _, filler := range fillerPhrases {
		query = strings.TrimPrefix(query, filler)
		query = strings.TrimSpace(query)
	}
	
	// Split into words and filter out very common words
	words := strings.Fields(query)
	var keywords []string
	stopWords := map[string]bool{
		"a": true, "an": true, "the": true, "and": true, "or": true,
		"but": true, "in": true, "on": true, "at": true, "to": true,
		"for": true, "of": true, "with": true, "by": true, "from": true,
		"is": true, "are": true, "was": true, "were": true, "be": true,
		"been": true, "being": true, "have": true, "has": true, "had": true,
		"do": true, "does": true, "did": true, "will": true, "would": true,
		"should": true, "could": true, "may": true, "might": true,
		"this": true, "that": true, "these": true, "those": true,
		"under": true, "over": true, "above": true, "below": true,
	}
	
	for _, word := range words {
		word = strings.Trim(word, ".,!?;:")
		if word != "" && !stopWords[word] {
			keywords = append(keywords, word)
		}
	}
	
	return keywords
}

// scoreListing calculates a relevance score for a listing based on the query and keywords
func scoreListing(query string, keywords []string, listing domain.Listing) int {
	score := 0
	queryLower := strings.ToLower(query)
	titleLower := strings.ToLower(listing.Title)
	descLower := strings.ToLower(listing.Description)
	combinedText := titleLower + " " + descLower
	
	// Highest priority: exact phrase match in title
	if strings.Contains(titleLower, queryLower) {
		score += 1000
	} else if strings.Contains(descLower, queryLower) {
		score += 500
	}
	
	// High priority: all keywords present in title
	if len(keywords) > 0 {
		allInTitle := true
		for _, kw := range keywords {
			if !strings.Contains(titleLower, kw) {
				allInTitle = false
				break
			}
		}
		if allInTitle {
			score += 800
		}
		
		// Medium priority: all keywords present in title or description
		allInText := true
		for _, kw := range keywords {
			if !strings.Contains(combinedText, kw) {
				allInText = false
				break
			}
		}
		if allInText {
			score += 400
		}
		
		// Count how many keywords match in title (higher weight)
		titleMatches := 0
		for _, kw := range keywords {
			if strings.Contains(titleLower, kw) {
				titleMatches++
			}
		}
		score += titleMatches * 100
		
		// Count how many keywords match in description (lower weight)
		descMatches := 0
		for _, kw := range keywords {
			if strings.Contains(descLower, kw) {
				descMatches++
			}
		}
		score += descMatches * 50
	}
	
	return score
}

// rankAndFilterByRelevance ranks listings by relevance and filters out low-scoring results
func (s *AgentService) rankAndFilterByRelevance(query string, intent *SearchIntent, listings []domain.Listing) []domain.Listing {
	if len(listings) == 0 {
		return listings
	}
	
	// Extract product keywords from the query
	keywords := extractProductKeywords(query)
	
	// If we have intent keywords, use those too (they're usually more accurate)
	if len(intent.Keywords) > 0 {
		// Merge and deduplicate
		keywordMap := make(map[string]bool)
		for _, kw := range keywords {
			keywordMap[strings.ToLower(kw)] = true
		}
		for _, kw := range intent.Keywords {
			keywordMap[strings.ToLower(kw)] = true
		}
		keywords = make([]string, 0, len(keywordMap))
		for kw := range keywordMap {
			keywords = append(keywords, kw)
		}
	}
	
	// If no keywords extracted, return original results (don't filter)
	if len(keywords) == 0 {
		return listings
	}
	
	// Score each listing
	type scoredListing struct {
		listing domain.Listing
		score   int
	}
	scored := make([]scoredListing, 0, len(listings))
	for _, listing := range listings {
		score := scoreListing(query, keywords, listing)
		scored = append(scored, scoredListing{listing: listing, score: score})
	}
	
	// Sort by score (descending)
	for i := 0; i < len(scored)-1; i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[i].score < scored[j].score {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}
	
	// Filter: only keep listings with a minimum score
	// For queries with multiple keywords, require at least 2 keywords to match
	// For single keyword queries, require the keyword to match
	minScore := 50 // Minimum score to include
	if len(keywords) > 1 {
		// For multi-keyword queries, require at least 2 keywords to match
		minScore = 150 // At least 2 keywords matching (2 * 50 or 1 * 100)
	}
	
	filtered := make([]domain.Listing, 0)
	for _, s := range scored {
		if s.score >= minScore {
			filtered = append(filtered, s.listing)
		}
	}
	
	// If filtering removed all results, return top 3 scored results anyway
	// (better to show something than nothing)
	if len(filtered) == 0 && len(scored) > 0 {
		maxResults := 3
		if len(scored) < maxResults {
			maxResults = len(scored)
		}
		for i := 0; i < maxResults; i++ {
			filtered = append(filtered, scored[i].listing)
		}
		s.logger.Info("Relevance filter removed all results, returning top scored listings",
			zap.String("query", query),
			zap.Int("topScore", scored[0].score),
		)
	} else if len(filtered) < len(listings) {
		s.logger.Info("Relevance filter reduced results",
			zap.String("query", query),
			zap.Int("original", len(listings)),
			zap.Int("filtered", len(filtered)),
			zap.Int("topScore", scored[0].score),
		)
	}
	
	return filtered
}

// ====== Answer + DTO mapping ======

// Natural language answer
func (s *AgentService) generateAnswer(query string, intent *SearchIntent, resultCount int) string {
	if resultCount == 0 {
		return fmt.Sprintf("I couldn't find any items matching '%s'. Try adjusting your search or check back later!", query)
	}
	if resultCount == 1 {
		return fmt.Sprintf("I found 1 item for '%s'. Check it out below!", query)
	}
	return fmt.Sprintf("I found %d items for '%s'. Here are the best matches:", resultCount, query)
}

// toFullListingInfos maps domain listings and enriches image URL like the HTTP handler
func (s *AgentService) toFullListingInfos(ctx context.Context, listings []domain.Listing) []pubsub.ListingInfo {
	out := make([]pubsub.ListingInfo, 0, len(listings))
	for _, l := range listings {
		item := pubsub.ListingInfo{
			ID:          l.ID.String(),
			SellerID:    l.SellerID.String(),
			Title:       l.Title,
			Description: l.Description,
			Category:    l.Category,
			Price:       l.Price, // adjust if you store cents
			Condition:   string(l.Condition),
			Status:      string(l.Status),
			CreatedAt:   l.CreatedAt.Format(time.RFC3339Nano),
			UpdatedAt:   l.UpdatedAt.Format(time.RFC3339Nano),
		}

		// Primary image + presign (if repos/clients available)
		if s.imagesRepo != nil {
			if img, err := s.imagesRepo.GetPrimary(ctx, l.ID); err == nil && img != nil {
				pi := &pubsub.PrimaryImage{Key: img.S3Key}
				if s.s3 != nil && s.expiryMinutes > 0 {
					if url, err := s.s3.PresignGet(ctx, img.S3Key, time.Duration(s.expiryMinutes)*time.Minute); err == nil {
						pi.URL = url
					}
				}
				item.PrimaryImage = pi
			}
		}

		out = append(out, item)
	}
	return out
}
