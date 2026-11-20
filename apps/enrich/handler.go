package enrich

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type Limiter struct {
	mu       sync.Mutex
	capacity float64
	tokens   float64
	perSec   float64
	last     time.Time
	now      func() time.Time
}

func NewLimiter(perMinute int, now func() time.Time) *Limiter {
	capacity := float64(perMinute)
	return &Limiter{capacity: capacity, tokens: capacity, perSec: capacity / 60, last: now(), now: now}
}

func (l *Limiter) Allow() bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	t := l.now()
	l.tokens = min(l.capacity, l.tokens+t.Sub(l.last).Seconds()*l.perSec)
	l.last = t
	if l.tokens < 1 {
		return false
	}
	l.tokens--
	return true
}

type Server struct {
	Secret     string
	Classifier Classifier
	Limiter    *Limiter
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "méthode non autorisée")
		return
	}
	if !authorized(r.Header.Get("Authorization"), s.Secret) {
		writeError(w, http.StatusUnauthorized, "non autorisé")
		return
	}
	if !s.Limiter.Allow() {
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "trop de requêtes")
		return
	}

	var req Request
	decoder := json.NewDecoder(io.LimitReader(r.Body, 4096))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "corps invalide")
		return
	}
	name, err := ValidateName(req.Name)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	result, err := s.Classifier.Classify(r.Context(), name)
	if err != nil {
		log.Printf("enrich: %v", err)
		writeError(w, http.StatusBadGateway, "suggestion indisponible")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func authorized(header, secret string) bool {
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok || secret == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(token), []byte(secret)) == 1
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

var (
	defaultServer     *Server
	balancesServer    *BalancesServer
	once              sync.Once
	dedicatedBalances *BalancesServer
	balancesOnce      sync.Once

	transactionsServer    *TransactionsServer
	dedicatedTransactions *TransactionsServer
	transactionsOnce      sync.Once
)

// Une interface qui contient un pointeur nil n'est pas nil : les serveurs ne reçoivent la banque que si elle est configurée.
func newBalancesServer(secret string) *BalancesServer {
	server := &BalancesServer{Secret: secret, Limiter: NewLimiter(10, time.Now)}
	if bank := newBank(); bank != nil {
		server.Bank = bank
	}
	return server
}

func newTransactionsServer(secret string) *TransactionsServer {
	server := &TransactionsServer{Secret: secret, Limiter: NewLimiter(10, time.Now), Now: time.Now}
	if bank := newBank(); bank != nil {
		server.Bank = bank
	}
	return server
}

func newBank() *EnableBanking {
	raw := os.Getenv("EB_PRIVATE_KEY")
	if raw == "" {
		return nil
	}
	key, err := ParsePrivateKey(raw)
	if err != nil {
		log.Printf("balances: %v", err)
		return nil
	}
	return &EnableBanking{
		BaseURL:        "https://api.enablebanking.com",
		AppID:          os.Getenv("EB_APP_ID"),
		Key:            key,
		SessionID:      os.Getenv("EB_SESSION_ID"),
		CurrentAccount: os.Getenv("EB_ACCOUNT_CURRENT"),
		VaultAccount:   os.Getenv("EB_ACCOUNT_VAULT"),
		Client:         &http.Client{Timeout: 10 * time.Second},
		Now:            time.Now,
	}
}

// Handle est le point d'entrée Scaleway Serverless Functions : « /balances » lit les soldes Revolut,
// « /transactions » les mouvements du compte principal, le reste classe un abonnement.
// Variables secrètes : ANTHROPIC_API_KEY (lue par le SDK), ENRICH_SECRET, EB_APP_ID, EB_PRIVATE_KEY, EB_SESSION_ID, EB_ACCOUNT_CURRENT, EB_ACCOUNT_VAULT.
func Handle(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		secret := os.Getenv("ENRICH_SECRET")
		defaultServer = &Server{
			Secret:     secret,
			Classifier: NewClaudeClassifier(),
			Limiter:    NewLimiter(30, time.Now),
		}
		balancesServer = newBalancesServer(secret)
		transactionsServer = newTransactionsServer(secret)
	})
	path := strings.TrimSuffix(r.URL.Path, "/")
	if strings.HasSuffix(path, "/balances") {
		balancesServer.ServeHTTP(w, r)
		return
	}
	if strings.HasSuffix(path, "/transactions") {
		transactionsServer.ServeHTTP(w, r)
		return
	}
	defaultServer.ServeHTTP(w, r)
}

// HandleBalances est le point d'entrée de la fonction dédiée aux soldes, à toute adresse.
// Variables secrètes : ENRICH_SECRET, EB_APP_ID, EB_PRIVATE_KEY, EB_SESSION_ID, EB_ACCOUNT_CURRENT, EB_ACCOUNT_VAULT.
func HandleBalances(w http.ResponseWriter, r *http.Request) {
	balancesOnce.Do(func() {
		dedicatedBalances = newBalancesServer(os.Getenv("ENRICH_SECRET"))
	})
	dedicatedBalances.ServeHTTP(w, r)
}

// HandleTransactions est le point d'entrée de la fonction dédiée aux mouvements du compte principal, à toute adresse.
// Variables secrètes : ENRICH_SECRET, EB_APP_ID, EB_PRIVATE_KEY, EB_SESSION_ID, EB_ACCOUNT_CURRENT (les mêmes que HandleBalances).
func HandleTransactions(w http.ResponseWriter, r *http.Request) {
	transactionsOnce.Do(func() {
		dedicatedTransactions = newTransactionsServer(os.Getenv("ENRICH_SECRET"))
	})
	dedicatedTransactions.ServeHTTP(w, r)
}
