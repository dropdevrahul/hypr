# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Changed
- cURL import now populates the header rows and request body of the active tab.
- The response view now follows the active request tab.
- The "add header" action moved next to the Request Headers title.

### Fixed
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
