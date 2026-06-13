# AGENTS.md — Hypr Repository Quick Reference

## What is this?
Hypr is a **desktop REST API client** (like Postman/Insomnia) built with **Wails v2.5.1** (Go backend + React/TypeScript frontend). It runs on macOS, Windows, and Linux.

## Key commands

| Command | What it does |
|---------|-------------|
| `wails dev` | Live dev mode — Vite HMR frontend + Go backend. Opens browser on `localhost:34115`. |
| `wails build` | Production build — outputs a native executable (name: `hypr`, per `wails.json`). |
| `go mod tidy` | Sync Go dependencies. Wails calls `npm install` automatically. |
| `wails doctor` | Check Wails toolchain prerequisites (native deps, etc.). |

**There are no tests in this repo.** There is no `go test` or `npm test` to run.

## Project structure

```
hypr/
  main.go          — Entry point. Embeds `frontend/dist`, creates Wails window (1280×1080).
  app.go           — Go HTTP client logic: `MakeRequest()`, `RunCurl()`, `RequestResult` struct.
  parse_curl.go    — Curl-to-request parser. Uses `go-shellwords` to tokenize curl strings.
  export.go        — Exports request/response to JSON via native save dialog.
  frontend/
    src/
      App.tsx      — Main React component. All UI: method selector, URL, headers, body, response.
      main.tsx     — React 18 entry point, renders `<App />`.
    vite.config.ts — Minimal Vite config (React plugin only).
    tsconfig.json  — TypeScript strict mode, `noEmit: true`, JSX react-jsx.
  wails.json       — Wails config: frontend install/build hooks, output filename.
  go.mod           — Go module: `module changeme` (⚠️ not renamed from default).
```

## Architecture notes

- **Go module name is `changeme`** (`go.mod:1`). This is the default placeholder — it has not been renamed. If you import this module elsewhere, update it.
- **Go version: 1.18** (`go.mod:2`). No newer Go features (generics, etc.) are used.
- **Wails binds `App` struct** (`main.go:31`) to the frontend. All Go methods called from React (`MakeRequest`, `RunCurl`, `Export`) are on this struct.
- **Frontend auto-build**: Wails runs `npm run build` (which does `tsc && vite build`) before producing the final binary. The `frontend/dist` directory is embedded into the Go binary via `//go:embed all:frontend/dist`.
- **No CI/CD workflows** exist in this repo (no `.github/workflows/`).
- **No linting, formatting, or typecheck scripts** — just `tsc` via the build step.

## Common gotchas

- **First-time setup**: Run `wails doctor` before `wails dev`. Wails needs platform-specific native toolchains (e.g., WebKit on Linux, Safari frameworks on macOS).
- **Module name mismatch**: `go.mod` says `module changeme`. The `go:embed` path in `main.go` references `frontend/dist` — this works because Wails manages the build. But the Go module name should be updated if this project is published or imported.
- **No hot-reload for Go code**: `wails dev` only hot-reloads the frontend (Vite HMR). Go changes require a restart.
- **Curl parser limitations** (`parse_curl.go`): Handles basic curl flags (`-X`, `-H`, `-d`, `-A`, `-u`, `-I`, `-b`). Does not handle `--data-binary`, `--data-urlencode`, or complex multi-part uploads.