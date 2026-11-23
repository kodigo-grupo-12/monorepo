# ═══════════════════════════════════════════════════════════════
# 📱 MOBILE — Android emulator and ADB device management
# ═══════════════════════════════════════════════════════════════
# 🎯 Purpose: Manage Android Virtual Devices (AVD), ADB connections, and APK installs.
#
# 📎 Targets:
#    emulator     Inspect AVDs and launch the first available emulator in background.
#    devices      List connected physical devices and emulators via ADB.
#    reverse      Reverse TCP port through ADB for Metro communication.
#    logcat       Follow Android system & React Native logs via ADB logcat.
#    apk-install  Install APK on device and start main launcher activity.

SHELL := bash

PORT ?= 8081
APK ?=

.PHONY: help-mobile emulator devices reverse logcat apk-install

# ═══════════════════════════════════════════════════════════════
# 📱 HELP-MOBILE - Show mobile targets catalog
# ═══════════════════════════════════════════════════════════════
help-mobile: ## Show mobile & ADB targets
	@printf "\n"
	@printf "$(CYAN)📱 Mobile & Android targets$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@printf "  make emulator             Inspect AVDs and launch first emulator in background\n"
	@printf "  make devices              List connected ADB devices and emulators\n"
	@printf "  make reverse [PORT=8081]  Forward/reverse Metro port via ADB to device\n"
	@printf "  make logcat               Stream React Native & Android logs via ADB\n"
	@printf "  make apk-install APK=path Install APK and launch main application activity\n"

# ═══════════════════════════════════════════════════════════════
# 📱 EMULATOR - Start Android emulator or show setup guide
# ═══════════════════════════════════════════════════════════════
emulator: ## Inspect and launch first available Android Virtual Device (AVD)
	@printf "\n$(CYAN)📱 emulator · inspeccionando emuladores de Android$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	EMU_BIN=$$(command -v emulator 2>/dev/null || true); \
	if [ -z "$$EMU_BIN" ] && [ -x "$$SDK_DIR/emulator/emulator" ]; then \
		EMU_BIN="$$SDK_DIR/emulator/emulator"; \
	fi; \
	if [ -z "$$EMU_BIN" ] || [ ! -x "$$EMU_BIN" ]; then \
		printf "  $(YELLOW)⚠$(NC) Binario 'emulator' no encontrado en PATH ni en $$SDK_DIR/emulator/emulator\n"; \
		printf "  $(DIM)Guía: instalalo con Android Studio SDK Manager o: sdkmanager --install \"emulator\"$(NC)\n\n"; \
		exit 0; \
	fi; \
	AVDS=$$("$$EMU_BIN" -list-avds 2>/dev/null || true); \
	if [ -z "$$AVDS" ]; then \
		printf "  $(YELLOW)⚠$(NC) No hay ningún Dispositivo Virtual de Android (AVD) configurado.\n"; \
		printf "  $(DIM)Guía: creá uno con: avdmanager create avd -n Pixel_Dev -k \"system-images;android-34;google_apis;x86_64\"$(NC)\n\n"; \
		exit 0; \
	fi; \
	FIRST_AVD=$$(echo "$$AVDS" | head -n 1); \
	printf "  $(GREEN)✓$(NC) AVD encontrado: $(CYAN)$$FIRST_AVD$(NC)\n"; \
	printf "  $(DIM)Iniciando en segundo plano con: $$EMU_BIN -avd $$FIRST_AVD$(NC)\n"; \
	nohup "$$EMU_BIN" -avd "$$FIRST_AVD" -no-snapshot-load >/dev/null 2>&1 & \
	printf "  $(GREEN)✓$(NC) Emulador iniciado en segundo plano\n\n"

# ═══════════════════════════════════════════════════════════════
# 📱 DEVICES - Report ADB connected devices
# ═══════════════════════════════════════════════════════════════
devices: ## List connected ADB devices
	@printf "\n$(CYAN)📱 devices · consultando dispositivos ADB conectados$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	ADB_BIN=$$(command -v adb 2>/dev/null || true); \
	if [ -z "$$ADB_BIN" ] && [ -x "$$SDK_DIR/platform-tools/adb" ]; then \
		ADB_BIN="$$SDK_DIR/platform-tools/adb"; \
	fi; \
	if [ -z "$$ADB_BIN" ] || [ ! -x "$$ADB_BIN" ]; then \
		printf "  $(RED)✗$(NC) adb no encontrado en PATH ni en $$SDK_DIR/platform-tools/adb\n\n"; \
		exit 0; \
	fi; \
	"$$ADB_BIN" devices -l; \
	RAW_OUT=$$("$$ADB_BIN" devices 2>/dev/null || true); \
	DEV_COUNT=$$(printf "%s\n" "$$RAW_OUT" | tail -n +2 | grep -v '^$$' | wc -l || true); \
	if [ "$$DEV_COUNT" -eq 0 ]; then \
		printf "\n  $(YELLOW)⚠$(NC) No hay dispositivos físicos ni emuladores conectados actualmente\n"; \
	else \
		printf "\n  $(GREEN)✓$(NC) $$DEV_COUNT dispositivo(s) conectado(s)\n"; \
	fi; \
	printf "\n"

# ═══════════════════════════════════════════════════════════════
# 🔄 REVERSE - Forward/reverse Metro port via ADB
# ═══════════════════════════════════════════════════════════════
reverse: ## Forward Metro port to connected Android device via ADB
	@printf "\n$(CYAN)🔄 reverse · configurando adb reverse en puerto $(PORT)$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	ADB_BIN=$$(command -v adb 2>/dev/null || true); \
	if [ -z "$$ADB_BIN" ] && [ -x "$$SDK_DIR/platform-tools/adb" ]; then \
		ADB_BIN="$$SDK_DIR/platform-tools/adb"; \
	fi; \
	if [ -z "$$ADB_BIN" ] || [ ! -x "$$ADB_BIN" ]; then \
		printf "  $(RED)✗$(NC) adb no encontrado en PATH ni en $$SDK_DIR/platform-tools/adb\n\n"; \
		exit 0; \
	fi; \
	if "$$ADB_BIN" reverse tcp:$(PORT) tcp:$(PORT) 2>/dev/null; then \
		printf "  $(GREEN)✓$(NC) Puerto tcp:$(PORT) enlazado con éxito hacia el dispositivo Android\n\n"; \
	else \
		printf "  $(YELLOW)⚠$(NC) No se pudo enlazar el puerto (verificá que haya un dispositivo con depuración USB conectada)\n\n"; \
	fi

# ═══════════════════════════════════════════════════════════════
# 📜 LOGCAT - Stream Android & React Native logs
# ═══════════════════════════════════════════════════════════════
logcat: ## Stream React Native and Android system logs via ADB
	@printf "\n$(CYAN)📜 logcat · transmitiendo logs de Android y React Native$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	ADB_BIN=$$(command -v adb 2>/dev/null || true); \
	if [ -z "$$ADB_BIN" ] && [ -x "$$SDK_DIR/platform-tools/adb" ]; then \
		ADB_BIN="$$SDK_DIR/platform-tools/adb"; \
	fi; \
	if [ -z "$$ADB_BIN" ] || [ ! -x "$$ADB_BIN" ]; then \
		printf "  $(RED)✗$(NC) adb no encontrado en PATH ni en $$SDK_DIR/platform-tools/adb\n\n"; \
		exit 0; \
	fi; \
	"$$ADB_BIN" logcat -v time ReactNative:V ReactNativeJS:V Expo:V AndroidRuntime:E *:S

# ═══════════════════════════════════════════════════════════════
# 📦 APK-INSTALL - Install APK and launch main Intent
# ═══════════════════════════════════════════════════════════════
apk-install: ## Install APK on device and start main launcher activity (make apk-install APK=path/app.apk)
	@printf "\n$(CYAN)📦 apk-install · instalando y ejecutando APK$(NC)\n"
	@printf "$(CYAN)────────────────────────────────────────────────────────────────────────────────$(NC)\n"
	@set -euo pipefail; \
	if [ -z "$(APK)" ]; then \
		printf "  $(RED)✗$(NC) Parámetro APK requerido.\n"; \
		printf "  $(YELLOW)Uso:$(NC) $(BLUE)make apk-install APK=ruta/al/archivo.apk$(NC)\n\n"; \
		exit 1; \
	fi; \
	if [ ! -f "$(APK)" ]; then \
		printf "  $(RED)✗$(NC) El archivo '$(APK)' no existe o no es accesible.\n\n"; \
		exit 1; \
	fi; \
	SDK_DIR="$${ANDROID_HOME:-$${ANDROID_SDK_ROOT:-$$HOME/Android/Sdk}}"; \
	ADB_BIN=$$(command -v adb 2>/dev/null || true); \
	if [ -z "$$ADB_BIN" ] && [ -x "$$SDK_DIR/platform-tools/adb" ]; then \
		ADB_BIN="$$SDK_DIR/platform-tools/adb"; \
	fi; \
	if [ -z "$$ADB_BIN" ] || [ ! -x "$$ADB_BIN" ]; then \
		printf "  $(RED)✗$(NC) adb no disponible para instalar el APK.\n\n"; \
		exit 1; \
	fi; \
	printf "  $(GREEN)✓$(NC) Instalando APK: $(CYAN)$(APK)$(NC)\n"; \
	"$$ADB_BIN" install -r "$(APK)"; \
	printf "  $(GREEN)✓$(NC) APK instalado con éxito.\n"; \
	PKG_NAME=""; \
	ANALYZER="$$SDK_DIR/cmdline-tools/latest/bin/apkanalyzer"; \
	AAPT="$$SDK_DIR/build-tools/35.0.0/aapt"; \
	if [ -x "$$ANALYZER" ]; then \
		PKG_NAME=$$("$$ANALYZER" manifest application-id "$(APK)" 2>/dev/null || true); \
	fi; \
	if [ -z "$$PKG_NAME" ] && [ -x "$$AAPT" ]; then \
		PKG_NAME=$$("$$AAPT" dump badging "$(APK)" 2>/dev/null | grep package: | awk -F"'" '{print $$2}' || true); \
	fi; \
	if [ -z "$$PKG_NAME" ]; then \
		PKG_NAME="com.cuentame"; \
	fi; \
	printf "  $(GREEN)✓$(NC) Lanzando Intent principal para paquete: $(CYAN)$$PKG_NAME$(NC)\n"; \
	"$$ADB_BIN" shell monkey -p "$$PKG_NAME" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || \
		printf "  $(YELLOW)⚠$(NC) No se pudo lanzar el intent principal automáticamente vía monkey\n"; \
	printf "\n$(GREEN)  ✓ instalación completada$(NC)\n\n"
