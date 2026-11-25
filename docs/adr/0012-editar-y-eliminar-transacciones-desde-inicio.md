# Editar y eliminar transacciones desde Inicio

Decisión aceptada el 2026-11-25. La lista de Inicio quedó de solo lectura después de la T006 y la T007: se podía agregar pero no corregir ni borrar un registro. Se cierra Inicio al 100% con las siguientes decisiones.

**Eliminar.** La papelera es un icono verde dibujado con vistas (el patrón de iconos de la T004, sin dependencias nuevas) al borde derecho de cada fila de Inicio. Tocarla abre el diálogo «¿Eliminar transacción?», una tarjeta custom dibujada con vistas, igual en Android y web: fondo oscurecido, tarjeta centrada, la transacción identificada por nota y monto, el botón Eliminar en rojo y Cancelar en gris. Confirmar elimina el documento de la colección «transacciones» con `deleteDoc`. Sin deshacer; Cancelar no toca nada. La imagen en base64 viaja dentro del documento (ADR-0009), así que se va con él y no hace falta nada extra.

**Editar.** Tocar la fila (fuera de la papelera) abre el modal de la T006 en modo edición: título «Editar transacción» y los campos precargados con el documento tocado (tipo, cartera, monto, categoría, nota, fecha e imagen), con Guardar en verde porque lo precargado es válido. La X cierra sin guardar. El modal sigue sin navbar: la excepción de la T006 se mantiene.

**Guardar.** En modo edición actualiza el documento existente con `updateDoc`, mismo id, y cierra regresando a donde estaba. Rigen las reglas de la T006: teclado estándar para el monto, Guardar gris con monto vacío o 0 y verde con monto mayor a 0. Si se cambia el tipo, la categoría que ya no aplica se limpia y se exige elegir otra (la lógica de la T007). Categoría y cartera siguen exigidas en ambos modos, con su selector dentro del propio modal y alta rápida disponible.

**Imagen.** Reemplazarla corre el mismo mecanismo de la T006 (compresión a JPEG con tope interno de ~700 KB y 6 rondas; si no baja, se descarta sin avisar) y «Quitar» es una acción visible en modo edición que deja el campo vacío.

**Feedback.** Sin toast: el efecto en vivo del listener es el feedback. La lista de Inicio y los saldos de cartera (calculados, nunca guardados, regla de la T007) se actualizan al instante al eliminar o editar.

**Arquitectura.** La lógica de eliminar y actualizar vive en el mismo servicio Firestore de la T006 (borrar y actualizar por id); el modal de la T006 se reutiliza con modo edición y documento precargado. No se duplica el modal.

Se consideró una pantalla de detalle dedicada para editar y un diálogo nativo de la plataforma para confirmar. Se descartaron: duplicarían la superficie de edición que ya existe, y el diálogo nativo se ve distinto en Android y en web cuando la meta es una sola pieza dibujada con vistas. Consecuencias: la fila de Inicio gana dos toques (la fila edita, la papelera elimina); los documentos anteriores a la T007 sin categoria_id o cartera_id precargan lo que tienen y Guardar queda gris hasta elegir categoría y cartera; borrar no tiene deshacer, por eso va detrás de la confirmación.
