package enrich

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	// Profondeur maximale relue, quelle que soit la date demandée.
	maxTransactionDays = 90
	// Garde-fou de pagination : au-delà, la réponse est marquée incomplète.
	maxTransactionPages = 10
	maxLabelRunes       = 140
)

// Transaction est un mouvement du compte principal, normalisé pour l'app (contracts/transactions.schema.json).
type Transaction struct {
	ID          string  `json:"id"`
	BookingDate string  `json:"bookingDate"`
	AmountCents int64   `json:"amountCents"`
	Currency    string  `json:"currency"`
	Direction   string  `json:"direction"`
	Status      string  `json:"status"`
	Label       string  `json:"label"`
	Remittance  *string `json:"remittance"`
}

type Transactions struct {
	From         string        `json:"from"`
	Complete     bool          `json:"complete"`
	Transactions []Transaction `json:"transactions"`
	FetchedAt    time.Time     `json:"fetchedAt"`
}

type TransactionBank interface {
	Transactions(ctx context.Context, psu PSU, target Target, from string) (Transactions, error)
}

type ebParty struct {
	Name string `json:"name"`
}

type ebTransaction struct {
	EntryReference    string `json:"entry_reference"`
	TransactionAmount struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
	} `json:"transaction_amount"`
	CreditDebitIndicator  string   `json:"credit_debit_indicator"`
	Status                string   `json:"status"`
	BookingDate           string   `json:"booking_date"`
	ValueDate             string   `json:"value_date"`
	TransactionDate       string   `json:"transaction_date"`
	Creditor              *ebParty `json:"creditor"`
	Debtor                *ebParty `json:"debtor"`
	RemittanceInformation []string `json:"remittance_information"`
}

// clipLabel ramène un libellé du relevé à une ligne et à maxLabelRunes caractères.
func clipLabel(value string) string {
	return clip(strings.Join(strings.Fields(value), " "), maxLabelRunes)
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

var (
	transactionStatuses   = map[string]string{"BOOK": "booked", "PDNG": "pending", "HOLD": "pending"}
	transactionDirections = map[string]string{"DBIT": "debit", "CRDT": "credit"}
)

// normalize rend le mouvement au format de l'app ; false s'il est inexploitable (annulé, sans date, montant illisible).
// Sans référence stable de la banque, l'identifiant est l'empreinte du contenu et de son rang parmi les mouvements identiques.
func normalize(raw ebTransaction, seen map[string]int) (Transaction, bool) {
	status, known := transactionStatuses[raw.Status]
	direction := transactionDirections[raw.CreditDebitIndicator]
	date := firstNonEmpty(raw.BookingDate, raw.ValueDate, raw.TransactionDate)
	if _, err := time.Parse(time.DateOnly, date); !known || direction == "" || err != nil {
		return Transaction{}, false
	}
	cents, err := ParseCents(raw.TransactionAmount.Amount)
	if err != nil || len(raw.TransactionAmount.Currency) != 3 {
		return Transaction{}, false
	}
	if cents < 0 {
		cents = -cents
	}
	party := raw.Creditor
	if direction == "credit" {
		party = raw.Debtor
	}
	remittance := clipLabel(strings.Join(raw.RemittanceInformation, " "))
	name := ""
	if party != nil {
		name = clipLabel(party.Name)
	}
	tx := Transaction{
		ID: strings.TrimSpace(raw.EntryReference), BookingDate: date, AmountCents: cents,
		Currency: raw.TransactionAmount.Currency, Direction: direction, Status: status,
		Label: firstNonEmpty(name, remittance),
	}
	if remittance != "" && remittance != tx.Label {
		tx.Remittance = &remittance
	}
	if tx.ID == "" {
		content := strings.Join([]string{date, raw.TransactionAmount.Amount, tx.Currency, direction, status, tx.Label, remittance}, "|")
		seen[content]++
		digest := sha256.Sum256([]byte(fmt.Sprintf("%s|%d", content, seen[content])))
		tx.ID = "h-" + hex.EncodeToString(digest[:16])
	}
	return tx, true
}

// Transactions lit les mouvements du compte principal depuis `from` (AAAA-MM-JJ), toutes pages confondues.
func (b *EnableBanking) Transactions(ctx context.Context, psu PSU, target Target, from string) (Transactions, error) {
	target, err := b.resolve(target, Target.readsCurrent)
	if err != nil {
		return Transactions{}, err
	}
	if _, err := b.consentValidUntil(ctx, target.SessionID); err != nil {
		return Transactions{}, err
	}
	result := Transactions{From: from, Transactions: []Transaction{}, FetchedAt: b.Now().UTC()}
	seen := map[string]int{}
	key := ""
	for page := 0; page < maxTransactionPages; page++ {
		query := url.Values{"date_from": {from}}
		if key != "" {
			query.Set("continuation_key", key)
		}
		var res struct {
			Transactions    []ebTransaction `json:"transactions"`
			ContinuationKey string          `json:"continuation_key"`
		}
		if err := b.get(ctx, "/accounts/"+target.Current+"/transactions?"+query.Encode(), "transactions", psu, &res); err != nil {
			return Transactions{}, err
		}
		for _, raw := range res.Transactions {
			if tx, ok := normalize(raw, seen); ok {
				result.Transactions = append(result.Transactions, tx)
			}
		}
		key = res.ContinuationKey
		if key == "" {
			result.Complete = true
			break
		}
	}
	return result, nil
}

type TransactionsServer struct {
	Secret  string
	Bank    TransactionBank
	Limiter *Limiter
	Now     func() time.Time
}

// fromDate valide `from` et le ramène à la profondeur maximale.
func (s *TransactionsServer) fromDate(raw string) (string, error) {
	from, err := time.Parse(time.DateOnly, raw)
	if err != nil {
		return "", errors.New("paramètre from attendu au format AAAA-MM-JJ")
	}
	today := s.Now().UTC().Truncate(24 * time.Hour)
	if from.After(today.AddDate(0, 0, 1)) {
		return "", errors.New("paramètre from dans le futur")
	}
	if oldest := today.AddDate(0, 0, -maxTransactionDays); from.Before(oldest) {
		from = oldest
	}
	return from.Format(time.DateOnly), nil
}

func (s *TransactionsServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "méthode non autorisée")
		return
	}
	if !authorized(r.Header.Get("Authorization"), s.Secret) {
		writeError(w, http.StatusUnauthorized, "non autorisé")
		return
	}
	if s.Bank == nil {
		writeError(w, http.StatusServiceUnavailable, "connexion bancaire non configurée")
		return
	}
	from, err := s.fromDate(r.URL.Query().Get("from"))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if !s.Limiter.Allow() {
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "trop de requêtes")
		return
	}
	target, ok := targetFrom(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "session ou comptes invalides")
		return
	}
	result, err := s.Bank.Transactions(r.Context(), psuFrom(r), target, from)
	if errors.Is(err, ErrConsent) {
		log.Printf("transactions: %v", err)
		writeError(w, http.StatusConflict, ErrConsent.Error())
		return
	}
	if err != nil {
		log.Printf("transactions: %v", err)
		writeError(w, http.StatusBadGateway, "mouvements indisponibles")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(result)
}
