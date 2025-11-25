package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
		variants = append(variants, strings.Join(expandKeywords(intent.Keywords), " "))
		variants = append(variants, strings.Join(intent.Keywords, " "))
	}
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
	// B: drop category
	for _, q := range variants {
		p := base
		p.Category = ""
		p.Q = q
		tries = append(tries, attempt{p, "q-only"})
	}
	// C: broad
	tries = append(tries, attempt{base, "broad-no-q-no-category"})
	tries[len(tries)-1].p.Category = ""
	tries[len(tries)-1].p.Q = ""

	for _, t := range tries {
		s.logger.Info("chat search attempt",
			zap.String("reason", t.reason),
			zap.String("q", t.p.Q),
			zap.String("category", t.p.Category),
			zap.Any("min", t.p.PriceMin), zap.Any("max", t.p.PriceMax),
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

func (s *AgentService) ProcessChat(ctx context.Context, text string) (string, []pubsub.ListingInfo, error) {
	t := strings.TrimSpace(text)
	l := strings.ToLower(t)

	// Very light small-talk router
	if isGreeting(l) {
		return "Hey! 👋 What are you looking for today? You can say things like “used CMPE 202 textbook under $40”.", nil, nil
	}
	if isThanks(l) {
		return "You’re welcome! If you want, tell me a course or item and I’ll check what’s available.", nil, nil
	}

	// Treat as product search
	intent := &SearchIntent{Keywords: []string{}}
	if strings.TrimSpace(s.apiKey) != "" {
		if aiIntent, err := s.extractSearchIntent(ctx, t); err == nil {
			intent = aiIntent
		}
	}
	// Heuristic backup if LLM was empty or too vague
	if len(intent.Keywords) == 0 && intent.Category == "" && intent.MinPrice == nil && intent.MaxPrice == nil {
		intent = s.simpleIntentFromText(l)
	}

	items, err := s.searchListingsWithRetries(ctx, intent) // uses robust keyword expansion
	if err != nil {
		return "", nil, err
	}
	results := s.toFullListingInfos(ctx, items)
	answer := s.generateAnswer(t, intent, len(results))
	return answer, results, nil
}

func isGreeting(l string) bool {
	return strings.Contains(l, "hi") || strings.Contains(l, "hello") || strings.Contains(l, "hey")
}
func isThanks(l string) bool {
	return strings.Contains(l, "thanks") || strings.Contains(l, "thank you") || strings.Contains(l, "thx")
}
func (s *AgentService) simpleIntentFromText(l string) *SearchIntent {
	intent := &SearchIntent{}
	if l != "" {
		intent.Keywords = strings.Fields(l)
	}
	switch {
	case strings.Contains(l, "textbook") || strings.Contains(l, "book"):
		intent.Category = "Textbooks"
	case strings.Contains(l, "macbook") || strings.Contains(l, "laptop") || strings.Contains(l, "electronics"):
		intent.Category = "Electronics"
	case strings.Contains(l, "desk") || strings.Contains(l, "chair") || strings.Contains(l, "furniture"):
		intent.Category = "Furniture"
	}
	return intent
}

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

// Gemini request/response types
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

func (s *AgentService) ProcessQuery(ctx context.Context, query string) (string, []pubsub.ListingInfo, error) {
	s.logger.Info("ProcessQuery called", zap.String("query", query))

	t := strings.TrimSpace(query)
	l := strings.ToLower(t)

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
	}

	s.logger.Info("ProcessQuery final intent",
		zap.String("category", intent.Category),
		zap.Strings("keywords", intent.Keywords),
		zap.Any("min", intent.MinPrice),
		zap.Any("max", intent.MaxPrice),
	)

	// 3) Use the SAME robust search as chat (with keyword expansion + fallback)
	listings, err := s.searchListingsWithRetries(ctx, intent)
	if err != nil {
		return "", nil, err
	}

	// 4) Map to pubsub DTOs and build an answer string
	results := s.toFullListingInfos(ctx, listings)
	answer := s.generateAnswer(query, intent, len(results))
	return answer, results, nil
}

// Fallback: simple extraction + DB query
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

	// IMPORTANT: use the same robust search with retries & keyword expansion
	listings, err := s.searchListingsWithRetries(ctx, intent)
	if err != nil {
		return "", nil, err
	}

	results := s.toFullListingInfos(ctx, listings)
	answer := s.generateAnswer(query, intent, len(results))
	return answer, results, nil
}

func (s *AgentService) extractSearchIntent(ctx context.Context, query string) (*SearchIntent, error) {
	prompt := `You are a campus marketplace assistant. Analyze the user's query and extract search parameters.
Return ONLY a valid JSON object with these fields:
- category: one of "Textbooks", "Electronics", "Furniture", "Clothing", "Other", or "" if not specified
- keywords: array of relevant search terms
- minPrice: minimum price as number or null
- maxPrice: maximum price as number or null

Examples:
Query: "used textbook for cmpe202"
{"category":"Textbooks","keywords":["cmpe202","used"],"minPrice":null,"maxPrice":null}

Query: "MacBook under $500"
{"category":"Electronics","keywords":["MacBook"],"minPrice":null,"maxPrice":500}

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

// Build repo params and query DB
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
