# Hypr — Feature Spec (v0.2 → v0.4)

Status: **Draft** · Owner: @dropdevrahul · Last updated: 2026-06-13

This spec covers the next phase of standard REST-client features. It's sequenced into three
milestones so each ships independently and the foundational pieces land before what depends on them.

| Milestone | Theme | Bundles |
|-----------|-------|---------|
| **v0.2** | See more, send more | A (Response insight) + B (Request power) |
| **v0.3** | Don't lose work | C (Persistence) |
| **v0.4** | Daily driver | D (Environments & variables) |

---

## Foundational decisions

These shape multiple features; deciding them up front avoids rework.

1. **Introduce a `RequestSpec` struct and a single `Send(spec) RequestResult` Go method.**
   Today `MakeRequest(url, method, body, headers)` can't express body types, per-request settings,
   or files. A structured spec is the clean seam for B/C/D. `RunCurl` stays (it can build a `RequestSpec`).
2. **Variable & auth resolution happens in the frontend**, just before the call — the frontend already
   assembles the final request. The Go layer stays a "dumb" executor. (Revisit if we ever want
   headless/CLI execution.)
3. **Persistence = a JSON document store in the OS config dir** (`os.UserConfigDir()/hypr/`), behind a
   Go `Store` interface. Rationale: zero CGO, debuggable, ample for expected scale. SQLite is a
   drop-in replacement later if collections grow large. (Open question — see below.)
4. **Secrets (auth tokens, env vars) are stored in plaintext on disk initially.** OS-keychain
   integration is a later hardening task, tracked separately.

### Proposed `RequestSpec` (Go)

```go
type RequestSpec struct {
    Method   string            `json:"method"`
    URL      string            `json:"url"`            // already variable-resolved by the UI
    Headers  map[string]string `json:"headers"`
    Body     BodySpec          `json:"body"`
    Settings RequestSettings   `json:"settings"`
}

type BodySpec struct {
    Type   string      `json:"type"`   // "none" | "raw" | "json" | "form" | "multipart"
    Raw    string      `json:"raw"`    // raw/json text
    Fields []FormField `json:"fields"` // form / multipart
}

type FormField struct {
    Key      string `json:"key"`
    Value    string `json:"value"`
    IsFile   bool   `json:"isFile"`
    FilePath string `json:"filePath"` // chosen via native OpenFileDialog
}

type RequestSettings struct {
    TimeoutMs       int  `json:"timeoutMs"`       // 0 = default
    FollowRedirects bool `json:"followRedirects"`
    VerifyTLS       bool `json:"verifyTLS"`
}
```

`MakeRequest` builds a per-request `http.Client` from `Settings` (redirect policy via `CheckRedirect`,
`InsecureSkipVerify` via the transport's `TLSClientConfig`) instead of the current fixed 50s shared client.

---

## A — Response insight  *(v0.2, low effort)*

**Goal:** answer "what came back, how fast, how big" — the most glaring current gap.

### Backend
Extend `RequestResult`:

```go
Status      int    `json:"Status"`      // 200
StatusText  string `json:"StatusText"`  // "200 OK"
DurationMs  int64  `json:"DurationMs"`  // wall time around client.Do
SizeBytes   int    `json:"SizeBytes"`   // len(body)
```

Capture `resp.StatusCode` / `resp.Status`, time the round-trip, and `len(body)`.

### Frontend
- **Status bar** next to the Response heading: status chip colored by class (2xx lime/green,
  3xx blue, 4xx amber, 5xx red), `· 134 ms · 2.4 KB`.
- **Body view modes:** Pretty (current `JsonView`) / Raw (plain monospace) / Preview (sandboxed
  `<iframe>` when `Content-Type` is `text/html`; Preview is a stretch goal).
- **Search-in-response:** filter/highlight matches in the body view.
- **Copy** and **Save body to file** buttons (Save via a Go `SaveFile(name, contents)` method using
  `runtime.SaveFileDialog`).

**Acceptance:** sending any request shows status + time + size; body toggles Pretty/Raw; copy works.

---

## B — Request power  *(v0.2, medium effort)*

**Goal:** stop hand-crafting URLs, headers, and bodies.

### B1 — Query-param builder
- New **Params** tab with key/value/enabled rows, two-way synced with the URL field
  (`URL.searchParams` parse on focus; rebuild URL on edit). Pure frontend.

### B2 — Auth tab
- Dropdown: **None / Bearer / Basic / API Key**.
  - Bearer → `Authorization: Bearer <token>`
  - Basic → `Authorization: Basic base64(user:pass)` (`btoa` in TS)
  - API Key → name + value, added to **header** or **query** (user's choice)
- Computed at send time and merged into headers/params. Backend unchanged.

### B3 — Body types
- Selector: **None / JSON / Form (x-www-form-urlencoded) / Multipart / Raw**.
  - JSON → textarea + auto `Content-Type: application/json` + Format button.
  - Form → key/value rows → URL-encoded; sets content-type.
  - Multipart → key/value + **file** rows. Files are picked via Wails `OpenFileDialog`; the Go
    layer reads them and assembles the multipart body. **This is the piece that requires the
    `RequestSpec`/`Send` refactor.**

### B4 — Request settings
- Per-request **timeout**, **follow-redirects** toggle, **verify-TLS** toggle → flow through
  `RequestSettings` into a per-request client.

### B5 — Export as cURL
- Build a `curl` command string from the current request (pure frontend) — the mirror of cURL import.
  Copy-to-clipboard.

**Acceptance:** params/auth/body-type/settings all affect the wire request; multipart upload of a
chosen file succeeds; "Export as cURL" round-trips back through cURL import.

---

## C — Persistence  *(v0.3, higher effort — introduces a storage layer + sidebar)*

**Goal:** nothing is lost on close; requests are reusable.

### Storage (Go)
`Store` interface backed by JSON at `os.UserConfigDir()/hypr/store.json`. Methods (bound to UI):

```
ListCollections() / SaveCollection(c) / DeleteCollection(id)
SaveRequest(collectionId, req) / DeleteRequest(id)
AppendHistory(entry) / ListHistory(limit) / ClearHistory()
LoadSession() / SaveSession(session)
```

### Data model

```ts
SavedRequest { id, name, method, url, headers, params, auth, body, settings, createdAt, updatedAt }
Collection   { id, name, requests: SavedRequest[] }       // folders are a later addition
HistoryEntry { id, request: RequestSnapshot, status, durationMs, sentAt }
Session      { openTabs: TabState[], activeTab: number }
```

### Frontend
- **Left sidebar** (new layout): **Collections** tree + **History** list, collapsible.
- **Save** action on a request (name + target collection); click a saved request to load it into a tab.
- **History** auto-appends on every send; click to restore; clear-all.
- **Session restore:** persist open tabs on change; reload them on launch.

**Acceptance:** quit & relaunch restores tabs; saved requests reload exactly; history records sends.

> Largest UI change in the roadmap (introduces the sidebar). Consider doing the layout shell first,
> then collections, then history, then session restore as sub-PRs.

---

## D — Environments & variables  *(v0.4, builds on C)*

**Goal:** the feature that makes Hypr a daily driver.

- **Variable syntax:** `{{name}}`, resolved at send time across URL, params, headers, body, and auth.
- **Environments:** `Environment { id, name, vars: Record<string,string> }`, persisted via the C store.
  Active-environment selector in the top bar; a special **Globals** environment always applies.
- **Resolution:** one frontend `substitute(text, vars)` pass over the assembled request; unresolved
  `{{x}}` surfaces a non-blocking warning.
- **Dynamic vars (stretch):** `{{$timestamp}}`, `{{$uuid}}`, `{{$randomInt}}`.

**Acceptance:** switching environment changes the resolved request; `{{base_url}}/users` hits the
right host per environment; missing variables are flagged.

---

## Out of scope (for now)
- Pre-request / test scripting (Postman-style sandboxes).
- Importing Postman / Insomnia / OpenAPI collections.
- Cookie jar management, proxy config, GraphQL/gRPC/WebSocket.
- Team sync / cloud accounts.
- Light theme (tracked separately as a small polish task).

## Open questions
1. **Store backend:** JSON file (proposed) vs SQLite from the start? JSON is simpler; SQLite scales
   and enables search. Default: JSON, revisit if a single collection exceeds ~hundreds of requests.
2. **Multipart in v0.2 or defer to v0.3?** It's the one B item needing native file I/O + the refactor.
   If we want v0.2 lean, ship the `RequestSpec` refactor + settings + JSON/form bodies, and defer
   file upload one milestone.
3. **Secrets at rest:** plaintext now, OS keychain later — acceptable for v0.4?
4. **Sidebar vs. command-palette** as the primary navigation for collections/history?

## Rollout
Each milestone is a set of small PRs, a `CHANGELOG.md` "Unreleased" entry per PR, and a tagged
release (`v0.2.0`, …) per the [release process](../CONTRIBUTING.md#releasing).
