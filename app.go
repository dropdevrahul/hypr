package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx    context.Context
	client *http.Client
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	tr := &http.Transport{
		MaxIdleConns:    10,
		IdleConnTimeout: 50 * time.Second,
	}
	a.client = &http.Client{
		Timeout:   50 * time.Second,
		Transport: tr,
	}
	a.ctx = ctx
}

func doRequest(c *http.Client,
	r *http.Request) ([]byte, *http.Response, error) {
	resp, err := c.Do(r)
	if err != nil {
		return nil, resp, err
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp, err
	}

	return body, resp, nil
}

func HeadersToStr(h *http.Header) string {
	headersArr := []string{}
	for k, v := range *h {
		vals := strings.Join(v, "; ")
		headersArr = append(headersArr, k+": "+vals)
	}

	result := strings.Join(headersArr, "\n")
	return result
}

// BodySpec describes the request body type and content.
type BodySpec struct {
	Type string `json:"type"` // "none" | "json" | "form" | "raw"
	Raw  string `json:"raw"`  // raw/json text or pre-encoded form body
}

// RequestSettings contains per-request client settings.
type RequestSettings struct {
	TimeoutMs       int  `json:"timeoutMs"`       // 0 = use default (50s)
	FollowRedirects bool `json:"followRedirects"` // true = follow
	VerifyTLS       bool `json:"verifyTLS"`       // true = verify
}

// RequestSpec is the structured request used by Send().
type RequestSpec struct {
	Method   string            `json:"method"`
	URL      string            `json:"url"`
	Headers  map[string]string `json:"headers"`
	Body     BodySpec          `json:"body"`
	Settings RequestSettings   `json:"settings"`
}

// RequestResult is the response shape returned to the UI.
type RequestResult struct {
	Method      string `json:"Method"`
	URL         string `json:"URL"`
	ReqHeaders  string `json:"ReqHeaders"`
	RequestBody string `json:"RequestBody"`
	Body        string `json:"Body"`
	HeadersStr  string `json:"HeadersStr"`
	Error       string `json:"Error"`
	Status      int    `json:"Status"`
	StatusText  string `json:"StatusText"`
	DurationMs  int64  `json:"DurationMs"`
	SizeBytes   int    `json:"SizeBytes"`
}

// buildClient creates an http.Client configured from RequestSettings.
func buildClient(s RequestSettings) *http.Client {
	timeout := 50 * time.Second
	if s.TimeoutMs > 0 {
		timeout = time.Duration(s.TimeoutMs) * time.Millisecond
	}

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: !s.VerifyTLS}, //nolint:gosec
	}

	client := &http.Client{
		Timeout:   timeout,
		Transport: tr,
	}

	if !s.FollowRedirects {
		client.CheckRedirect = func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		}
	}

	return client
}

// Send builds a per-request http.Client from Settings and executes the request.
func (a *App) Send(spec RequestSpec) RequestResult {
	result := RequestResult{
		URL:    spec.URL,
		Method: spec.Method,
	}

	var bodyReader io.Reader
	if spec.Body.Type != "none" && spec.Body.Raw != "" {
		bodyReader = strings.NewReader(spec.Body.Raw)
		result.RequestBody = spec.Body.Raw
	}

	r, err := http.NewRequest(spec.Method, spec.URL, bodyReader)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	for key, value := range spec.Headers {
		r.Header.Add(key, value)
	}

	result.ReqHeaders = HeadersToStr(&r.Header)

	client := buildClient(spec.Settings)

	start := time.Now()
	res, httpResp, err := doRequest(client, r)
	result.DurationMs = time.Since(start).Milliseconds()

	if err != nil {
		result.Error = err.Error()
		// still capture status if response was partially received
		if httpResp != nil {
			result.Status = httpResp.StatusCode
			result.StatusText = httpResp.Status
		}
		return result
	}

	result.Status = httpResp.StatusCode
	result.StatusText = httpResp.Status
	result.HeadersStr = HeadersToStr(&httpResp.Header)
	result.SizeBytes = len(res)

	// Pretty-print JSON bodies; on failure, return raw body without error
	b := bytes.NewBuffer(make([]byte, 0, len(res)))
	if jsonErr := json.Indent(b, res, "", "  "); jsonErr == nil {
		result.Body = b.String()
	} else {
		result.Body = string(res)
	}

	return result
}

// SaveTextFile opens a native save dialog and writes text content to the chosen file.
func (a *App) SaveTextFile(filename, contents string) error {
	return saveTextFile(a.ctx, filename, contents)
}

func (a *App) RunCurl(curl string) RequestResult {
	res := RequestResult{}
	r, ok := Parse(curl)
	if !ok {
		res.Error = "Unable to parse curl"
		return res
	}

	res = a.MakeRequest(r.Url, r.Method, r.Body, r.Header)
	res.ReqHeaders = r.Header.ToString()
	res.Method = r.Method
	res.URL = r.Url
	res.RequestBody = r.Body
	return res
}

// Header is a single key/value header pair (kept for Export compatibility).
type Header struct {
	Key   string
	Value string
}

// MakeRequest is kept for backward compatibility; it delegates to Send.
func (a *App) MakeRequest(
	urlIn string,
	method string,
	body string,
	headers Headers,
) RequestResult {
	hdrs := make(map[string]string, len(headers))
	for k, v := range headers {
		hdrs[k] = v
	}

	spec := RequestSpec{
		Method:  method,
		URL:     urlIn,
		Headers: hdrs,
		Body: BodySpec{
			Type: "raw",
			Raw:  body,
		},
		Settings: RequestSettings{
			FollowRedirects: true,
			VerifyTLS:       true,
		},
	}

	result := a.Send(spec)
	// preserve old fields that Send populates differently
	result.Method = method
	result.URL = urlIn
	result.RequestBody = body
	return result
}
