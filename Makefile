.DEFAULT_GOAL := help

# ANSI Colors (Template)
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
CYAN := \033[0;36m
DIM := \033[2m
NC := \033[0m

SHELL := bash

# Modular includes
include make/doctor.mk
-include make/dev.mk
-include make/mobile.mk
-include make/quality.mk

.PHONY: help
help: help-doctor
	@printf "\n$(GREEN)  ✓ done$(NC)\n"
	@printf "\n$(YELLOW)📋 Quick Actions:$(NC)\n"
	@printf "$(DIM)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  • diagnosticar entorno: $(BLUE)make doctor$(NC)\n"
	@printf "  • instalar dependencias: $(BLUE)make install$(NC)\n\n"
