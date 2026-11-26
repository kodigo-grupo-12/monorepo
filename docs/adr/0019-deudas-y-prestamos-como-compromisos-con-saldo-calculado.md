# Deudas y préstamos como compromisos con saldo calculado

Decisión propuesta el 2026-11-26; se acepta con el visto bueno de Luis al mergear.

Cuéntame necesita llevar deudas y préstamos entre personas (spec #130, tarea T014). Hoy el aparato solo registra el flujo de dinero por día (ADR-0014), con datos por dueño (ADR-0016). Un préstamo no es un gasto: si le presto $50 a Juan, el dinero salió pero no se gastó. Guardar «deuda pendiente: $30» como dato rompería esa línea: lo pendiente cambiaría a cada abono y habría dos verdades.

**Compromisos.** Nace la colección `compromisos`, con el mismo esquema por dueño de ADR-0016: cada documento lleva `uid`, dirección («me_deben» o «debo»), naturaleza («dinero» o «compra»), contraparte, monto, fecha, y campos opcionales (teléfono, vencimiento, plan de cuotas, precio de contado, categoría, cartera, nota). Nada de lo que es suma se guarda: lo abonado, lo pendiente y el estado se calculan en funciones puras de `compromisos/` con las transacciones que la persona ya escucha, igual que el saldo de ADR-0011.

**Abonos amarrados.** Los abonos son transacciones normales amarradas al compromiso con `compromiso_id` y `rol: 'abono'`. Así todo abono vive en el historial, entra a los gráficos si es movimiento real y el saldo cuadra sin lógica nueva. La transacción de origen del compromiso va con `rol: 'origen'`.

**Movimiento neutral.** Nace `neutral: true` para transacciones que mueven plata sin ser gasto ni ingreso: prestar y pagar una deuda restan del saldo y de «Seguro para gastar hoy», y recibir un préstamo y cobrar suman. La regla que confirmó Roberto el 2026-11-26: «si el dinero entró, vaya a la suma global y esté disponible, pero si salió, igual deje de estar disponible». La única función que decide qué cuenta como gasto o ingreso es `esMovimientoReal` (`t.neutral !== true`). Solo el gráfico, el delta y el desglose de Inicio excluyen los movimientos neutrales, para no inflar el análisis; el saldo total, el de cartera, «Seguro para gastar hoy», Recientes, Transacciones y Mis carteras siguen contando todo. `cambiosTransaccion` no lleva `compromiso_id`, `rol` ni `neutral`: editar desde Inicio (ADR-0012) borra lo indefinido con `deleteField` y rompería el amarre.

**Cuotas calculadas.** Las cuotas se calculan y no se graban: del plan guardado en el compromiso (modo, cuota fija opcional, número de cuotas, día del mes y primer mes) se deduce cuánto toca y qué está al día. No hay interés. La fase 2 (#138 a #140) agrega la vista de cuotas; esta decisión queda asentada aquí desde la fase 1.

**Sin tab nuevo.** Se descartó grabar cada cuota como transacción futura (lo que sufren Mobills y Organizze: una deuda de 24 cuotas escribe 24 documentos que luego hay que borrar), guardar un campo `pagado` en el documento (una suma guardada es una segunda verdad contra las transacciones) y un tab nuevo en el navbar (el navbar es global y estable, ADR-0006; los compromisos viven dentro de Inicio).

**Agente de solo lectura.** El Agente (ADR-0018) sigue de solo lectura en esta fase: no crea ni cierra compromisos ni registra abonos; en la fase 3 podría leer los compromisos para responder preguntas.

Reabre la decisión de la T006 (#44) «Deuda/Préstamo queda fuera del MVP»: vuelve a estar en alcance con este diseño.

Consecuencias: una consulta más por dueño sin índice compuesto (la consulta filtra solo por `uid` y el orden se hace en el aparato); las reglas ganan validaciones propias para `compromisos` y para los campos de amarre de las transacciones; desplegar las reglas sigue siendo manual y va junto con las de ADR-0016, solo con la aprobación de Roberto; el Agente y las pantallas existentes no cambian en la fase 1.
