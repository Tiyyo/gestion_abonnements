package enrich

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

var fixedNow = time.Date(2026, 11, 19, 15, 0, 0, 0, time.UTC)

func testKey(t *testing.T) (*rsa.PrivateKey, string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	der, _ := x509.MarshalPKCS8PrivateKey(key)
	return key, string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der}))
}

// checkJWT vérifie le jeton signé que le client présente à Enable Banking.
func checkJWT(t *testing.T, key *rsa.PrivateKey, r *http.Request) {
	t.Helper()
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("jeton mal formé")
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	signature, _ := base64.RawURLEncoding.DecodeString(parts[2])
	if err := rsa.VerifyPKCS1v15(&key.PublicKey, crypto.SHA256, digest[:], signature); err != nil {
		t.Fatalf("signature invalide : %v", err)
	}
	header, _ := base64.RawURLEncoding.DecodeString(parts[0])
	if !strings.Contains(string(header), `"kid":"app-1"`) {
		t.Errorf("kid absent : %s", header)
	}
}

func fakeBank(t *testing.T, key *rsa.PrivateKey, sessionStatus string, validUntil time.Time, seen map[string]string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		checkJWT(t, key, r)
		seen[r.URL.Path] = r.Header.Get("Psu-Ip-Address") + "|" + r.Header.Get("Psu-User-Agent")
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sessions/sess-1":
			_ = json.NewEncoder(w).Encode(map[string]any{"status": sessionStatus, "access": map[string]any{"valid_until": validUntil}})
		case "/accounts/acc-current/balances":
			_, _ = w.Write([]byte(`{"balances":[{"balance_type":"CLBD","balance_amount":{"amount":"1.00","currency":"EUR"}},{"balance_type":"ITAV","balance_amount":{"amount":"14.58","currency":"EUR"}}]}`))
		case "/accounts/acc-vault/balances":
			_, _ = w.Write([]byte(`{"balances":[{"balance_type":"ITAV","balance_amount":{"amount":"86.3","currency":"EUR"}}]}`))
		case "/sessions/sess-2":
			_ = json.NewEncoder(w).Encode(map[string]any{"status": sessionStatus, "access": map[string]any{"valid_until": validUntil.Add(48 * time.Hour)}})
		case "/accounts/acc-new-current/balances":
			_, _ = w.Write([]byte(`{"balances":[{"balance_type":"ITAV","balance_amount":{"amount":"3.00","currency":"EUR"}}]}`))
		case "/accounts/acc-new-vault/balances":
			_, _ = w.Write([]byte(`{"balances":[{"balance_type":"ITAV","balance_amount":{"amount":"250.00","currency":"EUR"}}]}`))
		case "/sessions/sess-gone":
			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(`{"code":422,"message":"Session sess-gone is expired","error":"EXPIRED_SESSION"}`))
		default:
			http.NotFound(w, r)
		}
	}))
}

func newTestBank(t *testing.T, url string, pemKey string) *EnableBanking {
	t.Helper()
	key, err := ParsePrivateKey(base64.StdEncoding.EncodeToString([]byte(pemKey)))
	if err != nil {
		t.Fatal(err)
	}
	return &EnableBanking{
		BaseURL: url, AppID: "app-1", Key: key, SessionID: "sess-1",
		CurrentAccount: "acc-current", VaultAccount: "acc-vault",
		Client: http.DefaultClient, Now: func() time.Time { return fixedNow },
	}
}

func get(t *testing.T, s *BalancesServer, auth string, headers ...string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/balances", nil)
	req.Header.Set("Authorization", auth)
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
	req.Header.Set("User-Agent", "Sluis/1.0")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

func TestBalancesRenvoieLesDeuxSoldesEnCentimes(t *testing.T) {
	key, pemKey := testKey(t)
	seen := map[string]string{}
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(24*time.Hour), seen)
	defer bank.Close()
	server := &BalancesServer{Secret: "s3cret", Bank: newTestBank(t, bank.URL, pemKey), Limiter: NewLimiter(10, time.Now)}

	rec := get(t, server, "Bearer s3cret")
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	var got Balances
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if got.Current != (Money{1458, "EUR"}) || got.Vault != (Money{8630, "EUR"}) {
		t.Errorf("soldes inattendus : %+v", got)
	}
	if !got.ConsentValidUntil.Equal(fixedNow.Add(24 * time.Hour)) {
		t.Errorf("fin d'accord inattendue : %v", got.ConsentValidUntil)
	}
	if seen["/accounts/acc-vault/balances"] != "203.0.113.7|Sluis/1.0" {
		t.Errorf("en-têtes PSU non transmis : %q", seen["/accounts/acc-vault/balances"])
	}
}

func TestBalancesSignaleUnAccordExpire(t *testing.T) {
	key, pemKey := testKey(t)
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(-time.Hour), map[string]string{})
	defer bank.Close()
	server := &BalancesServer{Secret: "s3cret", Bank: newTestBank(t, bank.URL, pemKey), Limiter: NewLimiter(10, time.Now)}

	if rec := get(t, server, "Bearer s3cret"); rec.Code != http.StatusConflict {
		t.Fatalf("statut %d, 409 attendu", rec.Code)
	}
}

func TestBalancesLitLaSessionEnvoyeeParLApp(t *testing.T) {
	key, pemKey := testKey(t)
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(24*time.Hour), map[string]string{})
	defer bank.Close()
	server := &BalancesServer{Secret: "s3cret", Bank: newTestBank(t, bank.URL, pemKey), Limiter: NewLimiter(10, time.Now)}

	rec := get(t, server, "Bearer s3cret", HeaderSession, "sess-2", HeaderAccountCurrent, "acc-new-current", HeaderAccountVault, "acc-new-vault")
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	var got Balances
	_ = json.Unmarshal(rec.Body.Bytes(), &got)
	if got.Current != (Money{300, "EUR"}) || got.Vault != (Money{25000, "EUR"}) {
		t.Errorf("soldes inattendus : %+v", got)
	}
	if !got.ConsentValidUntil.Equal(fixedNow.Add(72 * time.Hour)) {
		t.Errorf("fin d'accord inattendue : %v", got.ConsentValidUntil)
	}
}

func TestBalancesRefuseUneSessionIncompleteOuMalFormee(t *testing.T) {
	key, pemKey := testKey(t)
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(24*time.Hour), map[string]string{})
	defer bank.Close()
	server := &BalancesServer{Secret: "s3cret", Bank: newTestBank(t, bank.URL, pemKey), Limiter: NewLimiter(10, time.Now)}

	if rec := get(t, server, "Bearer s3cret", HeaderSession, "sess-2"); rec.Code != http.StatusBadRequest {
		t.Errorf("session sans comptes : statut %d, 400 attendu", rec.Code)
	}
	rec := get(t, server, "Bearer s3cret", HeaderSession, "sess-2/../x", HeaderAccountCurrent, "acc-new-current", HeaderAccountVault, "acc-new-vault")
	if rec.Code != http.StatusBadRequest {
		t.Errorf("identifiant mal formé : statut %d, 400 attendu", rec.Code)
	}
}

func TestBalancesSansSessionConnueDemandeUnAccord(t *testing.T) {
	key, pemKey := testKey(t)
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(24*time.Hour), map[string]string{})
	defer bank.Close()
	client := newTestBank(t, bank.URL, pemKey)
	client.SessionID, client.CurrentAccount, client.VaultAccount = "", "", ""
	server := &BalancesServer{Secret: "s3cret", Bank: client, Limiter: NewLimiter(10, time.Now)}

	if rec := get(t, server, "Bearer s3cret"); rec.Code != http.StatusConflict {
		t.Fatalf("statut %d, 409 attendu", rec.Code)
	}
}

func TestErreurBancaireSansIdentifiant(t *testing.T) {
	key, pemKey := testKey(t)
	bank := fakeBank(t, key, "AUTHORIZED", fixedNow.Add(24*time.Hour), map[string]string{})
	defer bank.Close()

	_, err := newTestBank(t, bank.URL, pemKey).Balances(t.Context(), PSU{}, Target{SessionID: "sess-gone", Current: "acc-current", Vault: "acc-vault"})
	if !errors.Is(err, ErrConsent) {
		t.Fatalf("accord expiré attendu, reçu %v", err)
	}
	if strings.Contains(err.Error(), "sess-gone") || !strings.Contains(err.Error(), "EXPIRED_SESSION") {
		t.Errorf("l'erreur doit porter le code et taire la session : %v", err)
	}
}

func TestBalancesRefuseSansSecretOuSansConfiguration(t *testing.T) {
	server := &BalancesServer{Secret: "s3cret", Limiter: NewLimiter(10, time.Now)}
	if rec := get(t, server, "Bearer faux"); rec.Code != http.StatusUnauthorized {
		t.Errorf("statut %d, 401 attendu", rec.Code)
	}
	if rec := get(t, server, "Bearer s3cret"); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("statut %d, 503 attendu", rec.Code)
	}
}

func TestParseCents(t *testing.T) {
	cases := map[string]int64{"86.27": 8627, "14.5": 1450, "100": 10000, "-3.07": -307, "0.00": 0}
	for in, want := range cases {
		got, err := ParseCents(in)
		if err != nil || got != want {
			t.Errorf("ParseCents(%q) = %d, %v ; attendu %d", in, got, err, want)
		}
	}
	for _, bad := range []string{"", "1.234", "abc", "1,5"} {
		if _, err := ParseCents(bad); err == nil {
			t.Errorf("ParseCents(%q) aurait dû échouer", bad)
		}
	}
}
