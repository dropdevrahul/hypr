package main

import (
	"testing"
)

func TestParse_RejectsNonCurl(t *testing.T) {
	cases := []string{
		"",
		"wget http://example.com",
		"http://example.com",
		"curl", // missing trailing space
		" curl http://example.com",
	}
	for _, in := range cases {
		if _, ok := Parse(in); ok {
			t.Errorf("Parse(%q) = ok, want not ok", in)
		}
	}
}

func TestParse_SimpleGet(t *testing.T) {
	r, ok := Parse("curl https://example.com")
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "GET" {
		t.Errorf("Method = %q, want GET", r.Method)
	}
	if r.Url != "https://example.com" {
		t.Errorf("Url = %q, want https://example.com", r.Url)
	}
	if r.Body != "" {
		t.Errorf("Body = %q, want empty", r.Body)
	}
	if len(r.Header) != 0 {
		t.Errorf("Header = %v, want empty", r.Header)
	}
}

func TestParse_Header(t *testing.T) {
	r, ok := Parse(`curl https://example.com -H "Accept: application/json"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if got := r.Header["Accept"]; got != "application/json" {
		t.Errorf("Header[Accept] = %q, want application/json", got)
	}
}

func TestParse_PostWithData(t *testing.T) {
	r, ok := Parse(`curl -X POST https://example.com -d "a=1"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "POST" {
		t.Errorf("Method = %q, want POST", r.Method)
	}
	if r.Body != "a=1" {
		t.Errorf("Body = %q, want a=1", r.Body)
	}
	if got := r.Header["Content-Type"]; got != "application/x-www-form-urlencoded" {
		t.Errorf("Content-Type = %q, want application/x-www-form-urlencoded", got)
	}
}

func TestParse_DataPromotesGetToPost(t *testing.T) {
	r, ok := Parse(`curl https://example.com -d "a=1"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "POST" {
		t.Errorf("Method = %q, want POST (promoted from GET)", r.Method)
	}
}

func TestParse_MultipleDataJoined(t *testing.T) {
	r, ok := Parse(`curl https://example.com -d "a=1" -d "b=2"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Body != "a=1&b=2" {
		t.Errorf("Body = %q, want a=1&b=2", r.Body)
	}
}

func TestParse_BasicAuth(t *testing.T) {
	r, ok := Parse(`curl https://example.com -u user:pass`)
	if !ok {
		t.Fatal("Parse failed")
	}
	// base64("user:pass") == "dXNlcjpwYXNz"
	want := "Basic dXNlcjpwYXNz"
	if got := r.Header["Authorization"]; got != want {
		t.Errorf("Authorization = %q, want %q", got, want)
	}
}

func TestParse_UserAgent(t *testing.T) {
	r, ok := Parse(`curl https://example.com -A "MyAgent/1.0"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if got := r.Header["User-Agent"]; got != "MyAgent/1.0" {
		t.Errorf("User-Agent = %q, want MyAgent/1.0", got)
	}
}

func TestParse_Head(t *testing.T) {
	r, ok := Parse(`curl -I https://example.com`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "HEAD" {
		t.Errorf("Method = %q, want HEAD", r.Method)
	}
}

func TestParse_Cookie(t *testing.T) {
	r, ok := Parse(`curl https://example.com -b "session=abc"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if got := r.Header["Cookie"]; got != "session=abc" {
		t.Errorf("Cookie = %q, want session=abc", got)
	}
}

func TestParse_CombinedMethodFlag(t *testing.T) {
	// "-XPOST" should be rewritten to "-X" "POST"
	r, ok := Parse(`curl -XPOST https://example.com`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "POST" {
		t.Errorf("Method = %q, want POST", r.Method)
	}
}

func TestParse_JSONBodyCompacted(t *testing.T) {
	r, ok := Parse(`curl -X POST https://example.com -H "Content-Type: application/json" -d '{"name": "test", "n": 1}'`)
	if !ok {
		t.Fatal("Parse failed")
	}
	// JSON bodies are re-encoded compactly with map keys sorted: "n" before "name".
	want := `{"n":1,"name":"test"}`
	if r.Body != want {
		t.Errorf("Body = %q, want %q", r.Body, want)
	}
}

func TestParse_LongFlagNames(t *testing.T) {
	r, ok := Parse(`curl --request PUT https://example.com --header "X-Token: abc" --data "payload"`)
	if !ok {
		t.Fatal("Parse failed")
	}
	if r.Method != "PUT" {
		t.Errorf("Method = %q, want PUT", r.Method)
	}
	if got := r.Header["X-Token"]; got != "abc" {
		t.Errorf("Header[X-Token] = %q, want abc", got)
	}
	if r.Body != "payload" {
		t.Errorf("Body = %q, want payload", r.Body)
	}
}

func TestHeaders_ToString(t *testing.T) {
	h := Headers{"Content-Type": "application/json"}
	if got := h.ToString(); got != "Content-Type: application/json" {
		t.Errorf("ToString() = %q, want %q", got, "Content-Type: application/json")
	}
}

func TestRequest_ToJson(t *testing.T) {
	r := &Request{Method: "GET", Url: "https://example.com", Header: Headers{}, Body: ""}
	out := r.ToJson(false)
	if out == "" {
		t.Fatal("ToJson returned empty string")
	}
	for _, want := range []string{`"method":"GET"`, `"url":"https://example.com"`} {
		if !contains(out, want) {
			t.Errorf("ToJson() = %q, missing %q", out, want)
		}
	}
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
