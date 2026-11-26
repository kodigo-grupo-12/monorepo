# El Agente usa Gemini por Firebase AI Logic con herramientas en el aparato

Decisión aceptada el 2026-11-26. El tab Agente deja de ser el placeholder y responde preguntas sobre las transacciones vivas de la persona con un cerebro Gemini.

**Cerebro.** Firebase AI Logic con `GoogleAIBackend` (Gemini Developer API, capa gratis, plan Spark) por el SDK `firebase/ai` que ya trae `firebase@13.4.0`, modelo `gemini-3.5-flash-lite`, cuyo único nombre vive en `MODELO_AGENTE` de `apps/cuentame/src/agente/config.ts`. RubyLLM quedó descartado por decisión de Roberto el 2026-11-26. Para el Agente, esta decisión reemplaza lo que decía el ADR-0001 de `kodigo-grupo-12/documentacion`: ya no hay servidor propio con llave de Gemini en el `.env`, porque esa llave quedaría pública en el bundle de Pages. Se descartan también un modelo local en Android (no corre en Expo Go) y cualquier servidor propio (Render u otro): no hay backend nuevo que mantener.

**Herramientas en el aparato.** El modelo nunca calcula: pide herramientas (`resolver_categoria`, `total_por_categoria`, `dia_con_mas_gasto`, `gasto_del_mes`, `resumen_ingresos`) y la app las ejecuta como funciones puras sobre el listener en vivo de Firestore (T006). Ningún monto lo inventa el modelo, ninguna nota o imagen de una transacción sale del aparato y el Agente no escribe datos: es de solo lectura. La interfaz de modelo propia (`apps/cuentame/src/agente/modelo.ts`) y el orquestador (`apps/cuentame/src/agente/orquestador.ts`) hacen el bucle de herramientas con tope de 4 rondas, y se prueban sin red con un modelo falso en Vitest.

**Web primero.** El chat solo vive en web: en Android el Agente avisa «Por ahora el Agente se usa en el navegador.» (`modeloFirebaseAI.native.ts`). El historial del chat vive en memoria dentro de `PantallaAgente`, se borra al cerrar sesión y no se guarda en Firestore ni entre aparatos.

**App Check.** Queda fuera solo del MVP: al 2026-11-26 la exigencia de App Check para AI Logic está «Sin aplicar» en kodigo-grupo12 (comprobado en consola; nunca se inició y no hay nada que desactivar). Firebase anunció que la reaplica el 2027-01-21: antes de esa fecha tiene que existir el ticket posterior al MVP de App Check, o el Agente publicado deja de responder. Mientras tanto, cualquiera con la config pública de la app puede gastar la cuota gratis de Gemini del proyecto.

**Privacidad.** En la capa gratis Google puede usar lo enviado para mejorar sus productos; la pantalla lo avisa y la validación se hace solo con datos sembrados.
