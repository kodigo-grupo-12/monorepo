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
La pantalla donde la persona entra con su cuenta de Google (botón «Continuar con Google»). En Expo Go avisa que por ahora Cuéntame se usa en el navegador.
_Avoid_: sign-in, autenticación

**Cuenta demo**:
La cuenta fija demo@cuentame.com / demo1234 con la que se entraba antes del login con Google. Ya no se ofrece en el login.
_Avoid_: cuenta temporal, usuario de prueba

**Sesión**:
La sesión persistente de Firebase Auth. Si existe, el splash deja ver el inicio. Sigue ahí al recargar. El proveedor expone `cargando`, `activa`, `entrar`, `salir` y el usuario actual (`uid`, `nombre`, `correo`, `foto`).
_Avoid_: marca local, token propio

**Dueño (uid)**:
El identificador de Firebase Auth de la persona. La capa de datos lo pone al crear una transacción, una categoría o una cartera; las pantallas no lo escriben. Los listeners filtran por este campo. Nunca va junto con `global` en el mismo documento.
_Avoid_: userId, owner, cuenta

**Reglas de Firestore**:
Las reglas versionadas en el repo que niegan todo por defecto. Con sesión, cada persona lee y escribe solo documentos cuyo `uid` es el suyo. Las categorías de producción (`global: true`, sin `uid`) se leen con cualquier sesión y nadie las escribe desde la app. Una consulta sin el filtro que toca no pasa.
_Avoid_: permisos abiertos, modo prueba

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
La sección donde la persona conversa con el Agente: un chat que responde preguntas sobre su dinero con herramientas que calculan sobre sus transacciones (ADR-0018). Hoy es la pantalla real con burbujas y preguntas de ejemplo.
_Avoid_: chatbot, asistente virtual, IA

**Herramienta**:
Cada función pura que el Agente ejecuta en el aparato (resolverCategoria, totalPorCategoria, diaConMasGasto, gastoDelMes, resumenIngresos) y que devuelve un resultado, nunca las transacciones crudas.
_Avoid_: function call, API, endpoint

**Rango**:
El período de fechas AAAA-MM-DD que una herramienta del Agente usa para calcular, armado por el orquestador a partir de un periodo (hoy, este_mes, mes_pasado, ultimo_mes, este_anio, todo) o de fechas concretas.
_Avoid_: window, query, fecha rango

**Cobertura**:
Lo que cada resultado del Agente dice sobre su alcance: cuántas transacciones consideró, cuándo empieza el historial, cuántas van sin categoría y si el rango arranca antes de la primera transacción.
_Avoid_: stats, metadata

**Cuenta**:
La pantalla de la persona que usa la app: su perfil, sus ajustes y el cierre de sesión.
_Avoid_: ajustes, configuración

**Placeholder**:
La pantalla provisional que muestra una sección mientras no tiene pantalla propia. Dice «En desarrollo» y al entrar muestra el toast.
_Avoid_: dummy, stub, pantalla vacía

### La pantalla Cuenta

**Perfil**:
El bloque de Cuenta con el avatar, el nombre y el correo de la cuenta de Google.
_Avoid_: usuario

**Avatar**:
El círculo con la inicial de la cuenta de Google, arriba del perfil.
_Avoid_: foto de perfil

**Toast**:
El aviso breve «En desarrollo» que aparece al entrar al placeholder y desaparece solo.
_Avoid_: snackbar, notificación, alerta

**Cerrar sesión**:
La acción que cierra la sesión de Firebase Auth y regresa al splash con el carrusel y el login.
_Avoid_: logout, desloguearse

### Las transacciones

**Transacción**:
Registro de un movimiento de dinero (gasto o ingreso) con monto, nota, fecha, cuenta, categoría, cartera e imagen opcionales.
_Avoid_: movimiento, registro contable

**Gasto**:
Transacción que sale de la cartera.
_Avoid_: egreso

**Ingreso**:
Transacción que entra a la cartera. (No confundir con Abono.)
_Avoid_: entrada

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
Los datos que la app crea para cada persona al entrar por primera vez: su cartera Efectivo y 6 transacciones de demo, todas con su uid (`sembrarPrimeraEntrada`).
_Avoid_: datos de prueba, fixtures

**Historial sembrado**:
El historial de ejemplo que `scripts/firestore/sembrar-historial.mjs` genera para un uid: 98 transacciones y 3 carteras (Efectivo, Banco y Tarjeta), deterministas con la semilla 12, con el día pico del 15 de hace dos meses.
_Avoid_: datos de prueba, fixture, historial falso

**Datos demo legados**:
Los documentos sin uid de la demo compartida anterior: transacciones, carteras y categorías sin uid que no son de producción. Los lista y borra `scripts/firestore/borrar-demo-legado.mjs`, primero simulando y solo con `--confirmar` de verdad.
_Avoid_: basura, cleanup, residuos

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
Etiqueta plana de una transacción: tiene nombre y tipo (gasto o ingreso). No pertenece a carteras y no tiene jerarquía ni sub-niveles. Las 14 de producción son globales (`global: true`, sin `uid`); las que crea la persona llevan su `uid` y no llevan `global`.
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

## Deudas y préstamos

**Compromiso**:
El registro de una deuda o un préstamo entre la persona y su contraparte, con dirección, naturaleza, monto y fecha. Nada de lo que es suma se guarda: lo pendiente y el estado se calculan.
_Avoid_: deuda como nombre genérico, préstamo como nombre genérico

**Deudas y préstamos**:
La sección de Inicio donde la persona ve lo que le deben y lo que debe, y anota cobros y pagos. Su spec es la #130 y su ADR el 0019.
_Avoid_: pestaña de deudas, módulo de préstamos

**Contraparte**:
La otra persona del compromiso: quien me debe o a quien debo. Se guarda con nombre y, opcionalmente, teléfono con el código del país para recordarle por WhatsApp.
_Avoid_: persona, deudor, acreedor

**Abono**:
Transacción amarrada al compromiso que baja lo pendiente. Un cobro (me deben) o un pago (debo) que entra al historial como cualquier movimiento.
_Avoid_: pago suelto, parcialidad

**Pendiente**:
Lo que falta por cobrar o pagar de un compromiso: el monto menos lo abonado, calculado en el momento.
_Avoid_: saldo de la deuda

**Vencimiento**:
La fecha opcional en la que el compromiso debía estar saldado. Pasada la fecha con pendiente, el compromiso queda vencido.
_Avoid_: fecha límite, deadline

**Movimiento neutral**:
Transacción que mueve plata sin ser gasto ni ingreso: prestar, pagar una deuda, recibir un préstamo o cobrar. Sale del análisis de Inicio (gráfico, delta y desglose) y entra al saldo.
_Avoid_: transacción especial, ajuste

**Cierre**:
El final de un compromiso que no fue por pagarlo completo: perdonado o cancelado. Un compromiso con cierre ya no cambia de estado.
_Avoid_: borrado, eliminado

**Plan de cuotas**:
El acuerdo opcional de pagar en partes: modo fijo o variable, número de cuotas, día del mes y primer mes. Se guarda en el compromiso y las cuotas se calculan, no se graban.
_Avoid_: calendario de pagos, financiación

**Cuota**:
Cada parte del plan de cuotas: una cantidad fija o variable con su fecha esperada. Se calcula del plan; hasta que se paga no es una transacción.
_Avoid_: mensualidad
