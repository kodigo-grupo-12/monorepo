# Cerrar sesión cierra la sesión y reinicia el recorrido de bienvenida

La fila «Cerrar sesión» de Cuenta pide confirmación (T013) y, al aceptar, cierra la sesión de Firebase Auth al instante; la app vuelve al recorrido completo de bienvenida: splash, carrusel y login. Al recargar no hay sesión. El cierre vive en Cuenta, no en el navbar ni en otra parte.

La T005 había declarado el cierre sin confirmación y la T013 la revirtió: el diálogo de salida usa la misma anatomía del diálogo de eliminar de Inicio, con Salir llamando a `salir()` de `useSesion()`. También se consideró volver solo al carrusel. Se descartó: el splash es la entrada de la app y el reinicio completo deja el estado en cero.
