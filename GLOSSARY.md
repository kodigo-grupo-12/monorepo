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
La sección donde la persona escribe preguntas sobre su dinero y recibe respuestas con montos de sus transacciones vivas: el modelo entiende y redacta, las cuentas las hacen herramientas de la app. Hoy vive solo en web.
_Avoid_: chatbot, asistente virtual, IA

**Herramienta**:
Una función pura de la app que el Agente pide y ejecuta sobre los datos vivos: resolver_categoria, total_por_categoria, dia_con_mas_gasto, gasto_del_mes y resumen_ingresos. Ningún monto lo inventa el modelo.
_Avoid_: function calling, tool, función del modelo

**Rango**:
El rango de fechas efectivo que usó un cálculo del Agente, devuelto en cada resultado de herramienta como desde y hasta en AAAA-MM-DD.
_Avoid_: período, fechas usadas

**Cobertura**:
Lo que dice cuánto entró al cálculo del Agente: cuántas transacciones consideradas, la primera fecha del historial, cuántas van sin categoría y si el rango empezó antes de la primera transacción.
_Avoid_: metadata, estadísticas

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

### Las transacciones

**Transacción**:
Registro de un movimiento de dinero (gasto o ingreso) con monto, nota, fecha, cuenta, categoría, cartera e imagen opcionales.
_Avoid_: movimiento, registro contable

**Gasto**:
Transacción que sale de la cartera.
_Avoid_: egreso

**Ingreso**:
Transacción que entra a la cartera.
_Avoid_: entrada, abono

**Monto**:
Cifra de la transacción, mayor a 0 y con máximo 2 decimales, en USD.
_Avoid_: cantidad, importe

**Nota**:
Texto opcional que describe la transacción.
_Avoid_: comentario, descripción

**Foto adjunta**:
Imagen opcional de galería, comprimida en el dispositivo y guardada en base64 dentro del documento.
_Avoid_: recibo, archivo adjunto

**Semillas**:
Los datos de demostración que pueblan las colecciones vacías: las 14 categorías de producción, la cartera Efectivo y las transacciones de demo (el Salario más los 5 gastos).
_Avoid_: datos de prueba, fixtures

**Sincronización en tiempo real**:
Escucha de Firestore (listener) que muestra lo guardado en todos los dispositivos sin recargar.
_Avoid_: polling, actualización automática

**Modal de agregar transacción**:
Pantalla a pantalla completa, sin navbar, que abre el + del navbar y guarda una transacción.
_Avoid_: formulario, diálogo

**Papelera**:
El icono verde al borde derecho de cada fila de Inicio. Tocarla pide confirmación antes de borrar la transacción; nunca borra directo.
_Avoid_: trash, icono de borrado, botón eliminar

**Diálogo de confirmación**:
La tarjeta «¿Eliminar transacción?» que abre la papelera: fondo oscurecido, la transacción identificada por nota y monto, Eliminar en rojo y Cancelar en gris. Cancelar no toca nada y no hay deshacer.
_Avoid_: alert, modal de borrado, confirmación nativa

**Modo edición**:
El mismo modal del + reutilizado para corregir una transacción existente: título «Editar transacción», campos precargados y Guardar actualiza el documento con el mismo id.
_Avoid_: formulario de edición, modal de editar

**Precarga**:
Llenar los campos del modal en modo edición con los datos del documento tocado antes de que la persona toque nada.
_Avoid_: estado inicial, valores por defecto

### Las categorías y las carteras

**Categoría**:
Etiqueta plana de una transacción: tiene nombre y tipo (gasto o ingreso). Es global, no pertenece a carteras, y no tiene jerarquía ni sub-niveles.
_Avoid_: tag, clasificación

**Cartera**:
Contenedor de dinero del usuario (Efectivo, un banco...). Su saldo nunca se guarda en el documento: se calcula sumando sus transacciones.
_Avoid_: billetera, wallet

**Saldo calculado**:
Ingresos menos gastos de una cartera, agregado en vivo desde el snapshot de transacciones.
_Avoid_: saldo guardado, balance

**Alta rápida**:
Crear una categoría o una cartera sin salir del picker del modal del +.
_Avoid_: creación express, flujo corto

**Pantalla empujada**:
Sub-pantalla dentro del stack del tab Cuenta, con navbar visible, a diferencia del modal del + que no lo lleva.
_Avoid_: sub-pantalla, pantalla anidada

**Pages**:
El servicio de GitHub que sirve sitios estáticos por CDN con HTTPS, sin servidor propio. La demo web de Cuéntame se publica ahí en cada verde de main.
_Avoid_: gh-pages, hosting

**Bundle web**:
El HTML y el JavaScript que produce expo export --platform web y que corre en el navegador. Es 100% estático: los datos llegan por el SDK web desde Firestore.
_Avoid_: build web, compilado

**Export**:
El comando que convierte la app en el bundle web (expo export --platform web). El de Pages corre con PAGES_DEPLOY=1 para ajustar el modo single y el baseUrl.
_Avoid_: build de producción, deploy
