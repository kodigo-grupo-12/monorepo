# Login con Google y reglas por usuario

Decisión aceptada el 2026-11-26. Reemplaza el aplazamiento «El login con Firebase Auth queda para después» de ADR-0013. Actualiza de qué está hecha la sesión (ADR-0004) y qué categorías siguen globales (ADR-0011). Android queda fuera en esta etapa frente a ADR-0002.

La persona entra a Cuéntame en web con su cuenta de Google. El proveedor de identidad es Firebase Authentication (plan Spark, sin backend). El login usa el popup del SDK web (`signInWithPopup` con `GoogleAuthProvider`). No se usan Clerk ni WorkOS, ni correo y contraseña, ni otros proveedores sociales.

**Login.** La pantalla Login cambia el formulario de la cuenta demo por el botón «Continuar con Google». Splash, carrusel y recorrido de bienvenida no cambian. Si Google no deja entrar (popup cerrado, sin red, cuenta deshabilitada o bloqueada, dominio no autorizado) el login muestra un aviso en español, sin códigos crudos de Firebase.

**Sesión.** La sesión deja de ser una marca propia en el aparato (ADR-0004) y pasa a ser la sesión persistente de Firebase Auth. El proveedor de sesión sigue exponiendo `cargando`, `activa`, `entrar` y `salir`, y añade el usuario actual (`uid`, `nombre`, `correo`, `foto`) para que las pantallas no cambien su forma de preguntar por la sesión.

**Perfil y cierre.** El perfil de Cuenta muestra nombre, correo e inicial de la cuenta de Google. Cerrar sesión sale de Firebase Auth y sigue el recorrido de ADR-0008 (splash, carrusel y login). Al recargar no hay sesión.

**Reglas por usuario.** Transacciones, categorías propias y carteras ganan el campo `uid` del dueño. Las reglas de Firestore niegan todo por defecto: una persona con sesión lee, crea, actualiza y borra solo documentos cuyo `uid` es el suyo. Las 14 categorías de producción siguen globales, sin `uid`, de solo lectura (ADR-0011). El filtro por `uid` lo pone la capa de datos, nunca una pantalla. Desplegar reglas e índices es una acción manual, no de este ticket ni del CI.

**Solo web.** En esta etapa Cuéntame se usa en el navegador. En Expo Go el login muestra que por ahora la app se usa en el navegador. El Google sign-in nativo y App Check con Play Integrity no corren en Expo Go: chocan con ADR-0002 (validación rápida sin development build). Android queda como trabajo futuro, con un ADR que actualice ADR-0002 cuando haya dev build.

Se consideró seguir con la cuenta demo y una marca local. Se descartó: cualquiera con el URL de Pages escribe las semillas y el modo prueba de Firestore vence cerca del 2026-12-25. Se consideró Clerk. Se descartó: su integración oficial con Firebase está deprecada para apps nuevas y exigiría un servidor. Consecuencias: hay que activar el proveedor Google y agregar el dominio de Pages a los dominios autorizados de Firebase Auth en el proyecto `kodigo-grupo12` (pasos manuales en la consola); hasta que existan reglas desplegadas, Auth no aísla los datos; Expo Go deja de ser el camino de login.
