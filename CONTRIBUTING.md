# Contributing to Hypr

Thanks for your interest in improving Hypr! This document covers how to set up the project,
the conventions we follow, and how releases are cut.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

1. **Fork** the repo and clone your fork.
2. Install the prerequisites (see [README → Build from source](README.md#build-from-source)):
   Go 1.22+, Node.js 18+, and the Wails v2 CLI. Run `wails doctor` to verify.
3. Start the app in dev mode:

   ```bash
   wails dev
   ```

## Project layout

| Path | What it is |
|------|-----------|
| `main.go`, `app.go` | Wails entry point and the Go methods bound to the UI |
| `parse_curl.go` | cURL → request parser |
| `export.go` | JSON export via native save dialog |
| `frontend/` | React + TypeScript + Tailwind/shadcn UI |
| `*_test.go` | Go unit tests |

See [CLAUDE.md](CLAUDE.md) for a fuller architecture overview.

## Development workflow

1. Create a branch from `main`: `git checkout -b feat/short-description`.
2. Make your change. Keep commits focused and write clear messages
   (we loosely follow [Conventional Commits](https://www.conventionalcommits.org):
   `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
3. Make sure checks pass locally (see below).
4. Open a pull request against `main` and fill out the PR template.

## Checks

Before pushing, run the same checks CI runs:

```bash
# Backend
go vet ./...
go test ./...

# Go linting
golangci-lint run ./...

# Frontend (lint + typecheck + build)
cd frontend && npm ci && npm run lint && npm run build
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs these on every push and pull request.

### Local git hooks

Enable the repo's git hooks to catch issues before they hit CI:

```bash
make hooks   # or: git config core.hooksPath .githooks
```

- `pre-commit` — fails if any Go file is not `gofmt`-formatted.
- `pre-push` — mirrors CI (`go vet`, `go test`, `golangci-lint` if installed, frontend lint + build).

`make setup` runs `make hooks` and installs frontend dependencies in one go.

### Git hooks

The repo ships pre-commit and pre-push hooks in `.githooks/`. Enable them once per clone:

```bash
make hooks
# or manually:
git config core.hooksPath .githooks
```

The **pre-commit** hook rejects any unformatted Go files (`gofmt -w .` to fix).
The **pre-push** hook mirrors the full CI suite locally (go vet, go test, golangci-lint if available, and the frontend lint + build).

## Releasing

Hypr follows [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`):

- **MAJOR** — breaking changes to behavior or exported APIs.
- **MINOR** — new, backwards-compatible features.
- **PATCH** — backwards-compatible bug fixes.

Releases are cut from `main` by a maintainer:

1. Move the entries under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) into a new
   `## [X.Y.Z] - YYYY-MM-DD` section and open a "release prep" PR.
2. Once merged, tag the release and push the tag:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. Pushing a `v*` tag triggers the [release workflow](.github/workflows/release.yml), which
   builds macOS, Windows, and Linux binaries and publishes a GitHub Release with the artifacts attached.
4. Pre-releases use a hyphenated suffix (e.g. `v1.2.0-rc.1`) and are automatically marked as pre-release.

## Reporting bugs & requesting features

Use the [issue templates](https://github.com/dropdevrahul/hypr/issues/new/choose). For security
issues, please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
