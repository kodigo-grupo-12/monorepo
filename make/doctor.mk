# ═══════════════════════════════════════════════════════════════
# 🩺 DOCTOR — Environment diagnostics and dependency setup
# ═══════════════════════════════════════════════════════════════
# 🎯 Purpose: Audit development environment and install dependencies.
#
# 📎 Targets:
#    doctor   Audit local environment (Node, pnpm, Java, Android, Ports).
#    install  Install monorepo dependencies via pnpm.

SHELL := bash

.PHONY: help-doctor doctor install

# ═══════════════════════════════════════════════════════════════
# 🩺 HELP-DOCTOR - Show the doctor & setup target catalog
# ═══════════════════════════════════════════════════════════════
help-doctor: ## Show environment diagnostic and setup targets
	@printf "\n"
	@printf "$(CYAN)🩺 Environment & Setup targets$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  make doctor               Audit local environment (Node, pnpm, Java, Android SDK, ports)\n"
	@printf "  make install              Install all dependencies via pnpm across monorepo\n"

# ═══════════════════════════════════════════════════════════════
# 🩺 DOCTOR - Audit environment tools and readiness
# ═══════════════════════════════════════════════════════════════
doctor: ## Audit local environment (Node, pnpm, Java, Android SDK, ports)
	@printf "\n$(CYAN)🩺 doctor · auditando entorno de desarrollo$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	if command -v node >/dev/null 2>&1; then \
		NODE_VER=$$(node -v); \
		NODE_MAJOR=$$(echo "$$NODE_VER" | sed 's/^v//' | cut -d. -f1); \
		NODE_MINOR=$$(echo "$$NODE_VER" | sed 's/^v//' | cut -d. -f2); \
		if [ "$$NODE_MAJOR" -gt 22 ] || { [ "$$NODE_MAJOR" -eq 22 ] && [ "$$NODE_MINOR" -ge 13 ]; }; then \
			printf "  $(GREEN)✓$(NC) Node.js: $$NODE_VER $(DIM)(>= 22.13)$(NC)\n"; \
		else \
			printf "  $(YELLOW)⚠$(NC) Node.js: $$NODE_VER $(RED)(se requiere >= 22.13)$(NC)\n"; \
		fi; \
	else \
		printf "  $(RED)✗$(NC) Node.js: no instalado $(DIM)(se requiere >= 22.13)$(NC)\n"; \
	fi; \
	if command -v pnpm >/dev/null 2>&1; then \
		PNPM_VER=$$(pnpm -v); \
		printf "  $(GREEN)✓$(NC) pnpm: v$$PNPM_VER\n"; \
	else \
		printf "  $(RED)✗$(NC) pnpm: no instalado $(DIM)(ejecutá: npm i -g pnpm)$(NC)\n"; \
	fi; \
	if command -v java >/dev/null 2>&1; then \
		JAVA_VER=$$(java -version 2>&1 | head -n 1); \
		printf "  $(GREEN)✓$(NC) Java / JDK: $$JAVA_VER\n"; \
	else \
		printf "  $(YELLOW)⚠$(NC) Java / JDK: no detectado en PATH $(DIM)(requerido para compilación Android nativa)$(NC)\n"; \
	fi; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	if [ -d "$$SDK_DIR" ]; then \
		printf "  $(GREEN)✓$(NC) Android SDK: $$SDK_DIR\n"; \
	else \
		printf "  $(YELLOW)⚠$(NC) Android SDK: no detectado en $$SDK_DIR $(DIM)(definí ANDROID_HOME si usás Android)$(NC)\n"; \
	fi; \
	if command -v adb >/dev/null 2>&1; then \
		ADB_VER=$$(adb version 2>/dev/null | head -n 1 || echo "disponible"); \
		printf "  $(GREEN)✓$(NC) Android Debug Bridge (ADB): $$ADB_VER\n"; \
	elif [ -x "$$SDK_DIR/platform-tools/adb" ]; then \
		ADB_VER=$$("$$SDK_DIR/platform-tools/adb" version 2>/dev/null | head -n 1 || echo "disponible"); \
		printf "  $(GREEN)✓$(NC) Android Debug Bridge (ADB): $$ADB_VER ($$SDK_DIR/platform-tools/adb)\n"; \
	else \
		printf "  $(YELLOW)⚠$(NC) Android Debug Bridge (ADB): no detectado $(DIM)(requerido para conectar dispositivos físicos o emuladores)$(NC)\n"; \
	fi; \
	EMU_BIN=$$(command -v emulator 2>/dev/null || true); \
	if [ -z "$$EMU_BIN" ] && [ -x "$$SDK_DIR/emulator/emulator" ]; then \
		EMU_BIN="$$SDK_DIR/emulator/emulator"; \
	fi; \
	if [ -n "$$EMU_BIN" ] && [ -x "$$EMU_BIN" ]; then \
		AVDS=$$("$$EMU_BIN" -list-avds 2>/dev/null || true); \
		if [ -n "$$AVDS" ]; then \
			AVD_COUNT=$$(echo "$$AVDS" | wc -l); \
			printf "  $(GREEN)✓$(NC) Android Emulator: $$AVD_COUNT AVD(s) disponible(s)\n"; \
		else \
			printf "  $(YELLOW)⚠$(NC) Android Emulator: binario disponible, pero no hay AVDs configurados\n"; \
		fi; \
	else \
		printf "  $(YELLOW)⚠$(NC) Android Emulator: no instalado o no en PATH $(DIM)(opcional si usás Expo Go o dispositivo físico)$(NC)\n"; \
	fi; \
	PORT_CHECK_8081=$$(ss -tulpn 2>/dev/null | grep ':8081 ' || true); \
	if [ -z "$$PORT_CHECK_8081" ]; then \
		PORT_CHECK_8081=$$(lsof -i :8081 2>/dev/null || true); \
	fi; \
	if [ -n "$$PORT_CHECK_8081" ]; then \
		printf "  $(YELLOW)⚠$(NC) Puerto 8081: ocupado $(DIM)(make dev seleccionará automáticamente otro puerto libre)$(NC)\n"; \
	else \
		printf "  $(GREEN)✓$(NC) Puerto 8081: libre para Metro / Expo\n"; \
	fi
	@printf "\n$(GREEN)  ✓ diagnóstico finalizado$(NC)\n"
	@printf "\n$(YELLOW)📋 Quick Actions:$(NC)\n"
	@printf "$(DIM)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  • instalar dependencias: $(BLUE)make install$(NC)\n\n"

# ═══════════════════════════════════════════════════════════════
# 📦 INSTALL - Install monorepo dependencies
# ═══════════════════════════════════════════════════════════════
install: ## Install monorepo dependencies via pnpm
	@printf "\n$(CYAN)📦 install · instalando dependencias con pnpm$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@pnpm install
	@printf "\n$(GREEN)  ✓ dependencias instaladas$(NC)\n"
