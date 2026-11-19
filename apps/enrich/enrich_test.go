package enrich

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/anthropics/anthropic-sdk-go/v2/option"
)

var update = flag.Bool("update", false, "réécrit les fixtures de contrat")

func fakeAnthropic(t *testing.T, status int, text string, stopReason string, captured *map[string]any) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/messages" {
			t.Errorf("chemin inattendu %s", r.URL.Path)
		}
		if captured != nil {
			body, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(body, captured)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if status != http.StatusOK {
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"api_error","message":"boom"}}`))
			return
		}
		payload, _ := json.Marshal(map[string]any{
			"id": "msg_test", "type": "message", "role": "assistant", "model": Model,
			"content":     []map[string]any{{"type": "text", "text": text}},
			"stop_reason": stopReason, "stop_sequence": nil,
			"usage": map[string]any{"input_tokens": 10, "output_tokens": 10},
		})
		_, _ = w.Write(payload)
	}))
	t.Cleanup(server.Close)
	return server
}

func classifierFor(server *httptest.Server) *ClaudeClassifier {
	return NewClaudeClassifier(option.WithBaseURL(server.URL), option.WithAPIKey("test"), option.WithMaxRetries(0))
}

func TestClassifySendsStructuredOutputRequest(t *testing.T) {
	var captured map[string]any
	server := fakeAnthropic(t, 200, `{"category":"Vidéo","iconKey":"netflix","cancelUrl":"https://www.netflix.com/cancelplan","trialDays":null,"confidence":0.95}`, "end_turn", &captured)

	got, err := classifierFor(server).Classify(context.Background(), "Netflix")
	if err != nil {
		t.Fatal(err)
	}
	if got.Category != "Vidéo" || got.IconKey == nil || *got.IconKey != "netflix" || got.TrialDays != nil {
		t.Fatalf("réponse inattendue %+v", got)
	}
	if captured["model"] != Model {
		t.Errorf("modèle envoyé %v", captured["model"])
	}
	format := captured["output_config"].(map[string]any)["format"].(map[string]any)
	if format["type"] != "json_schema" {
		t.Errorf("format %v", format["type"])
	}
	messages, _ := json.Marshal(captured["messages"])
	if !strings.Contains(string(messages), "Netflix") {
		t.Errorf("le nom n'est pas transmis : %s", messages)
	}
}

func TestClassifySanitizesOptionalFields(t *testing.T) {
	server := fakeAnthropic(t, 200, `{"category":"Musique","iconKey":"inconnu_xyz","cancelUrl":"http://exemple.fr","trialDays":900,"confidence":0.4}`, "end_turn", nil)

	got, err := classifierFor(server).Classify(context.Background(), "Truc")
	if err != nil {
		t.Fatal(err)
	}
	if got.IconKey != nil || got.CancelURL != nil || got.TrialDays != nil {
		t.Fatalf("champs facultatifs non nettoyés : %+v", got)
	}
}

func TestClassifyRejectsUnknownCategory(t *testing.T) {
	server := fakeAnthropic(t, 200, `{"category":"Banque","iconKey":null,"cancelUrl":null,"trialDays":null,"confidence":0.5}`, "end_turn", nil)
	if _, err := classifierFor(server).Classify(context.Background(), "Truc"); err == nil {
		t.Fatal("catégorie hors liste acceptée")
	}
}

func TestClassifyUpstreamFailures(t *testing.T) {
	cases := map[string]*httptest.Server{
		"erreur 500": fakeAnthropic(t, 500, "", "", nil),
		"refus":      fakeAnthropic(t, 200, "", "refusal", nil),
		"illisible":  fakeAnthropic(t, 200, "pas du json", "end_turn", nil),
	}
	for name, server := range cases {
		if _, err := classifierFor(server).Classify(context.Background(), "Truc"); !errors.Is(err, ErrUpstream) {
			t.Errorf("%s : erreur %v", name, err)
		}
	}
}

type stubClassifier struct {
	result Response
	err    error
	calls  int
}

func (s *stubClassifier) Classify(_ context.Context, _ string) (Response, error) {
	s.calls++
	return s.result, s.err
}

func strPtr(s string) *string { return &s }
func intPtr(i int) *int       { return &i }

func newServer(classifier Classifier, perMinute int) *Server {
	return &Server{Secret: "secret", Classifier: classifier, Limiter: NewLimiter(perMinute, time.Now)}
}

func post(server http.Handler, auth, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/enrich", strings.NewReader(body))
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	return rec
}

func TestHandlerRejections(t *testing.T) {
	stub := &stubClassifier{}
	server := newServer(stub, 30)
	cases := []struct {
		name, auth, body string
		status           int
	}{
		{"sans secret", "", `{"name":"Netflix"}`, 401},
		{"mauvais secret", "Bearer autre", `{"name":"Netflix"}`, 401},
		{"nom vide", "Bearer secret", `{"name":"   "}`, 400},
		{"nom trop long", "Bearer secret", `{"name":"` + strings.Repeat("a", 101) + `"}`, 400},
		{"champ en trop", "Bearer secret", `{"name":"Netflix","iban":"FR76"}`, 400},
		{"json invalide", "Bearer secret", `{`, 400},
	}
	for _, c := range cases {
		if rec := post(server, c.auth, c.body); rec.Code != c.status {
			t.Errorf("%s : statut %d, attendu %d", c.name, rec.Code, c.status)
		}
	}
	if stub.calls != 0 {
		t.Errorf("le modèle a été appelé %d fois", stub.calls)
	}

	req := httptest.NewRequest(http.MethodGet, "/enrich", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != 405 {
		t.Errorf("GET : statut %d", rec.Code)
	}
}

func TestHandlerUpstreamError(t *testing.T) {
	server := newServer(&stubClassifier{err: ErrUpstream}, 30)
	if rec := post(server, "Bearer secret", `{"name":"Netflix"}`); rec.Code != http.StatusBadGateway {
		t.Fatalf("statut %d", rec.Code)
	}
}

func TestLimiter(t *testing.T) {
	now := time.Date(2026, 11, 19, 12, 0, 0, 0, time.UTC)
	limiter := NewLimiter(2, func() time.Time { return now })
	if !limiter.Allow() || !limiter.Allow() || limiter.Allow() {
		t.Fatal("capacité de 2 non respectée")
	}
	now = now.Add(30 * time.Second)
	if !limiter.Allow() || limiter.Allow() {
		t.Fatal("recharge d'un jeton en 30 s attendue")
	}
}

func TestHandlerRateLimited(t *testing.T) {
	server := newServer(&stubClassifier{result: Response{Category: "Autre"}}, 1)
	post(server, "Bearer secret", `{"name":"A"}`)
	if rec := post(server, "Bearer secret", `{"name":"B"}`); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("statut %d", rec.Code)
	}
}

// Les fixtures de contracts/fixtures sont relues par la validation Zod de l'app
// (apps/mobile/features/enrich.test.ts). Régénérer : go test ./... -update
func TestContractFixtures(t *testing.T) {
	fixtures := map[string]Response{
		"enrich.response.full.json": {
			Category: "Vidéo", IconKey: strPtr("netflix"), CancelURL: strPtr("https://www.netflix.com/cancelplan"),
			TrialDays: intPtr(30), Confidence: 0.92,
		},
		"enrich.response.empty.json": {Category: "Autre", Confidence: 0.1},
	}
	for file, result := range fixtures {
		server := newServer(&stubClassifier{result: result}, 30)
		rec := post(server, "Bearer secret", `{"name":"Netflix"}`)
		if rec.Code != 200 {
			t.Fatalf("%s : statut %d", file, rec.Code)
		}
		var pretty bytes.Buffer
		if err := json.Indent(&pretty, rec.Body.Bytes(), "", "  "); err != nil {
			t.Fatal(err)
		}
		path := filepath.Join("..", "..", "contracts", "fixtures", file)
		if *update {
			if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(path, pretty.Bytes(), 0o644); err != nil {
				t.Fatal(err)
			}
			continue
		}
		want, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("%s absent, lancer go test ./... -update : %v", file, err)
		}
		if !bytes.Equal(bytes.TrimSpace(want), bytes.TrimSpace(pretty.Bytes())) {
			t.Errorf("%s ne correspond plus à la sortie du serveur :\n%s", file, pretty.String())
		}
	}
}
