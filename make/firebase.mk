# ═══════════════════════════════════════════════════════════════
# 🔥 FIREBASE — Manual Firestore rules/indexes deploy wrapper
# ═══════════════════════════════════════════════════════════════
# 🎯 Purpose: Wrap the Firebase CLI deploy of rules and indexes.
#
# ⚠️  NEVER run this against kodigo-grupo12 unless Roberto orders it
#     explicitly (deadline 2026-12-20). CI must not call this target.
#     The emulator suite is the automatic check; this is manual only.

SHELL := bash

.PHONY: help-firebase deploy-firestore deploy-firestore-indices

help-firebase: ## Show Firebase deploy targets
	@printf "\n"
	@printf "$(CYAN)🔥 Firebase targets$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  make deploy-firestore     Wrap firebase deploy --only firestore:rules,firestore:indexes\n"
	@printf "                            $(YELLOW)MANUAL: only with Roberto's explicit order, by 2026-12-20.$(NC)\n"
	@printf "                            $(YELLOW)Does not run in CI. Talks to project kodigo-grupo12.$(NC)\n"

# ═══════════════════════════════════════════════════════════════
# 🔥 DEPLOY-FIRESTORE - Rules + indexes to kodigo-grupo12
# ═══════════════════════════════════════════════════════════════
deploy-firestore: ## Deploy Firestore rules and indexes (manual; Roberto only)
	@printf "\n$(RED)🔥 deploy-firestore · proyecto kodigo-grupo12$(NC)\n"
	@printf "$(RED)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  $(YELLOW)⚠ Solo con la orden explícita de Roberto, a más tardar el 2026-12-20.$(NC)\n"
	@printf "  $(YELLOW)⚠ No corre en CI. Afecta de inmediato la demo de Pages.$(NC)\n"
	@printf "  $(DIM)firebase deploy --only firestore:rules,firestore:indexes --project kodigo-grupo12$(NC)\n\n"
	@firebase deploy --only firestore:rules,firestore:indexes --project kodigo-grupo12

# ═══════════════════════════════════════════════════════════════
# 🔥 DEPLOY-FIRESTORE-INDICES - Solo índices a kodigo-grupo12
# ═══════════════════════════════════════════════════════════════
deploy-firestore-indices: ## Deploy Firestore indexes only (manual; Roberto only)
	@printf "\n$(RED)🔥 deploy-firestore-indices · proyecto kodigo-grupo12$(NC)\n"
	@printf "$(RED)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  $(YELLOW)⚠ Solo con la orden explícita de Roberto. No corre en CI.$(NC)\n"
	@printf "  $(YELLOW)⚠ Para el spec #106 no hace falta: el índice ya existe en producción.$(NC)\n"
	@printf "  $(DIM)firebase deploy --only firestore:indexes --project kodigo-grupo12$(NC)\n\n"
	@firebase deploy --only firestore:indexes --project kodigo-grupo12
