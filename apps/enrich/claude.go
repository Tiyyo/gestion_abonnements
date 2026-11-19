package enrich

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go/v2"
	"github.com/anthropics/anthropic-sdk-go/v2/option"
)

const Model = "claude-haiku-5-5"

var ErrUpstream = errors.New("service IA indisponible")

type Classifier interface {
	Classify(ctx context.Context, name string) (Response, error)
}

type ClaudeClassifier struct {
	client anthropic.Client
}

func NewClaudeClassifier(opts ...option.RequestOption) *ClaudeClassifier {
	base := []option.RequestOption{option.WithMaxRetries(1), option.WithRequestTimeout(8 * time.Second)}
	return &ClaudeClassifier{client: anthropic.NewClient(append(base, opts...)...)}
}

const systemPrompt = `Tu classes des abonnements grand public (services numériques, presse, sport…) à partir de leur seul nom, tel que saisi par un particulier en France.

Réponds avec :
- category : la catégorie la plus probable parmi la liste imposée ; « Autre » si aucune ne convient ou si le nom ne t'évoque rien.
- iconKey : le slug Simple Icons de la marque (minuscules, sans espace, ex. « netflix », « spotify »), ou null si tu n'es pas sûr de la marque.
- cancelUrl : l'adresse https officielle de la page de résiliation ou de gestion de l'abonnement si tu la connais avec certitude, sinon null. N'invente jamais d'adresse.
- trialDays : la durée habituelle de l'essai gratuit en France en jours, ou null si le service n'en propose pas ou si tu ne sais pas.
- confidence : ta confiance entre 0 et 1 dans la catégorie.`

func responseSchema() map[string]any {
	return map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"required":             []string{"category", "iconKey", "cancelUrl", "trialDays", "confidence"},
		"properties": map[string]any{
			"category":   map[string]any{"type": "string", "enum": Categories},
			"iconKey":    map[string]any{"type": []string{"string", "null"}},
			"cancelUrl":  map[string]any{"type": []string{"string", "null"}},
			"trialDays":  map[string]any{"type": []string{"integer", "null"}},
			"confidence": map[string]any{"type": "number"},
		},
	}
}

func (c *ClaudeClassifier) Classify(ctx context.Context, name string) (Response, error) {
	message, err := c.client.Messages.New(ctx, anthropic.MessageNewParams{
		Model:     Model,
		MaxTokens: 1024,
		System:    []anthropic.TextBlockParam{{Text: systemPrompt}},
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock("Nom de l'abonnement : " + name)),
		},
		OutputConfig: anthropic.OutputConfigParam{
			Effort: anthropic.OutputConfigEffortLow,
			Format: anthropic.JSONOutputFormatParam{Schema: responseSchema()},
		},
	})
	if err != nil {
		var apiErr *anthropic.Error
		if errors.As(err, &apiErr) {
			return Response{}, fmt.Errorf("%w : statut %d", ErrUpstream, apiErr.StatusCode)
		}
		return Response{}, fmt.Errorf("%w : %v", ErrUpstream, err)
	}
	if message.StopReason == anthropic.StopReasonRefusal || message.StopReason == anthropic.StopReasonMaxTokens {
		return Response{}, fmt.Errorf("%w : arrêt %s", ErrUpstream, message.StopReason)
	}

	var text strings.Builder
	for _, block := range message.Content {
		if variant, ok := block.AsAny().(anthropic.TextBlock); ok {
			text.WriteString(variant.Text)
		}
	}
	var raw Response
	if err := json.Unmarshal([]byte(text.String()), &raw); err != nil {
		return Response{}, fmt.Errorf("%w : réponse illisible", ErrUpstream)
	}
	return Sanitize(raw)
}
