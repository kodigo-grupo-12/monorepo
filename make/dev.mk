# ═══════════════════════════════════════════════════════════════
# 🚀 DEV — Expo development server and Metro bundler lifecycle
# ═══════════════════════════════════════════════════════════════
# 🎯 Purpose: Start, manage, and inspect local Expo/Metro development servers.
#
# 📎 Targets:
#    dev         Start Expo dev server on the first available port (default: 8081).
#    dev-lan     Start Expo server announcing local outbound LAN IP for Expo Go.
#    dev-clear   Clean bundler caches and start Expo with --clear.
#    web         Start Expo development server targeting web browser.
#    stop        Stop hanging Expo/Metro dev server processes.

SHELL := bash

PORT ?= 8081

.PHONY: help-dev dev dev-lan dev-clear web stop

# ═══════════════════════════════════════════════════════════════
# 🚀 HELP-DEV - Show the development server target catalog
# ═══════════════════════════════════════════════════════════════
help-dev: ## Show development server targets
	@printf "\n"
	@printf "$(CYAN)🚀 Development server targets$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  make dev [PORT=8081]      Start Expo dev server with automatic free-port detection\n"
	@printf "  make dev-lan              Start Expo announcing outbound LAN IP (avoids Tailscale/Docker)\n"
	@printf "  make dev-clear            Clear Metro & Expo caches, then start server (--clear)\n"
	@printf "  make web                  Start Expo dev server targeting web browser\n"
	@printf "  make stop                 Stop orphan Metro / Expo dev server processes\n"

# ═══════════════════════════════════════════════════════════════
# 🚀 DEV - Start Expo development server with dynamic free port
# ═══════════════════════════════════════════════════════════════
dev: ## Start Expo dev server with free-port detection (PORT=8081 by default)
	@printf "\n$(CYAN)🚀 dev · iniciando servidor Expo con detección dinámica de puerto$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	TARGET_PORT=$${PORT:-8081}; \
	while ss -tulpn 2>/dev/null | grep -q ":$${TARGET_PORT} " || lsof -i :$${TARGET_PORT} >/dev/null 2>&1; do \
		printf "  $(YELLOW)⚠$(NC) Puerto $$TARGET_PORT ocupado, buscando siguiente disponible...\n"; \
		TARGET_PORT=$$((TARGET_PORT + 1)); \
	done; \
	printf "  $(GREEN)✓$(NC) Puerto seleccionado: $(CYAN)$$TARGET_PORT$(NC)\n"; \
	printf "  $(DIM)Ejecutando: pnpm --filter cuentame exec expo start --port $$TARGET_PORT$(NC)\n\n"; \
	pnpm --filter cuentame exec expo start --port "$$TARGET_PORT"

# ═══════════════════════════════════════════════════════════════
# 🌐 DEV-LAN - Start Expo announcing outbound LAN IP
# ═══════════════════════════════════════════════════════════════
dev-lan: ## Start Expo announcing outbound LAN IP (skips Docker/Tailscale)
	@printf "\n$(CYAN)🌐 dev-lan · resolviendo IP de red local para Expo Go$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	LAN_IP=$$(ip route get 1.1.1.1 2>/dev/null | awk '{print $$7; exit}'); \
	if [ -z "$$LAN_IP" ]; then \
		LAN_IP=$$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^172\.' | grep -v '^100\.' | head -n 1); \
	fi; \
	if [ -z "$$LAN_IP" ]; then \
		LAN_IP="127.0.0.1"; \
		printf "  $(YELLOW)⚠$(NC) No se pudo detectar IP LAN externa, usando: $$LAN_IP\n"; \
	else \
		printf "  $(GREEN)✓$(NC) IP LAN de salida detectada: $(CYAN)$$LAN_IP$(NC)\n"; \
	fi; \
	TARGET_PORT=$${PORT:-8081}; \
	while ss -tulpn 2>/dev/null | grep -q ":$${TARGET_PORT} " || lsof -i :$${TARGET_PORT} >/dev/null 2>&1; do \
		printf "  $(YELLOW)⚠$(NC) Puerto $$TARGET_PORT ocupado, buscando siguiente disponible...\n"; \
		TARGET_PORT=$$((TARGET_PORT + 1)); \
	done; \
	printf "  $(GREEN)✓$(NC) Puerto seleccionado: $(CYAN)$$TARGET_PORT$(NC)\n"; \
	printf "  $(DIM)Ejecutando con REACT_NATIVE_PACKAGER_HOSTNAME=$$LAN_IP$(NC)\n\n"; \
	REACT_NATIVE_PACKAGER_HOSTNAME="$$LAN_IP" pnpm --filter cuentame exec expo start --port "$$TARGET_PORT" --lan

# ═══════════════════════════════════════════════════════════════
# 🧹 DEV-CLEAR - Clear bundler caches and start Expo
# ═══════════════════════════════════════════════════════════════
dev-clear: ## Clear bundler caches and start Expo with --clear
	@printf "\n$(CYAN)🧹 dev-clear · limpiando cachés y arrancando servidor Expo$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	EXPO_PIDS=$$(pgrep -f '\bexpo\b.*\bstart\b' 2>/dev/null | grep -v "$$" | grep -v "$$PPID" || true); \
	if [ -n "$$EXPO_PIDS" ]; then kill $$EXPO_PIDS 2>/dev/null || true; fi; \
	rm -rf /tmp/metro-* /tmp/haste-map-* apps/cuentame/.expo 2>/dev/null || true; \
	printf "  $(GREEN)✓$(NC) Cachés temporales eliminadas\n"; \
	TARGET_PORT=$${PORT:-8081}; \
	while ss -tulpn 2>/dev/null | grep -q ":$${TARGET_PORT} " || lsof -i :$${TARGET_PORT} >/dev/null 2>&1; do \
		printf "  $(YELLOW)⚠$(NC) Puerto $$TARGET_PORT ocupado, buscando siguiente disponible...\n"; \
		TARGET_PORT=$$((TARGET_PORT + 1)); \
	done; \
	printf "  $(GREEN)✓$(NC) Puerto seleccionado: $(CYAN)$$TARGET_PORT$(NC)\n"; \
	pnpm --filter cuentame exec expo start --clear --port "$$TARGET_PORT"

# ═══════════════════════════════════════════════════════════════
# 🌍 WEB - Start Expo server targeting web browser
# ═══════════════════════════════════════════════════════════════
web: ## Start Expo dev server for web
	@printf "\n$(CYAN)🌍 web · iniciando servidor Expo en modo web$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@pnpm --filter cuentame exec expo start --web

# ═══════════════════════════════════════════════════════════════
# 🛑 STOP - Stop hanging Metro / Expo processes
# ═══════════════════════════════════════════════════════════════
stop: ## Stop orphan Metro and Expo processes
	@printf "\n$(CYAN)🛑 stop · deteniendo procesos de Metro y Expo$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	STOPPED=0; \
	EXPO_PIDS=$$(pgrep -f '\bexpo\b.*\bstart\b' 2>/dev/null | grep -v "$$" | grep -v "$$PPID" || true); \
	if [ -n "$$EXPO_PIDS" ]; then \
		kill $$EXPO_PIDS 2>/dev/null || true; \
		printf "  $(GREEN)✓$(NC) Procesos de Expo dev detenidos (PIDs: $$EXPO_PIDS)\n"; \
		STOPPED=1; \
	fi; \
	METRO_PIDS=$$(lsof -ti :8081 2>/dev/null || true); \
	if [ -n "$$METRO_PIDS" ]; then \
		kill $$METRO_PIDS 2>/dev/null || true; \
		printf "  $(GREEN)✓$(NC) Procesos en puerto 8081 liberados (PIDs: $$METRO_PIDS)\n"; \
		STOPPED=1; \
	fi; \
	if [ "$$STOPPED" -eq 0 ]; then \
		printf "  $(DIM)• No se encontraron procesos activos de Metro o Expo dev$(NC)\n"; \
	fi; \
	printf "\n$(GREEN)  ✓ servidores detenidos$(NC)\n"
