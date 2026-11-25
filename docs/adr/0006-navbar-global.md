# El navbar es global y vive en el layout con sesión

Después del login, todas las pantallas comparten un navbar inferior: cuatro tabs (Inicio, Transacciones, Agente y Cuenta) y el botón central con el +, copiando la anatomía de la plantilla en `.github/Assets/navbar/navbar-template.png`. El navbar se monta una sola vez en el layout del grupo con sesión de Expo Router, no se repite en cada pantalla y no aparece en el carrusel ni en el login. Tocar un tab lo marca como activo y deja ver el placeholder compartido; las pantallas propias de cada tab llegan con tareas posteriores.

Se consideró repetir el componente en cada pantalla y llevar el estado activo a mano. Se descartó: duplica la barra y pierde el estado entre pantallas. También se consideró una librería de navegación nueva. Se descartó: Expo Router ya está en la app. Los colores son los del tema oscuro (ADR-0005); el modo claro queda para más adelante.
