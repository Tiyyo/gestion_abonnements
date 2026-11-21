package enrich

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

const transactionsPage1 = `{"transactions":[
  {"entry_reference":"rev-001","transaction_amount":{"amount":"13.49","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"BOOK",
   "booking_date":"2026-11-12","value_date":"2026-11-13","creditor":{"name":"Netflix"},"remittance_information":["NETFLIX.COM   866-579-7172"]},
  {"entry_reference":"rev-002","transaction_amount":{"amount":"13.80","currency":"EUR"},"credit_debit_indicator":"CRDT","status":"BOOK",
   "booking_date":"2026-11-11","debtor":{"name":"Steeve"},"remittance_information":["From EUR Coffre"]},
  {"entry_reference":"rev-003","transaction_amount":{"amount":"5","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"CNCL","booking_date":"2026-11-12"}
],"continuation_key":"page-2"}`

const transactionsPage2 = `{"transactions":[
  {"transaction_amount":{"amount":"2.99","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"PDNG",
   "value_date":"2026-11-19","remittance_information":["APPLE.COM/BILL"]},
  {"transaction_amount":{"amount":"2.99","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"PDNG",
   "value_date":"2026-11-19","remittance_information":["APPLE.COM/BILL"]},
  {"entry_reference":"rev-004","transaction_amount":{"amount":"abc","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"BOOK","booking_date":"2026-11-12"},
  {"entry_reference":"rev-005","transaction_amount":{"amount":"1.00","currency":"EUR"},"credit_debit_indicator":"DBIT","status":"BOOK"}
],"continuation_key":null}`

type bankCalls struct {
	queries []string
	psu     string
}

func fakeTransactionsBank(t *testing.T, calls *bankCalls, pages map[string]string, sessionStatus string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/sessions/sess-1":
			_ = json.NewEncoder(w).Encode(map[string]any{"status": sessionStatus, "access": map[string]any{"valid_until": fixedNow.Add(24 * time.Hour)}})
		case "/accounts/acc-current/transactions":
			calls.queries = append(calls.queries, r.URL.RawQuery)
			calls.psu = r.Header.Get("Psu-Ip-Address") + "|" + r.Header.Get("Psu-User-Agent")
			page, ok := pages[r.URL.Query().Get("continuation_key")]
			if !ok {
				http.NotFound(w, r)
				return
			}
			_, _ = w.Write([]byte(page))
		default:
			http.NotFound(w, r)
		}
	}))
}

func newTransactionsTestServer(t *testing.T, bankURL string) *TransactionsServer {
	t.Helper()
	_, pemKey := testKey(t)
	return &TransactionsServer{
		Secret: "s3cret", Bank: newTestBank(t, bankURL, pemKey), Limiter: NewLimiter(10, time.Now),
		Now: func() time.Time { return fixedNow },
	}
}

func getTransactions(s *TransactionsServer, auth, query string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, "/transactions"+query, nil)
	req.Header.Set("Authorization", auth)
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 10.0.0.1")
	req.Header.Set("User-Agent", "Sluis/1.0")
	rec := httptest.NewRecorder()
	s.ServeHTTP(rec, req)
	return rec
}

func TestTransactionsNormaliseEtSuitLaPagination(t *testing.T) {
	calls := &bankCalls{}
	bank := fakeTransactionsBank(t, calls, map[string]string{"": transactionsPage1, "page-2": transactionsPage2}, "AUTHORIZED")
	defer bank.Close()
	server := newTransactionsTestServer(t, bank.URL)

	rec := getTransactions(server, "Bearer s3cret", "?from=2026-11-10")
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	var got Transactions
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if !got.Complete || got.From != "2026-11-10" || len(got.Transactions) != 4 {
		t.Fatalf("réponse inattendue : %+v", got)
	}
	netflix := got.Transactions[0]
	if netflix.ID != "rev-001" || netflix.AmountCents != 1349 || netflix.Direction != "debit" || netflix.Status != "booked" ||
		netflix.BookingDate != "2026-11-12" || netflix.Label != "Netflix" || netflix.Remittance == nil || *netflix.Remittance != "NETFLIX.COM 866-579-7172" {
		t.Errorf("débit Netflix inattendu : %+v", netflix)
	}
	if credit := got.Transactions[1]; credit.Direction != "credit" || credit.Label != "Steeve" || credit.AmountCents != 1380 {
		t.Errorf("crédit inattendu : %+v", credit)
	}
	first, second := got.Transactions[2], got.Transactions[3]
	if first.Status != "pending" || first.Label != "APPLE.COM/BILL" || first.Remittance != nil || first.BookingDate != "2026-11-19" {
		t.Errorf("débit en attente inattendu : %+v", first)
	}
	if len(first.ID) != 34 || first.ID == second.ID {
		t.Errorf("identifiants de repli attendus distincts : %q, %q", first.ID, second.ID)
	}
	if len(calls.queries) != 2 || calls.queries[0] != "date_from=2026-11-10" || calls.queries[1] != "continuation_key=page-2&date_from=2026-11-10" {
		t.Errorf("appels inattendus : %v", calls.queries)
	}
	if calls.psu != "203.0.113.7|Sluis/1.0" {
		t.Errorf("en-têtes PSU non transmis : %q", calls.psu)
	}
}

func TestTransactionsIdentifiantDeRepliStable(t *testing.T) {
	ids := func() []string {
		calls := &bankCalls{}
		bank := fakeTransactionsBank(t, calls, map[string]string{"": transactionsPage2}, "AUTHORIZED")
		defer bank.Close()
		var got Transactions
		_ = json.Unmarshal(getTransactions(newTransactionsTestServer(t, bank.URL), "Bearer s3cret", "?from=2026-11-10").Body.Bytes(), &got)
		return []string{got.Transactions[0].ID, got.Transactions[1].ID}
	}
	a, b := ids(), ids()
	if a[0] != b[0] || a[1] != b[1] {
		t.Errorf("identifiants instables d'un appel à l'autre : %v, %v", a, b)
	}
}

func TestTransactionsMarqueUneLectureIncomplete(t *testing.T) {
	calls := &bankCalls{}
	loop := `{"transactions":[],"continuation_key":"again"}`
	bank := fakeTransactionsBank(t, calls, map[string]string{"": loop, "again": loop}, "AUTHORIZED")
	defer bank.Close()

	var got Transactions
	_ = json.Unmarshal(getTransactions(newTransactionsTestServer(t, bank.URL), "Bearer s3cret", "?from=2026-11-10").Body.Bytes(), &got)
	if got.Complete || len(calls.queries) != maxTransactionPages {
		t.Errorf("lecture incomplète attendue après %d pages : complete=%v, %d appels", maxTransactionPages, got.Complete, len(calls.queries))
	}
}

func TestTransactionsBorneLaDateDeDebut(t *testing.T) {
	calls := &bankCalls{}
	bank := fakeTransactionsBank(t, calls, map[string]string{"": `{"transactions":[]}`}, "AUTHORIZED")
	defer bank.Close()
	server := newTransactionsTestServer(t, bank.URL)

	var got Transactions
	_ = json.Unmarshal(getTransactions(server, "Bearer s3cret", "?from=2025-01-01").Body.Bytes(), &got)
	if got.From != "2026-08-21" || calls.queries[0] != "date_from=2026-08-21" {
		t.Errorf("date non ramenée à 90 jours : %q, %v", got.From, calls.queries)
	}
	for _, query := range []string{"", "?from=hier", "?from=2026-12-25"} {
		if rec := getTransactions(server, "Bearer s3cret", query); rec.Code != http.StatusBadRequest {
			t.Errorf("%q : statut %d, 400 attendu", query, rec.Code)
		}
	}
}

func TestTransactionsRefuseSansSecretSansConfigurationOuSansAccord(t *testing.T) {
	bare := &TransactionsServer{Secret: "s3cret", Limiter: NewLimiter(10, time.Now), Now: func() time.Time { return fixedNow }}
	if rec := getTransactions(bare, "Bearer faux", "?from=2026-11-10"); rec.Code != http.StatusUnauthorized {
		t.Errorf("statut %d, 401 attendu", rec.Code)
	}
	if rec := getTransactions(bare, "Bearer s3cret", "?from=2026-11-10"); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("statut %d, 503 attendu", rec.Code)
	}
	req := httptest.NewRequest(http.MethodPost, "/transactions?from=2026-11-10", nil)
	rec := httptest.NewRecorder()
	bare.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("statut %d, 405 attendu", rec.Code)
	}

	bank := fakeTransactionsBank(t, &bankCalls{}, map[string]string{}, "EXPIRED")
	defer bank.Close()
	if rec := getTransactions(newTransactionsTestServer(t, bank.URL), "Bearer s3cret", "?from=2026-11-10"); rec.Code != http.StatusConflict {
		t.Errorf("statut %d, 409 attendu", rec.Code)
	}
}

func TestHandleRouteLesMouvements(t *testing.T) {
	t.Setenv("ENRICH_SECRET", "s3cret")
	t.Setenv("EB_PRIVATE_KEY", "")
	req := httptest.NewRequest(http.MethodGet, "/transactions/?from=2026-11-10", nil)
	req.Header.Set("Authorization", "Bearer s3cret")
	rec := httptest.NewRecorder()
	Handle(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("statut %d, 503 attendu (banque non configurée)", rec.Code)
	}
}

// Les fixtures de contracts/fixtures sont relues par la validation Zod de l'app
// (apps/mobile/src/features/bank-sync/transactions-schema.test.ts). Régénérer : go test ./... -update
func TestTransactionsContractFixtures(t *testing.T) {
	fixtures := map[string]map[string]string{
		"transactions.response.full.json":  {"": transactionsPage1, "page-2": transactionsPage2},
		"transactions.response.empty.json": {"": `{"transactions":[]}`},
	}
	for file, pages := range fixtures {
		bank := fakeTransactionsBank(t, &bankCalls{}, pages, "AUTHORIZED")
		rec := getTransactions(newTransactionsTestServer(t, bank.URL), "Bearer s3cret", "?from=2026-11-10")
		bank.Close()
		if rec.Code != http.StatusOK {
			t.Fatalf("%s : statut %d", file, rec.Code)
		}
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

func TestTransactionsLitLaSessionEnvoyeeParLApp(t *testing.T) {
	var paths []string
	bank := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/sessions/sess-2" {
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "AUTHORIZED", "access": map[string]any{"valid_until": fixedNow.Add(24 * time.Hour)}})
			return
		}
		_, _ = w.Write([]byte(`{"transactions":[]}`))
	}))
	defer bank.Close()
	server := newTransactionsTestServer(t, bank.URL)

	req := httptest.NewRequest(http.MethodGet, "/transactions?from=2026-11-10", nil)
	req.Header.Set("Authorization", "Bearer s3cret")
	req.Header.Set(HeaderSession, "sess-2")
	req.Header.Set(HeaderAccountCurrent, "acc-new-current")
	req.Header.Set(HeaderAccountVault, "acc-new-vault")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("statut %d : %s", rec.Code, rec.Body)
	}
	if len(paths) != 2 || paths[0] != "/sessions/sess-2" || paths[1] != "/accounts/acc-new-current/transactions" {
		t.Errorf("appels inattendus : %v", paths)
	}

	partial := httptest.NewRequest(http.MethodGet, "/transactions?from=2026-11-10", nil)
	partial.Header.Set("Authorization", "Bearer s3cret")
	partial.Header.Set(HeaderSession, "sess-2")
	rec = httptest.NewRecorder()
	server.ServeHTTP(rec, partial)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("session sans comptes : statut %d, 400 attendu", rec.Code)
	}
}
