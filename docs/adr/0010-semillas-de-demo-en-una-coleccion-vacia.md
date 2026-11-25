# Las semillas de demo pueblan una colección vacía

Decisión aceptada el 2026-11-25. Inicio lista las transacciones y en una base nueva no hay nada que mostrar. Se decide un script idempotente (`scripts/sembrar-demo.mjs`, SDK de cliente con la misma config del `.env`) que escribe las cinco transacciones de demo solo si la colección está vacía; todas Gasto, con categoría (Servicios Básicos, Transporte, Recreación).

Se consideró sembrar desde el código de la app. Se descartó: el script es una herramienta de desarrollo y la colección vacía debe poder distinguirse de una sembrada. Consecuencias: la lista es demostrable desde el primer arranque; el script no duplica datos si corre dos veces; el modal sigue guardando sin categoría, ese campo por ahora es solo de las semillas.
