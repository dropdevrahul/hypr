package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// newApp returns an App with a minimal startup (no Wails context needed for Send).
func newTestApp() *App {
	return &App{}
}

func defaultSettings() RequestSettings {
	return RequestSettings{
		FollowRedirects: true,
		VerifyTLS:       true,
	}
}

// TestSend_StatusAndStatusText verifies that Status and StatusText round-trip correctly.
func TestSend_StatusAndStatusText(t *testing.T) {
	tests := []struct {
		code int
		text string
	}{
		{200, "200 OK"},
		{201, "201 Created"},
		{404, "404 Not Found"},
		{500, "500 Internal Server Error"},
	}

	app := newTestApp()
	for _, tt := range tests {
		t.Run(fmt.Sprintf("%d", tt.code), func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tt.code)
			}))
			defer srv.Close()

			result := app.Send(RequestSpec{
				Method:   "GET",
				URL:      srv.URL,
				Settings: defaultSettings(),
				Body:     BodySpec{Type: "none"},
			})

			if result.Error != "" {
				t.Fatalf("unexpected error: %s", result.Error)
			}
			if result.Status != tt.code {
				t.Errorf("Status: got %d, want %d", result.Status, tt.code)
			}
			if !strings.HasPrefix(result.StatusText, fmt.Sprintf("%d", tt.code)) {
				t.Errorf("StatusText: got %q, want prefix %d", result.StatusText, tt.code)
			}
		})
	}
}

// TestSend_DurationAndSize verifies DurationMs > 0 and SizeBytes matches the body.
func TestSend_DurationAndSize(t *testing.T) {
	body := `{"hello":"world"}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, body)
	}))
	defer srv.Close()

	app := newTestApp()
	result := app.Send(RequestSpec{
		Method:   "GET",
		URL:      srv.URL,
		Settings: defaultSettings(),
		Body:     BodySpec{Type: "none"},
	})

	if result.Error != "" {
		t.Fatalf("unexpected error: %s", result.Error)
	}
	if result.DurationMs < 0 {
		t.Errorf("DurationMs should be >= 0, got %d", result.DurationMs)
	}
	if result.SizeBytes != len(body) {
		t.Errorf("SizeBytes: got %d, want %d", result.SizeBytes, len(body))
	}
}

// TestSend_Timeout verifies that a short timeout is honored.
func TestSend_Timeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(500 * time.Millisecond)
		fmt.Fprint(w, "late")
	}))
	defer srv.Close()

	app := newTestApp()
	result := app.Send(RequestSpec{
		Method: "GET",
		URL:    srv.URL,
		Settings: RequestSettings{
			TimeoutMs:       50, // 50 ms — server sleeps 500 ms
			FollowRedirects: true,
			VerifyTLS:       true,
		},
		Body: BodySpec{Type: "none"},
	})

	if result.Error == "" {
		t.Error("expected a timeout error, got none")
	}
}

// TestSend_VerifyTLSFalse verifies that VerifyTLS=false works against a self-signed server.
func TestSend_VerifyTLSFalse(t *testing.T) {
	srv := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		fmt.Fprint(w, "secure")
	}))
	defer srv.Close()

	app := newTestApp()

	// With VerifyTLS=true the call should fail (self-signed cert)
	resultBad := app.Send(RequestSpec{
		Method: "GET",
		URL:    srv.URL,
		Settings: RequestSettings{
			FollowRedirects: true,
			VerifyTLS:       true,
		},
		Body: BodySpec{Type: "none"},
	})
	if resultBad.Error == "" {
		t.Error("expected TLS error with VerifyTLS=true against self-signed cert")
	}

	// With VerifyTLS=false the call should succeed
	resultOk := app.Send(RequestSpec{
		Method: "GET",
		URL:    srv.URL,
		Settings: RequestSettings{
			FollowRedirects: true,
			VerifyTLS:       false,
		},
		Body: BodySpec{Type: "none"},
	})
	if resultOk.Error != "" {
		t.Errorf("unexpected error with VerifyTLS=false: %s", resultOk.Error)
	}
	if resultOk.Body != "secure" {
		t.Errorf("body: got %q, want %q", resultOk.Body, "secure")
	}
}

// TestSend_FollowRedirectsFalse verifies that disabling redirects stops at the first response.
func TestSend_FollowRedirectsFalse(t *testing.T) {
	var finalURL string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/start" {
			http.Redirect(w, r, "/end", http.StatusFound)
			return
		}
		finalURL = r.URL.Path
		fmt.Fprint(w, "done")
	}))
	defer srv.Close()

	app := newTestApp()

	// With FollowRedirects=false we expect 302
	result := app.Send(RequestSpec{
		Method: "GET",
		URL:    srv.URL + "/start",
		Settings: RequestSettings{
			FollowRedirects: false,
			VerifyTLS:       true,
		},
		Body: BodySpec{Type: "none"},
	})

	if result.Error != "" {
		t.Fatalf("unexpected error: %s", result.Error)
	}
	if result.Status != http.StatusFound {
		t.Errorf("Status: got %d, want %d", result.Status, http.StatusFound)
	}
	if finalURL == "/end" {
		t.Error("redirect was followed despite FollowRedirects=false")
	}

	// With FollowRedirects=true we expect 200
	result2 := app.Send(RequestSpec{
		Method: "GET",
		URL:    srv.URL + "/start",
		Settings: RequestSettings{
			FollowRedirects: true,
			VerifyTLS:       true,
		},
		Body: BodySpec{Type: "none"},
	})
	if result2.Status != http.StatusOK {
		t.Errorf("Status (follow): got %d, want %d", result2.Status, http.StatusOK)
	}
}

// TestSend_JSONPrettyPrint verifies that valid JSON is pretty-printed and non-JSON is returned verbatim.
func TestSend_JSONPrettyPrint(t *testing.T) {
	jsonBody := `{"a":1,"b":"two"}`
	plainBody := "not json at all"

	tests := []struct {
		name        string
		serverBody  string
		contentType string
		wantJSON    bool
	}{
		{"json response", jsonBody, "application/json", true},
		{"plain text response", plainBody, "text/plain", false},
	}

	app := newTestApp()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
				w.Header().Set("Content-Type", tt.contentType)
				fmt.Fprint(w, tt.serverBody)
			}))
			defer srv.Close()

			result := app.Send(RequestSpec{
				Method:   "GET",
				URL:      srv.URL,
				Settings: defaultSettings(),
				Body:     BodySpec{Type: "none"},
			})

			if result.Error != "" {
				t.Fatalf("unexpected error: %s", result.Error)
			}

			if tt.wantJSON {
				// Pretty-printed JSON contains newlines
				if !strings.Contains(result.Body, "\n") {
					t.Errorf("expected pretty-printed JSON, got: %s", result.Body)
				}
			} else {
				// Non-JSON body returned verbatim
				if result.Body != tt.serverBody {
					t.Errorf("body: got %q, want %q", result.Body, tt.serverBody)
				}
				if result.Error != "" {
					t.Errorf("Error should be empty for non-JSON body, got: %s", result.Error)
				}
			}
		})
	}
}

// TestMakeRequest_BackwardCompatibility verifies the legacy wrapper still works.
func TestMakeRequest_BackwardCompatibility(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(200)
		fmt.Fprint(w, `{"ok":true}`)
	}))
	defer srv.Close()

	app := newTestApp()
	result := app.MakeRequest(srv.URL, "GET", "", Headers{})

	if result.Error != "" {
		t.Fatalf("unexpected error: %s", result.Error)
	}
	if result.Status != 200 {
		t.Errorf("Status: got %d, want 200", result.Status)
	}
	if result.URL != srv.URL {
		t.Errorf("URL: got %s, want %s", result.URL, srv.URL)
	}
}
