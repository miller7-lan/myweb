PREFIX ?= $(HOME)/.local
BIN_DIR ?= $(PREFIX)/bin
SCRIPT := $(CURDIR)/galaxy_site.py
BIN := $(BIN_DIR)/galaxy-site

.PHONY: install-local test smoke

install-local:
	mkdir -p "$(BIN_DIR)"
	printf '%s\n' '#!/usr/bin/env sh' 'exec python3 "$(SCRIPT)" "$$@"' > "$(BIN)"
	chmod +x "$(BIN)"
	@echo "Installed $(BIN)"

test:
	python3 -m unittest discover -s tests -p 'test_*.py'

smoke:
	command -v galaxy-site
	cd /tmp && galaxy-site --help >/dev/null
	cd /tmp && galaxy-site --json doctor >/dev/null
