# Transacciones: navegación por días y saldo real calculado

Decisión aceptada el 2026-11-25. El tab Transacciones pasa de placeholder a la segunda pantalla real del navbar siguiendo el modelo `Assets/transacciones/modelo-pantalla-transacciones.png` y sus dos pantallas anexas (calendario y selector de cartera) de `kodigo-grupo-12/.github`.

**Saldo real y fijo.** El saldo de la cabecera es el que hay HOY para la cartera seleccionada y no cambia al navegar entre días: se calcula en vivo desde el snapshot de transacciones (regla de la T007, nunca se guarda). Con «Total» suma todas las transacciones; con una cartera elegida, las de su `cartera_id`. Formato USD con dos decimales.

**Tira de días.** El slider horizontal recorre desde 5 días antes de la última transacción hasta hoy; deslizar o tocar un día lo selecciona y el resumen (Entrada en azul, Salida en rojo, total del día) y la lista se recalculan para ese día. El día elegido desde el calendario puede quedar fuera de esa base (un día anterior a la última transacción menos 5, o futuro): el rango se estira para contenerlo sin mover la base. El botón »» redondo regresa a hoy.

**Calendario y selector como modales.** «Mostrar calendario» y el selector de cartera son modales a pantalla completa con X, sin navbar: segunda y tercera excepciones a la regla de la T005 junto con el modal del + (T006). Tocar un día del calendario lo selecciona y regresa a Transacciones; elegir una cartera en el selector filtra saldo y lista. El calendario se dibuja con vistas: lunes primero, punto azul por día con ingreso, rojo por día con gasto, hoy con anillo verde y el día seleccionado en círculo verde. «Ver informes» queda fuera del MVP.

**Montos coloreados solo en esta pantalla.** Los montos se colorean como MoneyLover: ingresos en azul (`azulMonto` #4FC3F7) y gastos en rojo (`rojoMonto` #FF453A), tokens nuevos de la paleta. Inicio sigue con montos blancos: su propia cara es otra tarea.

**Filas de solo lectura.** Tocar una fila no hace nada en esta pasada: editar y eliminar siguen en Inicio (ADR-0012). El selector tampoco crea ni edita carteras: crear sigue viviendo en Cuenta y en la alta rápida del modal, y el esquema de carteras queda sin cambios (sin tipo).

**Selección no persistente.** El día y la cartera seleccionados viven en el estado de la pantalla y vuelven a hoy y Total al reabrir. No se guardan en AsyncStorage ni en Firestore.

Se consideró una librería de calendario y navegación por rutas para el calendario y el selector. Se descartaron: el grill no permite integrar librerías nuevas y las dos pantallas viven dentro del estado del propio tab, así que el día y la cartera no viajan por el stack. Consecuencias: la pantalla depende de las colecciones «transacciones», «categorias» y «carteras» ya escuchadas por los hooks de la T006 y la T007, sin lecturas ni escrituras nuevas; el rango de la tira cambia si se crea o edita una transacción en otra fecha (la última transacción mueve la base); y un día futuro puede verse desde el calendario aunque la tira termine en hoy cuando el rango se estira.
