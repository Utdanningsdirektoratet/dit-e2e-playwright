# DIT E2E Playwright
#
# Project names: <code>-<service>-<device>-<browser>  (auto-discovered)
#
# Projects:
#   dub/frontend        — dubestemmer.no (Canvas LMS / Episerver CMS)
#   komp/frontend-canvas — kompetanse.udir.no Canvas LMS frontend (authenticated flows)
#   komp/frontend-react  — kompetanse.udir.no Next.js headless frontend
#
# ── Basic usage ────────────────────────────────────────────────────────────────
#   make test                                           Run everything (prod)
#   make test TEST_ENV=stage                             Run against staging
#   make test TEST_ENV=local                             Run against localhost
#
# ── Filtering ──────────────────────────────────────────────────────────────────
#   make test FILTER='dub-*'                            All DUB services
#   make test FILTER='dub-frontend-*'                   DUB frontend, all devices + browsers
#   make test FILTER='*-desktop-*'                      All desktop tests
#   make test FILTER='*-mobile-*'                       All mobile tests
#   make test FILTER='*-chromium'                       All Chromium tests
#   make test FILTER='dub-frontend-desktop-chromium'    Single combination
#
# ── Debug / display modes ──────────────────────────────────────────────────────
#   make test HEADED=1                                  Run with browser window visible
#   make test DEBUG=1                                   Open Playwright Inspector
#   make test UI=1                                      Open interactive UI mode
#   make test TRACE=1                                   Capture trace for every test
#   make ui                                             Shortcut for UI mode
#   make ui    FILTER='dub-frontend-desktop-chromium'   UI mode, single project
#   make debug FILTER='dub-frontend-desktop-chromium'   Shortcut for Playwright Inspector
#   make headed FILTER='dub-*' WORKERS=2               Headed mode, 2 workers
#   make headed FILTER='dub-*' TRACE=1                 Headed + trace recording
#   make trace  FILTER='komp-*'                        Trace every test (headless)
#   make codegen URL=https://dubestemmer.no             Record new test interactions
#   make report                                         Open last HTML report
#
# ── Parallelism ────────────────────────────────────────────────────────────────
#   make test WORKERS=1                                 Run serially (easier to follow)
#   make test FILTER='dub-*' WORKERS=4                 Run with 4 workers
#
# ── CI ─────────────────────────────────────────────────────────────────────────
#   CI=1 make test TEST_ENV=stage FILTER='dub-frontend-*'   CI mode (retries + JSON report)

.DEFAULT_GOAL := help

PLAYWRIGHT := pnpm exec playwright test

# ── Environment ────────────────────────────────────────────────────────────────
export TEST_ENV ?=

# ── Options ────────────────────────────────────────────────────────────────────
FILTER  ?=   # project glob, e.g. 'dub-frontend-*'
WORKERS ?=   # worker count override, e.g. WORKERS=1
HEADED  ?=   # HEADED=1 → --headed (browser window visible)
DEBUG   ?=   # DEBUG=1  → --debug --headed --workers=1 --timeout=0 (Playwright Inspector)
UI      ?=   # UI=1     → --ui (interactive UI mode — cannot combine with other flags)
TRACE   ?=   # TRACE=1  → --trace=on (save trace for every test)
URL     ?=   # URL=...  → used by `make codegen`

# ── Build the flag string ──────────────────────────────────────────────────────
_FLAGS :=
ifdef FILTER
  _FLAGS += --project='$(FILTER)'
endif
ifdef HEADED
  _FLAGS += --headed
endif
ifdef DEBUG
  _FLAGS += --debug --headed --workers=1 --timeout=0
endif
ifdef TRACE
  _FLAGS += --trace=on
endif
ifdef WORKERS
  _FLAGS += --workers=$(WORKERS)
endif

# ── Targets ────────────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install dependencies and Playwright browsers
	@which pnpm > /dev/null 2>&1 || npm install -g pnpm@10.4.1
	pnpm install
	pnpm exec playwright install --with-deps

.PHONY: test
test: ## Run tests. Options: TEST_ENV= FILTER= HEADED=1 DEBUG=1 UI=1 TRACE=1 WORKERS= CI=1
ifdef UI
	$(PLAYWRIGHT) --ui $(_FLAGS)
else
	$(PLAYWRIGHT) $(_FLAGS)
endif

.PHONY: ui
ui: ## Open Playwright UI mode (interactive, time-travel debugging). Accepts FILTER= WORKERS= TEST_ENV=
	$(PLAYWRIGHT) --ui $(if $(FILTER),--project='$(FILTER)',) $(if $(WORKERS),--workers=$(WORKERS),)

.PHONY: debug
debug: ## Open Playwright Inspector (headed, 1 worker, no timeout). Accepts FILTER= TEST_ENV=
	$(PLAYWRIGHT) --debug --headed --workers=1 --timeout=0 $(if $(FILTER),--project='$(FILTER)',)

.PHONY: headed
headed: ## Run tests with visible browser window. Accepts FILTER= TEST_ENV= WORKERS= TRACE=1
	$(PLAYWRIGHT) --headed $(if $(FILTER),--project='$(FILTER)',) $(if $(WORKERS),--workers=$(WORKERS),) $(if $(TRACE),--trace=on,)

.PHONY: trace
trace: ## Run tests and record a trace for every test. Accepts FILTER= TEST_ENV= WORKERS=
	$(PLAYWRIGHT) --trace=on $(if $(FILTER),--project='$(FILTER)',) $(if $(WORKERS),--workers=$(WORKERS),)

.PHONY: codegen
codegen: ## Record new test interactions in a browser. URL=https://... (optional)
	pnpm exec playwright codegen $(URL)

.PHONY: report
report: ## Open the HTML test report from the last run
	pnpm exec playwright show-report

.PHONY: clean
clean: ## Remove test results, artifacts, and reports
	rm -rf results/ playwright-report/ test-results/

.PHONY: lint
lint: ## Run ESLint
	pnpm run lint

.PHONY: help
help: ## Show this help and available projects
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@printf '\n\033[1mProjects (auto-discovered):\033[0m\n'
	@for cfg in projects/*/*/config.json; do \
		code=$$(echo $$cfg | cut -d/ -f2); \
		svc=$$(echo $$cfg | cut -d/ -f3); \
		printf "  \033[33m%-32s\033[0m  make test FILTER='%s-%s-*'\n" "$$code/$$svc" "$$code" "$$svc"; \
	done
