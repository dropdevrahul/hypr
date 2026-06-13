.PHONY: hooks setup lint test build

hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*

setup: hooks
	cd frontend && npm install

lint:
	go vet ./...
	golangci-lint run ./...
	cd frontend && npm run lint

test:
	go test ./...

build:
	wails build
