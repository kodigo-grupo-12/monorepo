# La foto adjunta va en base64 comprimida dentro del documento

Decisión aceptada el 2026-11-25. El botón verde del modal permite adjuntar una foto de galería y había dos caminos: Firebase Storage con una referencia en el documento, o la imagen dentro del documento. Se decide comprimir en el dispositivo (redimensionar y comprimir a JPEG, ronda 100-300 KB) y guardar el base64 en el campo `imagen`, con tope interno de ~700 KB en base64 y re-compresión si se pasa.

Se consideró Firebase Storage con una referencia en el documento. Se descartó: Cloud Storage exige plan Blaze en proyectos nuevos desde el 30/10/2024, así que queda fuera del plan gratuito. Con la imagen dentro del documento, el documento queda autosuficiente y la sincronización por listener lleva la foto sola; una foto muy grande sigue limitada por el tope de 1 MB del documento.
