package main

import (
	"bytes"
	"context"
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
		MaxIdleConns:    2,
		IdleConnTimeout: 5 * time.Second,
	}
	a.client = &http.Client{
		Timeout:   5 * time.Second,
		Transport: tr,
	}
	a.ctx = ctx
}

func MakeRequest(c *http.Client,
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

type RequestResult struct {
	Body       string
	HeadersStr string
	Error      string
}

// Greet returns a greeting for the given name
func (a *App) MakeRequest(urlIn string, method string) RequestResult {
	result := RequestResult{}
	r, err := http.NewRequest(method, urlIn, nil)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	res, httpResp, err := MakeRequest(a.client, r)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	headersArr := []string{}
	for k, v := range httpResp.Header {
		vals := strings.Join(v, "; ")
		headersArr = append(headersArr, k+": "+vals)
	}
	result.HeadersStr = strings.Join(headersArr, "\n")

	b := bytes.NewBuffer(make([]byte, 0, len(res)))
	err = json.Indent(b, res, "\n", "  ")
	if err != nil {
		return RequestResult{
			Body:  string(res),
			Error: err.Error(),
		}
	}

	texts := string(b.Bytes())
	result.Body = texts
	return result
}
