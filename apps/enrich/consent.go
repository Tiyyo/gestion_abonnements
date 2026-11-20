package enrich

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Renouvellement de l'accord Enable Banking depuis l'app, sans rien garder côté serveur :
//  1. POST …/consent/start    → adresse d'autorisation de la banque et « state » ;
//  2. GET  …/consent/callback → la banque y renvoie le navigateur, qui est aussitôt renvoyé vers l'app ;
//  3. POST …/consent/finish   → échange le code contre la session et la liste des comptes.
// La session et les comptes sont gardés par l'app, qui les renvoie à chaque lecture des soldes.

// AppReturnURL : lien profond de l'APK (schéma d'app.json + route « consent »).
const AppReturnURL = "abonnements://consent"

var (
	ErrCodeExpired        = errors.New("code d'autorisation expiré ou déjà utilisé")
	ErrRedirectNotAllowed = errors.New("adresse de retour non enregistrée chez Enable Banking")
)

type ConsentAccount struct {
	UID                string `json:"uid"`
	Name               string `json:"name"`
	IBANTail           string `json:"ibanTail"`
	Currency           string `json:"currency"`
	Product            string `json:"product"`
	CashAccountType    string `json:"cashAccountType"`
	IdentificationHash string `json:"identificationHash"`
}

type ConsentSession struct {
	SessionID  string           `json:"sessionId"`
	ValidUntil time.Time        `json:"validUntil"`
	Accounts   []ConsentAccount `json:"accounts"`
}

type ConsentBank interface {
	StartConsent(ctx context.Context, state, redirectURL string) (string, error)
	FinishConsent(ctx context.Context, code string) (ConsentSession, error)
}

// StartConsent demande un accord en lecture des soldes seulement, pour Revolut France, compte personnel.
func (b *EnableBanking) StartConsent(ctx context.Context, state, redirectURL string) (string, error) {
	days := b.ConsentDays
	if days <= 0 {
		days = 180
	}
	// Une heure de moins que la durée maximale : un accord demandé à la seconde près serait refusé au moindre écart d'horloge.
	validUntil := b.Now().UTC().Add(time.Duration(days)*24*time.Hour - time.Hour)
	body := map[string]any{
		"access":       map[string]any{"valid_until": validUntil.Format(time.RFC3339), "balances": true, "transactions": false},
		"aspsp":        map[string]string{"name": "Revolut", "country": "FR"},
		"state":        state,
		"redirect_url": redirectURL,
		"psu_type":     "personal",
		"language":     "fr",
	}
	var res struct {
		URL string `json:"url"`
	}
	err := b.call(ctx, http.MethodPost, "/auth", "auth", PSU{}, body, &res)
	var refused *BankError
	if errors.As(err, &refused) && refused.Code == "REDIRECT_URI_NOT_ALLOWED" {
		return "", fmt.Errorf("%w (%d)", ErrRedirectNotAllowed, refused.Status)
	}
	if err != nil {
		return "", err
	}
	if parsed, err := url.Parse(res.URL); err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", errors.New("enable banking auth : adresse d'autorisation inattendue")
	}
	return res.URL, nil
}

// FinishConsent échange le code d'autorisation contre une session. Le code n'apparaît dans aucune erreur.
func (b *EnableBanking) FinishConsent(ctx context.Context, code string) (ConsentSession, error) {
	var res struct {
		SessionID string `json:"session_id"`
		Accounts  []struct {
			UID       string `json:"uid"`
			AccountID *struct {
				IBAN string `json:"iban"`
			} `json:"account_id"`
			Name               string `json:"name"`
			Details            string `json:"details"`
			Product            string `json:"product"`
			CashAccountType    string `json:"cash_account_type"`
			Currency           string `json:"currency"`
			IdentificationHash string `json:"identification_hash"`
		} `json:"accounts"`
		Access struct {
			ValidUntil time.Time `json:"valid_until"`
		} `json:"access"`
	}
	err := b.call(ctx, http.MethodPost, "/sessions", "sessions", PSU{}, map[string]string{"code": code}, &res)
	var refused *BankError
	if errors.As(err, &refused) && (refused.Code == "EXPIRED_AUTHORIZATION_CODE" || refused.Code == "WRONG_AUTHORIZATION_CODE" || refused.Code == "ALREADY_AUTHORIZED") {
		return ConsentSession{}, fmt.Errorf("%w (%d %s)", ErrCodeExpired, refused.Status, refused.Code)
	}
	if err != nil {
		return ConsentSession{}, err
	}
	if !validID(res.SessionID) {
		return ConsentSession{}, errors.New("enable banking sessions : session absente de la réponse")
	}
	session := ConsentSession{SessionID: res.SessionID, ValidUntil: res.Access.ValidUntil.UTC(), Accounts: []ConsentAccount{}}
	for _, account := range res.Accounts {
		// Sans identifiant, un compte ne peut pas être lu : inutile de le proposer.
		if !validID(account.UID) {
			continue
		}
		name := account.Name
		if name == "" {
			name = account.Details
		}
		iban := ""
		if account.AccountID != nil {
			iban = account.AccountID.IBAN
		}
		session.Accounts = append(session.Accounts, ConsentAccount{
			UID: account.UID, Name: clip(name, 80), IBANTail: tail(iban, 4), Currency: clip(account.Currency, 3),
			Product: clip(account.Product, 80), CashAccountType: clip(account.CashAccountType, 4),
			IdentificationHash: clip(account.IdentificationHash, 128),
		})
	}
	return session, nil
}

func clip(value string, max int) string {
	runes := []rune(strings.TrimSpace(value))
	if len(runes) > max {
		runes = runes[:max]
	}
	return string(runes)
}

func tail(value string, n int) string {
	compact := strings.ReplaceAll(value, " ", "")
	if len(compact) <= n {
		return ""
	}
	return compact[len(compact)-n:]
}

type ConsentServer struct {
	Secret string
	Bank   ConsentBank
	// Limiter protège start et finish ; CallbackLimiter la page de retour, qui n'est pas authentifiée.
	Limiter         *Limiter
	CallbackLimiter *Limiter
	// RedirectURL : l'adresse enregistrée chez Enable Banking, lue dans la configuration, jamais dans la requête.
	RedirectURL string
	// ReturnURLs : liens profonds vers lesquels la page de retour peut renvoyer. Le rang choisi voyage dans « state ».
	ReturnURLs []string
	Random     io.Reader
}

// ReturnURLs construit la liste des liens de retour : l'APK d'abord, puis ceux de la configuration (Expo Go).
func ReturnURLs(extra string) []string {
	list := []string{AppReturnURL}
	for _, candidate := range strings.Split(extra, ",") {
		candidate = strings.TrimSpace(candidate)
		parsed, err := url.Parse(candidate)
		if candidate == "" || err != nil || parsed.Scheme == "" || parsed.RawQuery != "" || parsed.Fragment != "" || strings.ContainsAny(candidate, " \t\r\n\"<>") {
			continue
		}
		if len(list) < 10 {
			list = append(list, candidate)
		}
	}
	return list
}

func (s *ConsentServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch consentStep(r.URL.Path) {
	case "start":
		s.ServeStart(w, r)
	case "finish":
		s.ServeFinish(w, r)
	case "callback":
		s.ServeCallback(w, r)
	default:
		writeError(w, http.StatusNotFound, "route inconnue")
	}
}

// consentStep reconnaît « …/consent/start », « …/consent/finish » et « …/consent/callback ».
func consentStep(path string) string {
	trimmed := strings.TrimSuffix(path, "/")
	for _, step := range []string{"start", "finish", "callback"} {
		if strings.HasSuffix(trimmed, "/consent/"+step) {
			return step
		}
	}
	return ""
}

func (s *ConsentServer) guard(w http.ResponseWriter, r *http.Request) bool {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "méthode non autorisée")
		return false
	}
	if !authorized(r.Header.Get("Authorization"), s.Secret) {
		writeError(w, http.StatusUnauthorized, "non autorisé")
		return false
	}
	if s.Bank == nil || s.RedirectURL == "" {
		writeCoded(w, http.StatusServiceUnavailable, "not_configured", "renouvellement non configuré")
		return false
	}
	if !s.Limiter.Allow() {
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "trop de requêtes")
		return false
	}
	return true
}

func decodeBody(r *http.Request, into any) error {
	decoder := json.NewDecoder(io.LimitReader(r.Body, 8192))
	decoder.DisallowUnknownFields()
	return decoder.Decode(into)
}

func (s *ConsentServer) ServeStart(w http.ResponseWriter, r *http.Request) {
	if !s.guard(w, r) {
		return
	}
	var req struct {
		ReturnURL string `json:"returnUrl"`
	}
	if err := decodeBody(r, &req); err != nil {
		writeCoded(w, http.StatusBadRequest, "bad_request", "corps invalide")
		return
	}
	rank := -1
	for i, allowed := range s.ReturnURLs {
		if req.ReturnURL == allowed {
			rank = i
		}
	}
	if rank < 0 {
		writeCoded(w, http.StatusBadRequest, "return_not_allowed", "adresse de retour refusée")
		return
	}
	state, err := s.newState(rank)
	if err != nil {
		log.Printf("consent start: aléa indisponible")
		writeCoded(w, http.StatusInternalServerError, "bank_unavailable", "renouvellement indisponible")
		return
	}
	authURL, err := s.Bank.StartConsent(r.Context(), state, s.RedirectURL)
	if errors.Is(err, ErrRedirectNotAllowed) {
		log.Printf("consent start: %v", err)
		writeCoded(w, http.StatusBadGateway, "redirect_not_allowed", ErrRedirectNotAllowed.Error())
		return
	}
	if err != nil {
		log.Printf("consent start: %v", err)
		writeCoded(w, http.StatusBadGateway, "bank_unavailable", "banque indisponible")
		return
	}
	writeJSON(w, map[string]string{"url": authURL, "state": state})
}

func (s *ConsentServer) ServeFinish(w http.ResponseWriter, r *http.Request) {
	if !s.guard(w, r) {
		return
	}
	var req struct {
		Code string `json:"code"`
	}
	if err := decodeBody(r, &req); err != nil || !validCode(req.Code) {
		writeCoded(w, http.StatusBadRequest, "bad_request", "code invalide")
		return
	}
	session, err := s.Bank.FinishConsent(r.Context(), req.Code)
	if errors.Is(err, ErrCodeExpired) {
		log.Printf("consent finish: %v", err)
		writeCoded(w, http.StatusGone, "code_expired", ErrCodeExpired.Error())
		return
	}
	if err != nil {
		log.Printf("consent finish: %v", err)
		writeCoded(w, http.StatusBadGateway, "bank_unavailable", "banque indisponible")
		return
	}
	writeJSON(w, session)
}

// validCode : un code d'autorisation est une chaîne opaque, sans espace ni caractère de contrôle.
func validCode(code string) bool {
	if code == "" || len(code) > 2048 {
		return false
	}
	for _, c := range code {
		if c < 0x21 || c > 0x7e {
			return false
		}
	}
	return true
}

func (s *ConsentServer) newState(rank int) (string, error) {
	source := s.Random
	if source == nil {
		source = rand.Reader
	}
	nonce := make([]byte, 24)
	if _, err := io.ReadFull(source, nonce); err != nil {
		return "", err
	}
	return strconv.Itoa(rank) + "." + base64.RawURLEncoding.EncodeToString(nonce), nil
}

// returnURL retrouve le lien de retour désigné par « state » ; l'APK à défaut.
func (s *ConsentServer) returnURL(state string) string {
	prefix, _, found := strings.Cut(state, ".")
	rank, err := strconv.Atoi(prefix)
	if !found || err != nil || len(prefix) > 2 || rank < 0 || rank >= len(s.ReturnURLs) {
		return AppReturnURL
	}
	return s.ReturnURLs[rank]
}

var callbackPage = template.Must(template.New("callback").Parse(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Retour dans Sluis</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#4C1E4F;color:#fff;font-family:system-ui,sans-serif}
main{padding:32px;max-width:420px;text-align:center}
h1{font-size:22px;margin:0 0 12px}
p{font-size:16px;line-height:1.5;margin:0 0 28px}
a{display:block;padding:16px 24px;border-radius:999px;background:#F6D5C4;color:#4C1E4F;font-size:17px;font-weight:600;text-decoration:none}
</style>
</head>
<body>
<main>
<h1>Retour dans Sluis</h1>
<p>Si l’app ne s’ouvre pas toute seule, touche le bouton.</p>
<a href="{{.}}">Revenir dans Sluis</a>
</main>
</body>
</html>
`))

// ServeCallback reçoit le navigateur au retour de la banque et le renvoie vers l'app avec le code et « state ».
// Pas d'authentification possible ici (c'est un navigateur) : la page ne fait que recopier ses paramètres vers un lien
// de la liste fermée, et l'app refuse tout « state » qu'elle n'a pas reçu elle-même de /consent/start.
func (s *ConsentServer) ServeCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "méthode non autorisée")
		return
	}
	limiter := s.CallbackLimiter
	if limiter == nil {
		limiter = s.Limiter
	}
	if !limiter.Allow() {
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "trop de requêtes")
		return
	}
	query := r.URL.Query()
	state, code, failure := query.Get("state"), query.Get("code"), query.Get("error")
	if len(state) > 128 || (state != "" && !validCode(state)) || (failure == "" && !validCode(code)) {
		writeError(w, http.StatusBadRequest, "retour invalide")
		return
	}
	forwarded := url.Values{}
	if state != "" {
		forwarded.Set("state", state)
	}
	if failure != "" {
		forwarded.Set("error", errorSlug(failure))
	} else {
		forwarded.Set("code", code)
	}
	target := s.returnURL(state) + "?" + forwarded.Encode()
	header := w.Header()
	header.Set("Content-Type", "text/html; charset=utf-8")
	header.Set("Cache-Control", "no-store")
	header.Set("Referrer-Policy", "no-referrer")
	header.Set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
	header.Set("X-Content-Type-Options", "nosniff")
	header.Set("Refresh", "0;url="+target)
	// Le lien vient de la liste fermée et ses paramètres sont encodés : le schéma d'app peut être laissé tel quel.
	_ = callbackPage.Execute(w, template.URL(target))
}

func errorSlug(value string) string {
	if len(value) > 64 {
		return "error"
	}
	for _, c := range value {
		if !(c >= 'a' && c <= 'z' || c == '_') {
			return "error"
		}
	}
	return value
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(payload)
}

func writeCoded(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message, "code": code})
}
