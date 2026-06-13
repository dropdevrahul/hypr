package main

import (
	"os"
	"testing"
	"time"
)

func tempStore(t *testing.T) (*App, func()) {
	t.Helper()
	dir := t.TempDir()
	s := &Store{path: dir + "/store.json"}
	app := &App{store: s}
	return app, func() { os.Remove(s.path) }
}

func TestStore_CollectionCRUD(t *testing.T) {
	app, cleanup := tempStore(t)
	defer cleanup()

	if err := app.SaveCollection(Collection{Name: "My API"}); err != nil {
		t.Fatalf("SaveCollection: %v", err)
	}

	cols := app.ListCollections()
	if len(cols) != 1 || cols[0].Name != "My API" {
		t.Fatalf("expected 1 collection named 'My API', got %v", cols)
	}
	id := cols[0].ID
	if id == "" {
		t.Fatal("expected non-empty ID to be assigned")
	}

	// Rename via upsert
	if err := app.SaveCollection(Collection{ID: id, Name: "Renamed"}); err != nil {
		t.Fatalf("rename SaveCollection: %v", err)
	}
	cols = app.ListCollections()
	if cols[0].Name != "Renamed" {
		t.Fatalf("expected 'Renamed', got %q", cols[0].Name)
	}

	// Delete
	if err := app.DeleteCollection(id); err != nil {
		t.Fatalf("DeleteCollection: %v", err)
	}
	if len(app.ListCollections()) != 0 {
		t.Fatal("expected 0 collections after delete")
	}
}

func TestStore_SaveAndDeleteRequest(t *testing.T) {
	app, cleanup := tempStore(t)
	defer cleanup()

	_ = app.SaveCollection(Collection{ID: "col1", Name: "Test"})

	req := SavedRequest{Name: "Get users", Method: "GET", URL: "https://example.com/users"}
	if err := app.SaveRequest("col1", req); err != nil {
		t.Fatalf("SaveRequest: %v", err)
	}

	cols := app.ListCollections()
	if len(cols[0].Requests) != 1 {
		t.Fatalf("expected 1 request, got %d", len(cols[0].Requests))
	}
	reqID := cols[0].Requests[0].ID
	if reqID == "" {
		t.Fatal("expected request ID to be assigned")
	}

	if err := app.DeleteRequest("col1", reqID); err != nil {
		t.Fatalf("DeleteRequest: %v", err)
	}
	cols = app.ListCollections()
	if len(cols[0].Requests) != 0 {
		t.Fatal("expected 0 requests after delete")
	}
}

func TestStore_History(t *testing.T) {
	app, cleanup := tempStore(t)
	defer cleanup()

	for i := 0; i < 3; i++ {
		_ = app.AppendHistory(HistoryEntry{Method: "GET", URL: "https://example.com", SentAt: time.Now()})
	}

	h := app.ListHistory(2)
	if len(h) != 2 {
		t.Fatalf("expected 2 entries with limit, got %d", len(h))
	}

	_ = app.ClearHistory()
	if len(app.ListHistory(0)) != 0 {
		t.Fatal("expected 0 entries after clear")
	}
}

func TestStore_Session(t *testing.T) {
	app, cleanup := tempStore(t)
	defer cleanup()

	session := Session{
		OpenTabs:  []TabState{{Method: "POST", URL: "https://api.example.com"}},
		ActiveTab: 0,
	}
	if err := app.SaveSession(session); err != nil {
		t.Fatalf("SaveSession: %v", err)
	}

	got := app.LoadSession()
	if len(got.OpenTabs) != 1 || got.OpenTabs[0].Method != "POST" {
		t.Fatalf("unexpected session: %+v", got)
	}
}

func TestStore_HistoryMaxCap(t *testing.T) {
	app, cleanup := tempStore(t)
	defer cleanup()

	for i := 0; i < maxHistoryEntries+10; i++ {
		_ = app.AppendHistory(HistoryEntry{Method: "GET", URL: "https://example.com"})
	}

	h := app.ListHistory(0)
	if len(h) != maxHistoryEntries {
		t.Fatalf("expected history capped at %d, got %d", maxHistoryEntries, len(h))
	}
}
