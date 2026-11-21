package enrich

import (
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

type Bank interface {
	Balances(ctx context.Context, psu PSU) (Balances, error)
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

func (b *EnableBanking) get(ctx context.Context, path string, psu PSU, out any) error {
	token, err := b.token()
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, b.BaseURL+path, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	if psu.IP != "" {
		req.Header.Set("Psu-Ip-Address", psu.IP)
	}
	if psu.UserAgent != "" {
		req.Header.Set("Psu-User-Agent", psu.UserAgent)
	}
	res, err := b.Client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden || res.StatusCode == http.StatusUnprocessableEntity {
		return fmt.Errorf("%w (%d %s)", ErrConsent, res.StatusCode, truncate(body))
	}
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("enable banking %s : %d %s", path, res.StatusCode, truncate(body))
	}
	return json.Unmarshal(body, out)
}

func truncate(body []byte) string {
	if len(body) > 200 {
		return string(body[:200])
	}
	return string(body)
}

// consentValidUntil vérifie que la session est autorisée et rend la fin de l'accord.
func (b *EnableBanking) consentValidUntil(ctx context.Context) (time.Time, error) {
	var session struct {
		Status string `json:"status"`
		Access struct {
			ValidUntil time.Time `json:"valid_until"`
		} `json:"access"`
	}
	if err := b.get(ctx, "/sessions/"+b.SessionID, PSU{}, &session); err != nil {
		return time.Time{}, err
	}
	if session.Status != "AUTHORIZED" || !session.Access.ValidUntil.After(b.Now()) {
		return time.Time{}, fmt.Errorf("%w (statut %s)", ErrConsent, session.Status)
	}
	return session.Access.ValidUntil, nil
}

func (b *EnableBanking) Balances(ctx context.Context, psu PSU) (Balances, error) {
	validUntil, err := b.consentValidUntil(ctx)
	if err != nil {
		return Balances{}, err
	}
	current, err := b.balance(ctx, b.CurrentAccount, psu)
	if err != nil {
		return Balances{}, err
	}
	vault, err := b.balance(ctx, b.VaultAccount, psu)
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
	if err := b.get(ctx, "/accounts/"+uid+"/balances", psu, &res); err != nil {
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
	result, err := s.Bank.Balances(r.Context(), psuFrom(r))
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
