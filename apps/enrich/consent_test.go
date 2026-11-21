package enrich

import (
	"bytes"
	"crypto/rsa"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const (
	testRedirect = "https://fn.example/consent/callback"
	expoGoReturn = "exp://127.0.0.1:8081/--/consent"
	goodCode     = "code-valide-123"
	oldCode      = "code-perime-456"
)

const sessionsReply = `{
  "session_id": "5f3c8e6a-1b2d-4c3e-9f4a-7b6c5d4e3f2a",
  "accounts": [
    {"uid": "0a1b2c3d-0000-4000-8000-000000000001", "account_id": {"iban": "FR76 2823 3000 0112 3456 7890 185"}, "name": "Compte courant",
     "product": "Current account", "cash_account_type": "CACC", "currency": "EUR", "identification_hash": "hash-courant", "identification_hashes": ["hash-courant"]},
    {"uid": "0a1b2c3d-0000-4000-8000-000000000002", "account_id": null, "details": "Coffre abonnements",
     "cash_account_type": "SVGS", "currency": "EUR", "identification_hash": "hash-coffre", "identification_hashes": ["hash-coffre"]},
    {"account_id": {"iban": "FR7628233000019999999999999"}, "name": "Sans identifiant", "cash_account_type": "CACC", "currency": "EUR", "identification_hash": "hash-x"}
  ],
  "aspsp": {"name": "Revolut", "country": "FR"},
  "psu_type": "personal",
  "access": {"valid_until": "2027-05-18T14:00:00Z"}
}`

// fakeConsentBank imite POST /auth et POST /sessions d'Enable Banking. authBody reçoit le corps de /auth.
func fakeConsentBank(t *testing.T, key *rsa.PrivateKey, authStatus int, authBody *map[string]any) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		checkJWT(t, key, r)
		if r.Method != http.MethodPost || r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("%s %s : POST JSON attendu", r.Method, r.URL.Path)
		}
		raw, _ := io.ReadAll(r.Body)
		var body map[string]any
		_ = json.Unmarshal(raw, &body)
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/auth":
			if authBody != nil {
				*authBody = body
			}
			if authStatus != http.StatusOK {
				w.WriteHeader(authStatus)
				_, _ = w.Write([]byte(`{"code":422,"message":"Redirect URI not allowed","error":"REDIRECT_URI_NOT_ALLOWED"}`))
				return
			}
			_, _ = w.Write([]byte(`{"url":"https://tilisy.enablebanking.com/welcome?sessionid=abc","authorization_id":"auth-1","psu_id_hash":"h"}`))
		case "/sessions":
			switch body["code"] {
			case goodCode:
				_, _ = w.Write([]byte(sessionsReply))
			case oldCode:
				w.WriteHeader(http.StatusUnprocessableEntity)
				_, _ = w.Write([]byte(`{"code":422,"message":"Authorization code ` + oldCode + ` is expired","error":"EXPIRED_AUTHORIZATION_CODE"}`))
			default:
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = w.Write([]byte(`{"code":500,"message":"boom"}`))
			}
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(server.Close)
	return server
}

func newConsentServer(t *testing.T, authStatus int, authBody *map[string]any) *ConsentServer {
	t.Helper()
	key, pemKey := testKey(t)
	bank := fakeConsentBank(t, key, authStatus, authBody)
	return &ConsentServer{
		Secret: "s3cret", Bank: newTestBank(t, bank.URL, pemKey),
		Limiter: NewLimiter(30, time.Now), CallbackLimiter: NewLimiter(30, time.Now),
		RedirectURL: testRedirect, ReturnURLs: ReturnURLs(expoGoReturn),
		Random: bytes.NewReader(bytes.Repeat([]byte{0xAB}, 4096)),
	}
}

func call(s *ConsentServer, method, path, auth, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Authorization", auth)
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("réponse illisible : %s", rec.Body)
	}
	return out
}

func TestConsentStartDemandeUnAccordEnLectureDesSoldesEtDesMouvements(t *testing.T) {
	var sent map[string]any
	server := newConsentServer(t, http.StatusOK, &sent)

	rec := call(server, http.MethodPost, "/balances/consent/start", "Bearer s3cret", `{"returnUrl":"abonnements://consent"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	got := decode(t, rec)
	state, _ := got["state"].(string)
	if got["url"] != "https://tilisy.enablebanking.com/welcome?sessionid=abc" || !strings.HasPrefix(state, "0.") || len(state) != 34 {
		t.Errorf("réponse inattendue : %v", got)
	}
	if sent["state"] != state || sent["redirect_url"] != testRedirect || sent["psu_type"] != "personal" {
		t.Errorf("corps /auth inattendu : %v", sent)
	}
	aspsp, _ := sent["aspsp"].(map[string]any)
	access, _ := sent["access"].(map[string]any)
	if aspsp["name"] != "Revolut" || aspsp["country"] != "FR" || access["balances"] != true || access["transactions"] != true {
		t.Errorf("banque ou accès inattendus : %v", sent)
	}
	if want := fixedNow.Add(180*24*time.Hour - time.Hour).Format(time.RFC3339); access["valid_until"] != want {
		t.Errorf("fin d'accord demandée %v, attendu %s", access["valid_until"], want)
	}
}

func TestConsentStartChoisitLeLienDeRetourDansLaListeFermee(t *testing.T) {
	server := newConsentServer(t, http.StatusOK, nil)

	rec := call(server, http.MethodPost, "/consent/start", "Bearer s3cret", `{"returnUrl":"`+expoGoReturn+`"}`)
	if state, _ := decode(t, rec)["state"].(string); rec.Code != http.StatusOK || !strings.HasPrefix(state, "1.") {
		t.Errorf("lien Expo Go : statut %d, state %q", rec.Code, state)
	}
	for _, body := range []string{`{"returnUrl":"https://evil.example/"}`, `{"returnUrl":""}`, `{}`, `{"returnUrl":"abonnements://consent","redirectUrl":"https://evil.example"}`, `pas du json`} {
		if rec := call(server, http.MethodPost, "/consent/start", "Bearer s3cret", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s : statut %d, 400 attendu", body, rec.Code)
		}
	}
}

func TestConsentRefuseSansSecretSansConfigurationOuAuDelaDuDebit(t *testing.T) {
	server := newConsentServer(t, http.StatusOK, nil)
	body := `{"returnUrl":"abonnements://consent"}`
	if rec := call(server, http.MethodPost, "/consent/start", "Bearer faux", body); rec.Code != http.StatusUnauthorized {
		t.Errorf("statut %d, 401 attendu", rec.Code)
	}
	if rec := call(server, http.MethodPost, "/consent/finish", "", `{"code":"x"}`); rec.Code != http.StatusUnauthorized {
		t.Errorf("statut %d, 401 attendu", rec.Code)
	}
	if rec := call(server, http.MethodGet, "/consent/start", "Bearer s3cret", ""); rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("statut %d, 405 attendu", rec.Code)
	}
	if rec := call(server, http.MethodPost, "/consent/autre", "Bearer s3cret", body); rec.Code != http.StatusNotFound {
		t.Errorf("statut %d, 404 attendu", rec.Code)
	}
	unconfigured := *server
	unconfigured.RedirectURL = ""
	if rec := call(&unconfigured, http.MethodPost, "/consent/start", "Bearer s3cret", body); rec.Code != http.StatusServiceUnavailable || decode(t, rec)["code"] != "not_configured" {
		t.Errorf("statut %d, 503 attendu", rec.Code)
	}
	limited := *server
	limited.Limiter = NewLimiter(1, time.Now)
	call(&limited, http.MethodPost, "/consent/start", "Bearer s3cret", body)
	if rec := call(&limited, http.MethodPost, "/consent/start", "Bearer s3cret", body); rec.Code != http.StatusTooManyRequests {
		t.Errorf("statut %d, 429 attendu", rec.Code)
	}
}

func TestConsentStartSignaleUneAdresseNonEnregistree(t *testing.T) {
	server := newConsentServer(t, http.StatusUnprocessableEntity, nil)
	rec := call(server, http.MethodPost, "/consent/start", "Bearer s3cret", `{"returnUrl":"abonnements://consent"}`)
	if rec.Code != http.StatusBadGateway || decode(t, rec)["code"] != "redirect_not_allowed" {
		t.Errorf("statut %d : %s", rec.Code, rec.Body)
	}
}

func TestConsentFinishRenvoieLaSessionEtLesComptesLisibles(t *testing.T) {
	server := newConsentServer(t, http.StatusOK, nil)
	rec := call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", `{"code":"`+goodCode+`"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	var got ConsentSession
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if got.SessionID != "5f3c8e6a-1b2d-4c3e-9f4a-7b6c5d4e3f2a" || !got.ValidUntil.Equal(time.Date(2027, 5, 18, 14, 0, 0, 0, time.UTC)) {
		t.Errorf("session inattendue : %+v", got)
	}
	want := []ConsentAccount{
		{UID: "0a1b2c3d-0000-4000-8000-000000000001", Name: "Compte courant", IBANTail: "0185", Currency: "EUR", Product: "Current account", CashAccountType: "CACC", IdentificationHash: "hash-courant"},
		{UID: "0a1b2c3d-0000-4000-8000-000000000002", Name: "Coffre abonnements", Currency: "EUR", CashAccountType: "SVGS", IdentificationHash: "hash-coffre"},
	}
	if len(got.Accounts) != 2 || got.Accounts[0] != want[0] || got.Accounts[1] != want[1] {
		t.Errorf("comptes inattendus : %+v", got.Accounts)
	}
	if strings.Contains(rec.Body.String(), "FR76") {
		t.Errorf("l'IBAN complet ne doit pas sortir : %s", rec.Body)
	}
}

func TestConsentFinishTaitLeCodeDansLesJournaux(t *testing.T) {
	var logs bytes.Buffer
	log.SetOutput(&logs)
	t.Cleanup(func() { log.SetOutput(os.Stderr) })
	server := newConsentServer(t, http.StatusOK, nil)

	rec := call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", `{"code":"`+oldCode+`"}`)
	if rec.Code != http.StatusGone || decode(t, rec)["code"] != "code_expired" {
		t.Errorf("code périmé : statut %d : %s", rec.Code, rec.Body)
	}
	if rec := call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", `{"code":"autre-code"}`); rec.Code != http.StatusBadGateway {
		t.Errorf("panne bancaire : statut %d, 502 attendu", rec.Code)
	}
	for _, body := range []string{`{"code":""}`, `{"code":"avec espace"}`, `{}`, `{"code":"x","state":"y"}`} {
		if rec := call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s : statut %d, 400 attendu", body, rec.Code)
		}
	}
	if journal := logs.String(); strings.Contains(journal, oldCode) || strings.Contains(journal, "autre-code") || !strings.Contains(journal, "EXPIRED_AUTHORIZATION_CODE") {
		t.Errorf("journal inattendu : %s", journal)
	}
}

func TestConsentCallbackRenvoieVersLApp(t *testing.T) {
	server := newConsentServer(t, http.StatusOK, nil)
	cases := []struct{ name, query, want string }{
		{"APK", "code=abc&state=0.xyz", "abonnements://consent?code=abc&state=0.xyz"},
		{"Expo Go", "code=abc&state=1.xyz", expoGoReturn + "?code=abc&state=1.xyz"},
		{"rang inconnu", "code=abc&state=7.xyz", "abonnements://consent?code=abc&state=7.xyz"},
		{"state étranger", "code=abc&state=nimporte", "abonnements://consent?code=abc&state=nimporte"},
		{"refus à la banque", "error=access_denied&error_description=Cancelled+by+user&state=0.xyz", "abonnements://consent?error=access_denied&state=0.xyz"},
		{"erreur exotique", "error=%3Cb%3E&state=0.xyz", "abonnements://consent?error=error&state=0.xyz"},
		{"code à encoder", "code=a%22%3E%3Cscript%3E&state=0.xyz", "abonnements://consent?code=a%22%3E%3Cscript%3E&state=0.xyz"},
	}
	for _, c := range cases {
		rec := call(server, http.MethodGet, "/consent/callback?"+c.query, "", "")
		if rec.Code != http.StatusOK {
			t.Fatalf("%s : statut %d", c.name, rec.Code)
		}
		if got := rec.Header().Get("Refresh"); got != "0;url="+c.want {
			t.Errorf("%s : Refresh %q, attendu %q", c.name, got, c.want)
		}
		page := rec.Body.String()
		if !strings.Contains(page, `href="`+strings.ReplaceAll(c.want, "&", "&amp;")+`"`) || strings.Contains(page, "<script") {
			t.Errorf("%s : page inattendue\n%s", c.name, page)
		}
		if rec.Header().Get("Cache-Control") != "no-store" || rec.Header().Get("Referrer-Policy") != "no-referrer" {
			t.Errorf("%s : en-têtes de confidentialité absents", c.name)
		}
	}
	for _, query := range []string{"", "state=0.xyz", "code=a%20b&state=0.xyz", "code=abc&state=" + strings.Repeat("x", 200)} {
		if rec := call(server, http.MethodGet, "/consent/callback?"+query, "", ""); rec.Code != http.StatusBadRequest {
			t.Errorf("%q : statut %d, 400 attendu", query, rec.Code)
		}
	}
	if rec := call(server, http.MethodPost, "/consent/callback?code=abc&state=0.xyz", "", ""); rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("statut %d, 405 attendu", rec.Code)
	}
}

func TestReturnURLsEcarteLesLiensDouteux(t *testing.T) {
	got := ReturnURLs(" exp://127.0.0.1:8081/--/consent , sans-schema, https://x.example/?a=1, abonnements://consent#x,")
	if len(got) != 2 || got[0] != AppReturnURL || got[1] != expoGoReturn {
		t.Errorf("liste inattendue : %v", got)
	}
}

// Les fixtures de contracts/fixtures sont relues par la validation Zod de l'app
// (apps/mobile/src/features/balances/consent-schema.test.ts). Régénérer : go test ./... -update
func TestConsentContractFixtures(t *testing.T) {
	server := newConsentServer(t, http.StatusOK, nil)
	fixtures := map[string]*httptest.ResponseRecorder{
		"consent-start.response.json":  call(server, http.MethodPost, "/consent/start", "Bearer s3cret", `{"returnUrl":"abonnements://consent"}`),
		"consent-finish.response.json": call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", `{"code":"`+goodCode+`"}`),
		"consent-error.response.json":  call(server, http.MethodPost, "/consent/finish", "Bearer s3cret", `{"code":"`+oldCode+`"}`),
	}
	for file, rec := range fixtures {
		var pretty bytes.Buffer
		if err := json.Indent(&pretty, rec.Body.Bytes(), "", "  "); err != nil {
			t.Fatal(err)
		}
		path := filepath.Join("..", "..", "contracts", "fixtures", file)
		if *update {
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
