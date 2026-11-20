package enrich

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Variables secrètes des fonctions Scaleway.
//   - Toujours : ENRICH_SECRET (secret partagé avec l'app).
//   - Suggestion IA : ANTHROPIC_API_KEY (lue par le SDK).
//   - Soldes et accord bancaire : EB_APP_ID et EB_PRIVATE_KEY (PEM, éventuellement en base64).
//   - Renouvellement depuis l'app : EB_REDIRECT_URL, l'adresse « …/consent/callback » de la fonction, enregistrée telle
//     quelle chez Enable Banking.
//   - Facultatives : EB_SESSION_ID, EB_ACCOUNT_CURRENT et EB_ACCOUNT_VAULT (repli tant que l'app n'envoie pas sa propre
//     session), CONSENT_RETURN_URLS (liens de retour en plus de celui de l'APK, séparés par des virgules, pour Expo Go),
//     EB_CONSENT_DAYS (durée demandée, 180 à défaut).

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
	days, _ := strconv.Atoi(os.Getenv("EB_CONSENT_DAYS"))
	return &EnableBanking{
		BaseURL:        "https://api.enablebanking.com",
		AppID:          os.Getenv("EB_APP_ID"),
		Key:            key,
		SessionID:      os.Getenv("EB_SESSION_ID"),
		CurrentAccount: os.Getenv("EB_ACCOUNT_CURRENT"),
		VaultAccount:   os.Getenv("EB_ACCOUNT_VAULT"),
		Client:         &http.Client{Timeout: 10 * time.Second},
		Now:            time.Now,
		ConsentDays:    days,
	}
}

// Les serveurs sont construits au premier appel. La banque n'est affectée à l'interface que si elle existe,
// pour que « Bank == nil » reste vrai sans clé privée.
var (
	sharedBank = sync.OnceValue(newBank)

	enrichServer = sync.OnceValue(func() *Server {
		return &Server{Secret: os.Getenv("ENRICH_SECRET"), Classifier: NewClaudeClassifier(), Limiter: NewLimiter(30, time.Now)}
	})

	balancesServer = sync.OnceValue(func() *BalancesServer {
		server := &BalancesServer{Secret: os.Getenv("ENRICH_SECRET"), Limiter: NewLimiter(10, time.Now)}
		if bank := sharedBank(); bank != nil {
			server.Bank = bank
		}
		return server
	})

	transactionsServer = sync.OnceValue(func() *TransactionsServer {
		server := &TransactionsServer{Secret: os.Getenv("ENRICH_SECRET"), Limiter: NewLimiter(10, time.Now), Now: time.Now}
		if bank := sharedBank(); bank != nil {
			server.Bank = bank
		}
		return server
	})

	consentServer = sync.OnceValue(func() *ConsentServer {
		server := &ConsentServer{
			Secret:          os.Getenv("ENRICH_SECRET"),
			Limiter:         NewLimiter(10, time.Now),
			CallbackLimiter: NewLimiter(20, time.Now),
			RedirectURL:     strings.TrimSpace(os.Getenv("EB_REDIRECT_URL")),
			ReturnURLs:      ReturnURLs(os.Getenv("CONSENT_RETURN_URLS")),
		}
		if bank := sharedBank(); bank != nil {
			server.Bank = bank
		}
		return server
	})
)

// Handle est le point d'entrée de la fonction « enrich » : « …/consent/* » renouvelle l'accord bancaire,
// « …/balances » lit les soldes Revolut, « …/transactions » les mouvements du compte principal, le reste classe un abonnement.
func Handle(w http.ResponseWriter, r *http.Request) {
	switch {
	case consentStep(r.URL.Path) != "":
		consentServer().ServeHTTP(w, r)
	case strings.HasSuffix(strings.TrimSuffix(r.URL.Path, "/"), "/balances"):
		balancesServer().ServeHTTP(w, r)
	case strings.HasSuffix(strings.TrimSuffix(r.URL.Path, "/"), "/transactions"):
		transactionsServer().ServeHTTP(w, r)
	default:
		enrichServer().ServeHTTP(w, r)
	}
}

// HandleBalances est le point d'entrée de la fonction dédiée aux soldes : « …/consent/* » renouvelle l'accord,
// toute autre adresse lit les soldes.
func HandleBalances(w http.ResponseWriter, r *http.Request) {
	if consentStep(r.URL.Path) != "" {
		consentServer().ServeHTTP(w, r)
		return
	}
	balancesServer().ServeHTTP(w, r)
}

// HandleTransactions est le point d'entrée de la fonction dédiée aux mouvements du compte principal, à toute adresse
// (mêmes variables que HandleBalances).
func HandleTransactions(w http.ResponseWriter, r *http.Request) { transactionsServer().ServeHTTP(w, r) }

// HandleConsentStart, HandleConsentFinish et HandleConsentCallback permettent de déployer chaque étape dans sa propre
// fonction ; Handle et HandleBalances les servent déjà toutes les trois.
func HandleConsentStart(w http.ResponseWriter, r *http.Request) { consentServer().ServeStart(w, r) }

func HandleConsentFinish(w http.ResponseWriter, r *http.Request) { consentServer().ServeFinish(w, r) }

func HandleConsentCallback(w http.ResponseWriter, r *http.Request) {
	consentServer().ServeCallback(w, r)
}
