package enrich

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

var Categories = []string{"Musique", "Vidéo", "Stockage cloud", "Jeux", "Productivité", "Presse", "Santé/Sport", "IA", "Autre"}

type Request struct {
	Name string `json:"name"`
}

type Response struct {
	Category   string  `json:"category"`
	IconKey    *string `json:"iconKey"`
	CancelURL  *string `json:"cancelUrl"`
	TrialDays  *int    `json:"trialDays"`
	Confidence float64 `json:"confidence"`
}

var iconKeyPattern = regexp.MustCompile(`^[a-z0-9_]+$`)

func ValidateName(name string) (string, error) {
	trimmed := strings.TrimSpace(name)
	length := utf8.RuneCountInString(trimmed)
	if length < 1 || length > 100 {
		return "", errors.New("le nom doit faire entre 1 et 100 caractères")
	}
	return trimmed, nil
}

// Sanitize corrige ce qui peut l'être (champ facultatif invalide → null)
// et refuse seulement une catégorie hors liste ou une confiance hors bornes.
func Sanitize(raw Response) (Response, error) {
	out := raw
	if !isCategory(raw.Category) {
		return Response{}, fmt.Errorf("catégorie inconnue : %q", raw.Category)
	}
	if raw.Confidence < 0 || raw.Confidence > 1 {
		return Response{}, fmt.Errorf("confiance hors bornes : %v", raw.Confidence)
	}
	if raw.IconKey != nil && (!iconKeyPattern.MatchString(*raw.IconKey) || !brandIconKeys[*raw.IconKey]) {
		out.IconKey = nil
	}
	if raw.CancelURL != nil && !isHTTPSURL(*raw.CancelURL) {
		out.CancelURL = nil
	}
	if raw.TrialDays != nil && (*raw.TrialDays < 0 || *raw.TrialDays > 365) {
		out.TrialDays = nil
	}
	return out, nil
}

func isCategory(value string) bool {
	for _, c := range Categories {
		if c == value {
			return true
		}
	}
	return false
}

func isHTTPSURL(value string) bool {
	u, err := url.Parse(value)
	return err == nil && u.Scheme == "https" && u.Host != "" && strings.HasPrefix(value, "https://")
}
