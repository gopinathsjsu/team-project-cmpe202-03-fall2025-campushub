package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/domain"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/pubsub"
	"github.com/gopinathsjsu/team-project-cmpe202-03-fall2025-campushub/backend/internal/repository"
	"go.uber.org/zap"
)

// Using v1 API with gemini-1.5-flash (faster and cheaper than gemini-pro)
// Note: REST API requires "models/" prefix in URL, but SDK doesn't
const geminiURL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent"
// AgentService handles AI-powered search queries
type AgentService struct {
	apiKey       string
	listingsRepo repository.ListingRepo
	logger       *zap.Logger
}

// NewAgentService creates a new agent service
func NewAgentService(apiKey string, listingsRepo repository.ListingRepo, logger *zap.Logger) *AgentService {
	return &AgentService{
		apiKey:       apiKey,
		listingsRepo: listingsRepo,
		logger:       logger,
	}
}

// GeminiRequest represents the request to Gemini API
type GeminiRequest struct {
	Contents []GeminiContent `json:"contents"`
}

// GeminiContent represents content in Gemini request
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}

// GeminiPart represents a part of Gemini content
type GeminiPart struct {
	Text string `json:"text"`
}

// GeminiResponse represents the response from Gemini API
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// SearchIntent represents the parsed search intent from AI
type SearchIntent struct {
	Category string   `json:"category"`
	Keywords []string `json:"keywords"`
	MinPrice *float64 `json:"minPrice"`
	MaxPrice *float64 `json:"maxPrice"`
}

// ProcessQuery processes a user query and returns search results
func (s *AgentService) ProcessQuery(ctx context.Context, query string) (string, []pubsub.ListingInfo, error) {
	s.logger.Info("ProcessQuery called", zap.String("query", query))
	
	// Check if OpenAI API key is configured
	if s.apiKey == "" {
		s.logger.Warn("OpenAI API key not configured, using simple intent extraction")
		return s.processWithoutChatGPT(ctx, query)
	}
	
	// Step 1: Use Gemini to understand the query
	intent, err := s.extractSearchIntent(ctx, query)
	if err != nil {
		s.logger.Error("Gemini API failed, falling back to simple extraction", zap.Error(err))
		return s.processWithoutChatGPT(ctx, query)
	}

	s.logger.Info("extracted intent from ChatGPT",
		zap.String("category", intent.Category),
		zap.Strings("keywords", intent.Keywords),
	)

	// TEMPORARY: Return mock results without database
	// TODO: Uncomment database search after running migrations
	
	// Mock results for testing
	results := []pubsub.ListingInfo{
		{
			ID:       "mock-id-1",
			Title:    "CMPE 202 Textbook - Software Engineering",
			Category: intent.Category,
			Price:    25.00,
		},
		{
			ID:       "mock-id-2",
			Title:    "Used CMPE 202 Course Materials",
			Category: intent.Category,
			Price:    15.50,
		},
	}

	s.logger.Info("returning mock results with ChatGPT intent", zap.Int("resultCount", len(results)))

	answer := fmt.Sprintf("✨ ChatGPT understood your query! I found %d items in category '%s'. These are mock results.", len(results), intent.Category)

	return answer, results, nil
}

// processWithoutChatGPT is a fallback for when ChatGPT is unavailable
func (s *AgentService) processWithoutChatGPT(ctx context.Context, query string) (string, []pubsub.ListingInfo, error) {
	// Simple intent extraction without ChatGPT
	intent := &SearchIntent{
		Keywords: []string{query},
	}
	
	// Detect category from query
	queryLower := strings.ToLower(query)
	if strings.Contains(queryLower, "textbook") || strings.Contains(queryLower, "book") {
		intent.Category = "Textbooks"
	} else if strings.Contains(queryLower, "macbook") || strings.Contains(queryLower, "laptop") || strings.Contains(queryLower, "electronics") {
		intent.Category = "Electronics"
	}
	
	s.logger.Info("using simple intent (no ChatGPT)",
		zap.String("category", intent.Category),
	)

	// Mock results
	results := []pubsub.ListingInfo{
		{
			ID:       "mock-id-1",
			Title:    "CMPE 202 Textbook - Software Engineering",
			Category: "Textbooks",
			Price:    25.00,
		},
		{
			ID:       "mock-id-2",
			Title:    "Used CMPE 202 Course Materials",
			Category: "Textbooks",
			Price:    15.50,
		},
	}

	answer := fmt.Sprintf("I found %d items for '%s' (simple search, no AI).", len(results), query)
	return answer, results, nil
}

// extractSearchIntent uses Gemini AI to parse the user's query
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
			{
				Parts: []GeminiPart{
					{Text: prompt},
				},
			},
		},
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	// Gemini uses API key in URL parameter
	url := fmt.Sprintf("%s?key=%s", geminiURL, s.apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini api error: %d - %s", resp.StatusCode, string(body))
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from gemini")
	}

	content := geminiResp.Candidates[0].Content.Parts[0].Text
	
	// Extract JSON from response
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

// searchListings searches the database based on extracted intent
func (s *AgentService) searchListings(ctx context.Context, intent *SearchIntent) ([]domain.Listing, error) {
	params := repository.ListParams{
		Category: intent.Category,
		PriceMin: intent.MinPrice,
		PriceMax: intent.MaxPrice,
		Limit:    10, // Return top 10 results
		Status:   "available", // Only search available items
	}

	// Combine keywords into search query
	if len(intent.Keywords) > 0 {
		params.Q = strings.Join(intent.Keywords, " ")
	}

	listings, _, err := s.listingsRepo.List(ctx, params)
	return listings, err
}

// generateAnswer creates a natural language answer
func (s *AgentService) generateAnswer(query string, intent *SearchIntent, resultCount int) string {
	if resultCount == 0 {
		return fmt.Sprintf("I couldn't find any items matching '%s'. Try adjusting your search or check back later!", query)
	}

	if resultCount == 1 {
		return fmt.Sprintf("I found 1 item for '%s'. Check it out below!", query)
	}

	return fmt.Sprintf("I found %d items for '%s'. Here are the best matches:", resultCount, query)
}

