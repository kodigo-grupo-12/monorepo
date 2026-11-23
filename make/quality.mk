# ═══════════════════════════════════════════════════════════════
# ✅ QUALITY — Local typecheck, cleaning, and verification contract
# ═══════════════════════════════════════════════════════════════
# 🎯 Purpose: Run non-mutating quality contracts and project cleanliness.
#
# 📎 Targets:
#    typecheck  Run TypeScript typecheck across cuentame app.
#    clean      Clean bundler caches, build artifacts and temporary files.
#    verify     Run full non-mutating local quality and readiness verification.

SHELL := bash

.PHONY: help-quality typecheck clean verify

# ═══════════════════════════════════════════════════════════════
# ✅ HELP-QUALITY - Show the local quality target catalog
# ═══════════════════════════════════════════════════════════════
help-quality: ## Show local quality targets
	@printf "\n"
	@printf "$(CYAN)✅ Local quality targets$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  make typecheck            Run TypeScript typecheck across cuentame app\n"
	@printf "  make clean                Clean build outputs, bundler caches and temp artifacts\n"
	@printf "  make verify               Run environment doctor and TypeScript verification\n"

# ═══════════════════════════════════════════════════════════════
# ✅ TYPECHECK - Run TypeScript typecheck
# ═══════════════════════════════════════════════════════════════
typecheck: ## Run TypeScript typecheck
	@printf "\n$(CYAN)✅ typecheck · verificando tipos TypeScript$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@pnpm --filter cuentame typecheck
	@printf "\n$(GREEN)  ✓ typecheck completado sin errores$(NC)\n"

# ═══════════════════════════════════════════════════════════════
# 🧹 CLEAN - Clean bundler caches and build artifacts
# ═══════════════════════════════════════════════════════════════
clean: ## Clean bundler caches, build artifacts and temporary files
	@printf "\n$(CYAN)🧹 clean · limpiando salidas de compilación y cachés$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	rm -rf .turbo apps/cuentame/.turbo apps/cuentame/.expo /tmp/metro-* /tmp/haste-map-* 2>/dev/null || true; \
	printf "  $(GREEN)✓$(NC) Cachés y temporales de Expo/Turbo eliminados\n"; \
	printf "\n$(GREEN)  ✓ limpieza completada$(NC)\n"

# ═══════════════════════════════════════════════════════════════
# 🔍 VERIFY - Run full non-mutating quality contract
# ═══════════════════════════════════════════════════════════════
verify: ## Run full non-mutating quality verification contract
	@printf "\n$(CYAN)🔍 verify · ejecutando contrato de verificación local$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@$(MAKE) doctor
	@$(MAKE) typecheck
	@printf "\n$(GREEN)  ✓ verificación completa pasada con éxito$(NC)\n"
