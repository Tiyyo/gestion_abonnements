package enrich

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var ErrConsent = errors.New("accord bancaire à renouveler")

type Money struct {
	AmountCents int64  `json:"amountCents"`
	Currency    string `json:"currency"`
}

type Balances struct {
	Current           Money     `json:"current"`
	Vault             Money     `json:"vault"`
	ConsentValidUntil time.Time `json:"consentValidUntil"`
	FetchedAt         time.Time `json:"fetchedAt"`
}

type PSU struct {
	IP        string
	UserAgent string
}

// Target désigne la session Enable Banking et les deux comptes à lire. L'app les envoie à chaque requête
// (elle les garde dans son coffre de clés) ; à défaut, ceux des variables d'environnement servent.
type Target struct {
	SessionID string
	Current   string
	Vault     string
}

func (t Target) empty() bool { return t.SessionID == "" && t.Current == "" && t.Vault == "" }

func (t Target) complete() bool { return validID(t.SessionID) && validID(t.Current) && validID(t.Vault) }

// readsCurrent : assez pour lire les mouvements du compte principal, le coffre n'y sert pas.
func (t Target) readsCurrent() bool { return validID(t.SessionID) && validID(t.Current) }

// validID : les identifiants finissent dans un chemin d'URL, seule la forme d'un UUID est acceptée.
func validID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for _, c := range id {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-') {
			return false
		}
	}
	return true
}

type Bank interface {
	Balances(ctx context.Context, psu PSU, target Target) (Balances, error)
}

// BankError : refus d'Enable Banking. Seuls le statut et le code d'erreur sont gardés : ni chemin ni corps,
// qui peuvent contenir un identifiant de session ou un code d'autorisation.
type BankError struct {
	Label  string
	Status int
	Code   string
}

func (e *BankError) Error() string {
	return fmt.Sprintf("enable banking %s : %d %s", e.Label, e.Status, e.Code)
}

type EnableBanking struct {
	BaseURL        string
	AppID          string
	Key            *rsa.PrivateKey
	SessionID      string
	CurrentAccount string
	VaultAccount   string
	Client         *http.Client
	Now            func() time.Time
	// ConsentDays : durée demandée pour un nouvel accord (180 jours à défaut, le maximum annoncé pour Revolut).
	ConsentDays int
}

func ParsePrivateKey(raw string) (*rsa.PrivateKey, error) {
	data := []byte(strings.TrimSpace(raw))
	if !strings.HasPrefix(string(data), "-----BEGIN") {
		decoded, err := base64.StdEncoding.DecodeString(string(data))
		if err != nil {
			return nil, fmt.Errorf("clé privée illisible : %w", err)
		}
		data = decoded
	}
	block, _ := pem.Decode(data)
	if block == nil {
		return nil, errors.New("clé privée : bloc PEM absent")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("clé privée : %w", err)
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("clé privée : RSA attendue")
	}
	return key, nil
}

func (b *EnableBanking) token() (string, error) {
	enc := func(v any) string {
		raw, _ := json.Marshal(v)
		return base64.RawURLEncoding.EncodeToString(raw)
	}
	now := b.Now().Unix()
	unsigned := enc(map[string]string{"typ": "JWT", "alg": "RS256", "kid": b.AppID}) + "." +
		enc(map[string]any{"iss": "enablebanking.com", "aud": "api.enablebanking.com", "iat": now, "exp": now + 300})
	digest := sha256.Sum256([]byte(unsigned))
	signature, err := rsa.SignPKCS1v15(rand.Reader, b.Key, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return unsigned + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

// call envoie une requête signée. label nomme l'appel dans les erreurs, jamais le chemin (il porte des identifiants).
func (b *EnableBanking) call(ctx context.Context, method, path, label string, psu PSU, in, out any) error {
	token, err := b.token()
	if err != nil {
		return err
	}
	var payload io.Reader
	if in != nil {
		raw, err := json.Marshal(in)
		if err != nil {
			return err
		}
		payload = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, b.BaseURL+path, payload)
	if err != nil {
		return fmt.Errorf("enable banking %s : requête invalide", label)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if in != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if psu.IP != "" {
		req.Header.Set("Psu-Ip-Address", psu.IP)
	}
	if psu.UserAgent != "" {
		req.Header.Set("Psu-User-Agent", psu.UserAgent)
	}
	res, err := b.Client.Do(req)
	if err != nil {
		return fmt.Errorf("enable banking %s : injoignable", label)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<18))
	if res.StatusCode != http.StatusOK {
		return &BankError{Label: label, Status: res.StatusCode, Code: errorCode(body)}
	}
	if err := json.Unmarshal(body, out); err != nil {
		return fmt.Errorf("enable banking %s : réponse illisible", label)
	}
	return nil
}

// errorCode extrait le code texte d'une erreur Enable Banking (« EXPIRED_SESSION »…), et rien d'autre.
func errorCode(body []byte) string {
	var parsed struct {
		Error string `json:"error"`
	}
	if json.Unmarshal(body, &parsed) != nil || len(parsed.Error) > 64 {
		return ""
	}
	for _, c := range parsed.Error {
		if !(c >= 'A' && c <= 'Z' || c == '_') {
			return ""
		}
	}
	return parsed.Error
}

func (b *EnableBanking) get(ctx context.Context, path, label string, psu PSU, out any) error {
	err := b.call(ctx, http.MethodGet, path, label, psu, nil, out)
	var refused *BankError
	if errors.As(err, &refused) {
		switch refused.Status {
		case http.StatusUnauthorized, http.StatusForbidden, http.StatusUnprocessableEntity:
			return fmt.Errorf("%w (%s : %d %s)", ErrConsent, label, refused.Status, refused.Code)
		}
	}
	return err
}

// resolve rend la cible envoyée par l'app, ou celle des variables d'environnement si l'app n'en envoie pas.
// `usable` dit ce que la lecture demande : les trois identifiants pour les soldes, session et compte principal pour les mouvements.
func (b *EnableBanking) resolve(target Target, usable func(Target) bool) (Target, error) {
	if target.empty() {
		target = Target{SessionID: b.SessionID, Current: b.CurrentAccount, Vault: b.VaultAccount}
	}
	if !usable(target) {
		return Target{}, fmt.Errorf("%w (aucune session connue)", ErrConsent)
	}
	return target, nil
}

// consentValidUntil vérifie que la session est autorisée et rend la fin de l'accord.
func (b *EnableBanking) consentValidUntil(ctx context.Context, sessionID string) (time.Time, error) {
	var session struct {
		Status string `json:"status"`
		Access struct {
			ValidUntil time.Time `json:"valid_until"`
		} `json:"access"`
	}
	if err := b.get(ctx, "/sessions/"+sessionID, "session", PSU{}, &session); err != nil {
		return time.Time{}, err
	}
	if session.Status != "AUTHORIZED" || !session.Access.ValidUntil.After(b.Now()) {
		return time.Time{}, fmt.Errorf("%w (statut %s)", ErrConsent, session.Status)
	}
	return session.Access.ValidUntil, nil
}

func (b *EnableBanking) Balances(ctx context.Context, psu PSU, target Target) (Balances, error) {
	target, err := b.resolve(target, Target.complete)
	if err != nil {
		return Balances{}, err
	}
	validUntil, err := b.consentValidUntil(ctx, target.SessionID)
	if err != nil {
		return Balances{}, err
	}
	current, err := b.balance(ctx, target.Current, psu)
	if err != nil {
		return Balances{}, err
	}
	vault, err := b.balance(ctx, target.Vault, psu)
	if err != nil {
		return Balances{}, err
	}
	return Balances{Current: current, Vault: vault, ConsentValidUntil: validUntil, FetchedAt: b.Now().UTC()}, nil
}

var balancePreference = []string{"ITAV", "CLAV", "ITBD", "CLBD", "XPCD"}

func (b *EnableBanking) balance(ctx context.Context, uid string, psu PSU) (Money, error) {
	var res struct {
		Balances []struct {
			BalanceType   string `json:"balance_type"`
			BalanceAmount struct {
				Amount   string `json:"amount"`
				Currency string `json:"currency"`
			} `json:"balance_amount"`
		} `json:"balances"`
	}
	if err := b.get(ctx, "/accounts/"+uid+"/balances", "soldes", psu, &res); err != nil {
		return Money{}, err
	}
	if len(res.Balances) == 0 {
		return Money{}, errors.New("aucun solde renvoyé")
	}
	chosen := res.Balances[0]
	for _, kind := range balancePreference {
		found := false
		for _, candidate := range res.Balances {
			if candidate.BalanceType == kind {
				chosen, found = candidate, true
				break
			}
		}
		if found {
			break
		}
	}
	cents, err := ParseCents(chosen.BalanceAmount.Amount)
	if err != nil {
		return Money{}, err
	}
	return Money{AmountCents: cents, Currency: chosen.BalanceAmount.Currency}, nil
}

func ParseCents(amount string) (int64, error) {
	value := strings.TrimSpace(amount)
	negative := strings.HasPrefix(value, "-")
	value = strings.TrimPrefix(value, "-")
	units, decimals, _ := strings.Cut(value, ".")
	if units == "" || len(decimals) > 2 {
		return 0, fmt.Errorf("montant illisible : %q", amount)
	}
	decimals = (decimals + "00")[:2]
	whole, err := strconv.ParseInt(units, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("montant illisible : %q", amount)
	}
	fraction, err := strconv.ParseInt(decimals, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("montant illisible : %q", amount)
	}
	cents := whole*100 + fraction
	if negative {
		cents = -cents
	}
	return cents, nil
}

// psuFrom relaie l'adresse et l'agent de l'app : la lecture compte comme « utilisateur présent ».
func psuFrom(r *http.Request) PSU {
	ip, _, _ := strings.Cut(r.Header.Get("X-Forwarded-For"), ",")
	return PSU{IP: strings.TrimSpace(ip), UserAgent: r.Header.Get("User-Agent")}
}

// En-têtes par lesquels l'app désigne sa session et ses deux comptes : tous les trois, ou aucun.
const (
	HeaderSession        = "X-Sluis-Session"
	HeaderAccountCurrent = "X-Sluis-Account-Current"
	HeaderAccountVault   = "X-Sluis-Account-Vault"
)

// targetFrom lit la cible désignée par l'app ; faux si elle n'envoie qu'une partie des trois en-têtes.
func targetFrom(r *http.Request) (Target, bool) {
	target := Target{
		SessionID: r.Header.Get(HeaderSession),
		Current:   r.Header.Get(HeaderAccountCurrent),
		Vault:     r.Header.Get(HeaderAccountVault),
	}
	return target, target.empty() || target.complete()
}

type BalancesServer struct {
	Secret  string
	Bank    Bank
	Limiter *Limiter
}

func (s *BalancesServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	result, err := s.Bank.Balances(r.Context(), psuFrom(r), target)
	if errors.Is(err, ErrConsent) {
		log.Printf("balances: %v", err)
		writeError(w, http.StatusConflict, ErrConsent.Error())
		return
	}
	if err != nil {
		log.Printf("balances: %v", err)
		writeError(w, http.StatusBadGateway, "soldes indisponibles")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(result)
}
