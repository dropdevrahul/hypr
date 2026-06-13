package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return hex.EncodeToString([]byte(time.Now().String()))
	}
	return hex.EncodeToString(b)
}

// KVPair is a key/value pair (mirrors the KV interface in the frontend).
type KVPair struct {
	Key   string `json:"Key"`
	Value string `json:"Value"`
}

// StoredAuth mirrors the AuthState interface in the frontend.
type StoredAuth struct {
	Type         string `json:"type"`
	Token        string `json:"token"`
	User         string `json:"user"`
	Pass         string `json:"pass"`
	APIKeyName   string `json:"apiKeyName"`
	APIKeyValue  string `json:"apiKeyValue"`
	APIKeyTarget string `json:"apiKeyTarget"`
}

// TabState captures the full editable state of a single request tab.
type TabState struct {
	Method   string          `json:"method"`
	URL      string          `json:"url"`
	Headers  []KVPair        `json:"headers"`
	Params   []KVPair        `json:"params"`
	Auth     StoredAuth      `json:"auth"`
	BodyType string          `json:"bodyType"`
	JSONBody string          `json:"jsonBody"`
	RawBody  string          `json:"rawBody"`
	FormRows []KVPair        `json:"formRows"`
	Settings RequestSettings `json:"settings"`
}

// SavedRequest is a named request stored in a Collection.
type SavedRequest struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Method    string          `json:"method"`
	URL       string          `json:"url"`
	Headers   []KVPair        `json:"headers"`
	Params    []KVPair        `json:"params"`
	Auth      StoredAuth      `json:"auth"`
	BodyType  string          `json:"bodyType"`
	JSONBody  string          `json:"jsonBody"`
	RawBody   string          `json:"rawBody"`
	FormRows  []KVPair        `json:"formRows"`
	Settings  RequestSettings `json:"settings"`
	CreatedAt time.Time       `json:"createdAt"`
	UpdatedAt time.Time       `json:"updatedAt"`
}

// Collection is a named group of SavedRequests.
type Collection struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Requests []SavedRequest `json:"requests"`
}

// HistoryEntry records a brief snapshot of a completed request.
type HistoryEntry struct {
	ID         string    `json:"id"`
	Method     string    `json:"method"`
	URL        string    `json:"url"`
	Status     int       `json:"status"`
	StatusText string    `json:"statusText"`
	DurationMs int64     `json:"durationMs"`
	SentAt     time.Time `json:"sentAt"`
}

// Session is the persisted UI session (open tabs + active tab index).
type Session struct {
	OpenTabs  []TabState `json:"openTabs"`
	ActiveTab int        `json:"activeTab"`
}

// storeData is the root JSON document.
type storeData struct {
	Collections []Collection   `json:"collections"`
	History     []HistoryEntry `json:"history"`
	Session     Session        `json:"session"`
}

const maxHistoryEntries = 200

// Store persists app data as a single JSON file in the OS config dir.
type Store struct {
	mu   sync.Mutex
	path string
	data storeData
}

func newStore() (*Store, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	storeDir := filepath.Join(dir, "hypr")
	if mkErr := os.MkdirAll(storeDir, 0o700); mkErr != nil {
		return nil, mkErr
	}
	s := &Store{path: filepath.Join(storeDir, "store.json")}
	_ = s.load() // first run: file won't exist yet
	return s, nil
}

func (s *Store) load() error {
	raw, err := os.ReadFile(s.path)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, &s.data)
}

func (s *Store) save() error {
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, raw, 0o600)
}

// ── Collections ───────────────────────────────────────────────────────────

func (a *App) ListCollections() []Collection {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	if a.store.data.Collections == nil {
		return []Collection{}
	}
	return a.store.data.Collections
}

func (a *App) SaveCollection(c Collection) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i, existing := range a.store.data.Collections {
		if existing.ID == c.ID {
			if c.Requests == nil {
				c.Requests = a.store.data.Collections[i].Requests
			}
			a.store.data.Collections[i] = c
			return a.store.save()
		}
	}
	if c.ID == "" {
		c.ID = newID()
	}
	if c.Requests == nil {
		c.Requests = []SavedRequest{}
	}
	a.store.data.Collections = append(a.store.data.Collections, c)
	return a.store.save()
}

func (a *App) DeleteCollection(id string) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for i, c := range a.store.data.Collections {
		if c.ID == id {
			cols := a.store.data.Collections
			a.store.data.Collections = append(cols[:i], cols[i+1:]...)
			return a.store.save()
		}
	}
	return nil
}

// ── Requests ──────────────────────────────────────────────────────────────

func (a *App) SaveRequest(collectionID string, req SavedRequest) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	now := time.Now()
	for ci := range a.store.data.Collections {
		if a.store.data.Collections[ci].ID != collectionID {
			continue
		}
		for ri, r := range a.store.data.Collections[ci].Requests {
			if r.ID == req.ID {
				req.CreatedAt = r.CreatedAt
				req.UpdatedAt = now
				a.store.data.Collections[ci].Requests[ri] = req
				return a.store.save()
			}
		}
		if req.ID == "" {
			req.ID = newID()
		}
		req.CreatedAt = now
		req.UpdatedAt = now
		a.store.data.Collections[ci].Requests = append(
			a.store.data.Collections[ci].Requests, req)
		return a.store.save()
	}
	return nil
}

func (a *App) DeleteRequest(collectionID, reqID string) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	for ci := range a.store.data.Collections {
		if a.store.data.Collections[ci].ID != collectionID {
			continue
		}
		for ri, r := range a.store.data.Collections[ci].Requests {
			if r.ID == reqID {
				reqs := a.store.data.Collections[ci].Requests
				a.store.data.Collections[ci].Requests = append(reqs[:ri], reqs[ri+1:]...)
				return a.store.save()
			}
		}
	}
	return nil
}

// ── History ───────────────────────────────────────────────────────────────

func (a *App) AppendHistory(entry HistoryEntry) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	if entry.ID == "" {
		entry.ID = newID()
	}
	if entry.SentAt.IsZero() {
		entry.SentAt = time.Now()
	}
	h := append([]HistoryEntry{entry}, a.store.data.History...)
	if len(h) > maxHistoryEntries {
		h = h[:maxHistoryEntries]
	}
	a.store.data.History = h
	return a.store.save()
}

func (a *App) ListHistory(limit int) []HistoryEntry {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	h := a.store.data.History
	if limit > 0 && len(h) > limit {
		h = h[:limit]
	}
	if h == nil {
		return []HistoryEntry{}
	}
	return h
}

func (a *App) ClearHistory() error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	a.store.data.History = []HistoryEntry{}
	return a.store.save()
}

// ── Session ───────────────────────────────────────────────────────────────

func (a *App) LoadSession() Session {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	return a.store.data.Session
}

func (a *App) SaveSession(session Session) error {
	a.store.mu.Lock()
	defer a.store.mu.Unlock()
	a.store.data.Session = session
	return a.store.save()
}
