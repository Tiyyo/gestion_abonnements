package enrich

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"log"
	"net/http"
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

