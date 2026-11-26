# La sesión se recuerda

Quien entra con Google deja una sesión persistente de Firebase Auth. Al abrir Cuéntame otra vez, el splash deja ver el inicio y el carrusel no sale. Si no hay sesión, el splash deja ver el carrusel, y de ahí se pasa al login. El proveedor de sesión sigue exponiendo `cargando`, `activa`, `entrar` y `salir`, y ahora también el usuario actual (`uid`, `nombre`, `correo`, `foto`).

Se consideró mostrar el carrusel en cada apertura, para que esa entrada se viera siempre. Se descartó: si la persona ya entró, el camino corto es el inicio.

Se consideró seguir guardando una marca propia en el aparato (localStorage o SecureStore). Se descartó: la fuente de verdad es Firebase Auth; una marca aparte se desincroniza al cerrar sesión o al caducar la cuenta.

El cierre de sesión sigue el recorrido de ADR-0008. Cómo se entra (Google en web) y qué queda fuera (Android en Expo Go) está en ADR-0016.
