# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **v0.3 — Persistence:** JSON store at `$OS_CONFIG_DIR/hypr/store.json`; data survives restart.
- **Collections:** create named collections, save requests to them (name + target collection dialog),
  load saved requests into any tab with one click, delete collections and individual requests.
- **History:** every sent request is recorded (method, URL, status, duration); shows in sidebar;
  click an entry to restore the URL into the active tab; auto-capped at 200 entries; clear-all action.
- **Session restore:** open tabs (URL, method, headers, params, body, auth, settings) are persisted
  on every meaningful action and restored on the next launch.
- **Sidebar:** collapsible left panel (toggle via `PanelLeftClose`/`PanelLeftOpen` icon) with
  Collections and History sections; each section independently collapsible.
- Per-tab method and URL are now properly isolated — switching tabs restores each tab's method+URL
  (previously method and URL were shared across all tabs).
- 5 new Go tests in `store_test.go` covering collection CRUD, request save/delete,
  history append/clear/cap, and session save/restore (total: 34 tests).

### Changed
- Backend: added `Store` type backed by JSON, 10 new bound methods
  (`ListCollections`, `SaveCollection`, `DeleteCollection`, `SaveRequest`, `DeleteRequest`,
  `AppendHistory`, `ListHistory`, `ClearHistory`, `LoadSession`, `SaveSession`).
- `App` struct gains a `store *Store` field initialized in `startup`; failure is non-fatal
  (app runs without persistence rather than crashing).
- `KVPair`, `StoredAuth`, `TabState`, `SavedRequest`, `Collection`, `HistoryEntry`, `Session`
  Go types added to `store.go`.
- Frontend layout changed from single-column scroll to sidebar + scrollable main area.
- ESLint: `@typescript-eslint/no-empty-function` turned off (fire-and-forget `.catch(() => {})`
  is intentional for non-critical persistence calls).

### Added
- Complete UI redesign on Tailwind CSS + shadcn/ui (Radix), with IBM Plex typography
  and a reusable component kit under `frontend/src/components/ui/`.
- In-app JSON syntax highlighting for response bodies and headers.
- Send loading state and <kbd>Enter</kbd>-to-send in the URL field.
- Go unit tests for the cURL parser and HTTP header helpers (`go test ./...`).
- Continuous Integration workflow (Go vet/test + frontend build).
- Cross-platform release workflow that builds macOS/Windows/Linux binaries on `v*` tags.
- Contributor documentation: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  issue/PR templates, and this changelog.
- `golangci-lint` config (`.golangci.yml`) and a dedicated `lint` job in CI.
- ESLint config for the frontend (`frontend/.eslintrc.cjs`); `npm run lint` added to the
  frontend CI job and the pre-push hook.
- Git hooks (`.githooks/pre-commit`, `.githooks/pre-push`) that enforce formatting and
  mirror CI checks locally; enable with `make hooks`.
- `Makefile` with `hooks`, `setup`, `lint`, `test`, and `build` targets.
- **v0.2 — Response insight (bundle A):** response status code + status text, request
  duration, and body size shown next to the Response heading; status chip is colored by
  HTTP class.
- **v0.2 — Body Pretty/Raw toggle** and **search-in-response** with match count, plus
  **Copy** and **Save** buttons (the latter via a new `SaveTextFile` Go binding using a
  native save dialog).
- **v0.2 — Request power (bundle B):** query-param builder synced two-way with the URL
  field; **Auth** section (None / Bearer / Basic / API key with header-or-query target);
  **Body** selector (None / JSON with a Format button / Form / Raw); per-request
  **Settings** (timeout, follow-redirects, verify TLS); **Copy as cURL** action that
  mirrors cURL import.

### Changed
- Backend: introduced `RequestSpec` and a new `Send(spec) RequestResult` bound method
  that builds a per-request `http.Client` from settings (timeout, redirects, TLS verify).
  `MakeRequest` is retained as a thin wrapper for backward compatibility.
- `RequestResult` now includes `Status`, `StatusText`, `DurationMs`, and `SizeBytes`.
- Non-JSON response bodies are returned verbatim instead of swallowed when JSON pretty-
  printing fails.
- Request editor reorganized into tabbed sections (Headers / Params / Body / Auth /
  Settings) within a single panel.
- cURL import now populates the header rows and request body of the active tab.
- The response view now follows the active request tab.
- The "add header" action moved next to the Request Headers title.

### Deferred (planned for v0.3)
- Multipart / file-upload body type.
- Iframe HTML preview tab for the response body.

### Fixed
- `//go:embed all:frontend/dist` caused a compile failure on clean checkouts because
  `frontend/dist/` was gitignored; fixed by committing a `.gitkeep` and updating
  `.gitignore` to track it.
- Exported request headers now include their values; the `Header.value` field was
  renamed to `Header.Value` so the JSON marshaller picks it up correctly.
- Request headers were serialized to an empty object and not sent; they are now sent correctly.
- Corrected the application window title (`Hpyr` → `Hypr`).

## [0.0.3] - 2023-07-15
### Added
- Dark theme.
- Support for multiple request bodies.

## [0.0.2] - 2023-06-22
### Added
- cURL import support.

## [0.0.1] - 2023-06-21
### Added
- Initial release.

[Unreleased]: https://github.com/dropdevrahul/hypr/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/dropdevrahul/hypr/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/dropdevrahul/hypr/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dropdevrahul/hypr/releases/tag/v0.0.1
