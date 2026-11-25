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

### El navbar

**Navbar**:
La barra inferior que aparece en todas las pantallas después del login. Tiene cuatro tabs y el botón central al medio.
_Avoid_: tab bar, bottom navigation, menú inferior

**Tab**:
Cada una de las cuatro posiciones del navbar: Inicio, Transacciones, Agente y Cuenta.
_Avoid_: pestaña, ítem, botón

**Botón central**:
El círculo verde con el + al medio del navbar, elevado sobre la barra. Todavía no hace nada; abrirá una nueva transacción.
_Avoid_: FAB, botón flotante

**Transacciones**:
La sección del libro donde se ven y se registran los ingresos y los gastos. Hoy muestra el placeholder.
_Avoid_: historial, registro, gastos

**Agente**:
La sección donde la persona conversa con los agentes de la app. Hoy muestra el placeholder.
_Avoid_: chatbot, asistente virtual, IA

**Cuenta**:
La pantalla de la persona que usa la app: su perfil, sus ajustes y el cierre de sesión.
_Avoid_: ajustes, configuración

**Placeholder**:
La pantalla provisional que muestra una sección mientras no tiene pantalla propia. Dice «En desarrollo» y al entrar muestra el toast.
_Avoid_: dummy, stub, pantalla vacía

### La pantalla Cuenta

**Perfil**:
El bloque de Cuenta con el avatar, el banner, el nombre y el correo de la cuenta.
_Avoid_: usuario

**Avatar**:
El círculo con la inicial de la cuenta demo, arriba del perfil.
_Avoid_: foto de perfil

**Toast**:
El aviso breve «En desarrollo» que aparece al entrar al placeholder y desaparece solo.
_Avoid_: snackbar, notificación, alerta

**Cerrar sesión**:
La acción que borra la sesión guardada y regresa al splash con el carrusel y el login.
_Avoid_: logout, desloguearse
