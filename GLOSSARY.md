# Cuéntame

Aplicación del Grupo 12 para llevar el libro de ingresos y gastos. En esta etapa el nombre es provisional.

## Language

**Cuéntame**:
Nombre provisional de la aplicación.
_Avoid_: app, monorepo

**Splash**:
La primera pantalla de la app, la que se ve en la validación rápida. Muestra el icono, que ya incluye el nombre, y el crédito del grupo. Después deja ver el carrusel si no hay sesión, o el inicio si ya hay sesión.
_Avoid_: pantalla de entrada, onboarding, splash nativo

**Crédito del grupo**:
El logo de Kodigo junto a la línea «AI For Devs Jr. 5 — Grupo 12».
_Avoid_: pie, footer

**Carrusel**:
La pantalla de láminas que sigue al splash cuando todavía no hay sesión.
_Avoid_: onboarding, tutorial, bienvenida

**Login**:
La pantalla donde la persona escribe el correo y la contraseña para entrar.
_Avoid_: sign-in, autenticación

**Cuenta demo**:
El correo demo@cuentame.com y la contraseña demo1234, ya escritos en el login, con los que se entra en esta etapa.
_Avoid_: cuenta temporal, usuario de prueba

**Sesión**:
El recuerdo de que la persona ya entró. Si existe, el splash deja ver el inicio. Sigue ahí aunque se cierre la app.
_Avoid_: token, Firebase

**Inicio**:
La pantalla de después de entrar. También es la que sigue al splash cuando ya hay sesión. Hoy muestra el texto «Cuéntame».
_Avoid_: home, pantalla principal

**Validación rápida**:
Ver un cambio en el teléfono físico y en el navegador sin generar un APK propio.
_Avoid_: emulador, development build, build formal

**Build formal**:
Una instalación propia de Cuéntame, posterior a la validación rápida. Cómo se genera no está decidido.
_Avoid_: validación rápida, Expo Go
