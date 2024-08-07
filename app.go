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
		MaxIdleConns:    10,
		IdleConnTimeout: 50 * time.Second,
	}
	a.client = &http.Client{
		Timeout:   50 * time.Second,
		Transport: tr,
	}
	a.ctx = ctx
}

func makeRequest(c *http.Client,
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

type RequestResult struct {
	Method      string `json:"Method"`
	URL         string `json:"URL"`
	ReqHeaders  string `json:"ReqHeaders"`
	RequestBody string `json:"RequestBody"`
	Body        string `json:"Body"`
	HeadersStr  string `json:"HeadersStr"`
	Error       string `json:"Error"`
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

type Header struct {
	Key   string
	value string
}

// Greet returns a greeting for the given name
func (a *App) MakeRequest(
	urlIn string,
	method string,
	body string,
	headers Headers,
) RequestResult {
	result := RequestResult{
		URL:         urlIn,
		Method:      method,
		RequestBody: body,
	}
	rbody := bytes.NewBuffer([]byte(body))
	r, err := http.NewRequest(method, urlIn, rbody)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	for key, value := range headers {
		r.Header.Add(key, value)
	}

	res, httpResp, err := makeRequest(a.client, r)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	result.HeadersStr = HeadersToStr(&httpResp.Header)
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
