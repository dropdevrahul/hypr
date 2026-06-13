package main

import (
	"net/http"
	"testing"
)

func TestHeadersToStr_SingleValue(t *testing.T) {
	h := http.Header{"Content-Type": []string{"application/json"}}
	if got := HeadersToStr(&h); got != "Content-Type: application/json" {
		t.Errorf("HeadersToStr() = %q, want %q", got, "Content-Type: application/json")
	}
}

func TestHeadersToStr_MultipleValuesJoined(t *testing.T) {
	h := http.Header{"Set-Cookie": []string{"a=1", "b=2"}}
	if got := HeadersToStr(&h); got != "Set-Cookie: a=1; b=2" {
		t.Errorf("HeadersToStr() = %q, want %q", got, "Set-Cookie: a=1; b=2")
	}
}

func TestHeadersToStr_Empty(t *testing.T) {
	h := http.Header{}
	if got := HeadersToStr(&h); got != "" {
		t.Errorf("HeadersToStr() = %q, want empty", got)
	}
}
