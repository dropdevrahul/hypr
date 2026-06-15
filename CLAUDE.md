# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Hypr is a desktop REST API client (like Postman/Insomnia) built with **Wails v2** (Go backend + React/TypeScript frontend). The Go HTTP client does the actual network calls; the React app is the UI.

## Commands

| Command | What it does |
|---------|-------------|
| `wails dev` | Live dev mode — Vite HMR for the frontend + Go backend. Also serves a browser dev server at `http://localhost:34115` where Go methods are callable from devtools. |
| `wails build` | Production build — embeds `frontend/dist` and outputs a native executable named `hypr` (per `wails.json`). |
| `go mod tidy` | Sync Go dependencies. |
| `wails doctor` | Check the Wails toolchain / native prerequisites. Run this before `wails dev` on a fresh machine. |
| `npm run build` (in `frontend/`) | `tsc && vite build`. Wails runs this automatically during `wails build`; run it manually to typecheck. |

Go has unit tests — run them with `go test ./...` (curl parser and HTTP helpers; see `parse_curl_test.go`, `app_test.go`). The frontend has **no test runner**; its only check is `tsc` via the build. There is **no lint/format/CI** config.

**Go changes are not hot-reloaded** — `wails dev` only HMRs the frontend. Restart `wails dev` after editing Go.

## Architecture

The frontend↔backend boundary is the only non-obvious part. Wails binds the Go `App` struct (`main.go`, `Bind: []interface{}{app}`) and code-generates TypeScript wrappers into `frontend/wailsjs/`. The React app imports those wrappers (`../wailsjs/go/main/App`) and calls Go methods as promises.

**Three bound Go methods** (all on `App`, all callable from React):
- `MakeRequest(url, method, body, headers)` — builds and sends the HTTP request via the shared `http.Client` (50s timeout, created in `startup`), returns a `RequestResult`. JSON response bodies are pretty-indented server-side.
- `RunCurl(curl)` — parses a curl string into a `Request`, then calls `MakeRequest`.
- `Export(req, reqHeaders, reqBodies, result)` — opens a native save dialog and writes the request/response as JSON.

`RequestResult` (`app.go`) is the single response shape returned to the UI: `Body`, `HeadersStr` (newline-joined response headers), `Error`, plus echoed-back request fields. Errors are returned **inside** `RequestResult.Error`, not as a thrown/rejected promise — the UI checks `result.Error`.

**Curl parsing** (`parse_curl.go`): a hand-written state machine over `go-shellwords` tokens. Supports `-X/--request`, `-H/--header`, `-d/--data[-ascii|-raw]`, `-A/--user-agent`, `-u/--user` (→ Basic auth), `-I/--head`, `-b/--cookie`. Does **not** handle `--data-binary`, `--data-urlencode`, or multipart. Input must start with `curl `.

**Core premise:** Hypr's reason to exist vs. Postman/Insomnia is testing **multiple payloads against a single request URL** on one screen. This is encoded in a **two-level tab model** — don't collapse it.

**Frontend state** (`frontend/src/App.tsx`, types in `src/lib/model.ts`): a single nested structure, **not** parallel arrays.
- Top level: `requests: RequestTab[]` + `activeRequest` index. Each `RequestTab` owns the **shared** `method`, `url`, `auth`, `settings`, plus `payloads: Payload[]` and `activePayload`.
- Inner level: each `Payload` owns its own `headers`, `params`, `bodyType`/`jsonBody`/`rawBody`/`formRows`, and `response`. All payloads of a request share that request's url/method/auth/settings.
- All edits go through the immutable updaters `updateRequest(requests, ri, patch)` and `updatePayload(requests, ri, pi, patch)` in `model.ts`. Per-payload KV-row edits use `setRow`/`dropRow`/`appendRow` from `src/lib/kv.ts`.
- **URL ↔ params is one-way at send time only**: the URL bar is the shared base URL; the Params tab edits the active payload; `buildSpec()` merges `req.url` + payload params + auth query when sending. Editing one does not rewrite the other.
- `response` is **never persisted**; `toStoredPayload()` strips it before saving. Session/collections persist via the Go store (`store.go`): `Session.openRequests`/`activeRequest`, `SavedRequest` carries all payloads.
- Headers in the UI are `{Key, Value}` objects (`src/lib/kv.ts`); converted to a plain `Record<string, string>` before being passed to Go.

**UI stack**: the frontend uses **Tailwind CSS + shadcn/ui** (Radix primitives in `frontend/src/components/ui/`, `cn` helper in `src/lib/utils.ts`, design tokens as CSS variables in `src/index.css`, theme in `tailwind.config.js`). Icons are `lucide-react`. JSON responses are highlighted by the in-house `src/components/json-view.tsx` (no `react-json-pretty`). The `@/*` import alias maps to `src/`.

## Gotchas

- **Go module is named `changeme`** (`go.mod` placeholder, never renamed). Build works because Wails manages it; rename before publishing/importing.
- **`frontend/hypr/` is a stale leftover** — a complete nested Wails scaffold (its own `go.mod`, `main.go`, `build/`, `frontend/`). It is **not** part of the real app (the real entry point is the root `main.go`). Don't edit files there expecting them to take effect.
- **`frontend/wailsjs/` is generated** — `App.d.ts`/`App.js`/`models.ts` are regenerated by Wails from the Go structs. Don't hand-edit; change the Go types and rebuild.
