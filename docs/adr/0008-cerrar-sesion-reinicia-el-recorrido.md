# Cerrar sesión borra la sesión y reinicia el recorrido de bienvenida

La fila «Cerrar sesión» de Cuenta borra el estado local guardado (la marca de sesión) al instante, sin confirmación, y la app vuelve al recorrido completo de bienvenida: splash, carrusel y login. El cierre vive en Cuenta, no en el navbar ni en otra parte.

Se consideró pedir confirmación antes de cerrar. Se descartó: la cuenta demo no pierde nada y el camino corto es la regla de la app. También se consideró volver solo al carrusel. Se descartó: el splash es la entrada de la app y el reinicio completo deja el estado en cero.
