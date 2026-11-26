# Servir la demo web en GitHub Pages

Decisión aceptada el 2026-11-25. La demo de Cuéntame solo existía levantada en local: el equipo no tenía un URL fijo para mirar el avance y el APK formal no existe todavía (ADR-0002 deja la validación rápida en Expo Go). Se decide servir el bundle web de la app en GitHub Pages a partir de cada verde de main, con URL https://kodigo-grupo-12.github.io/monorepo/, sin cambiar la experiencia de desarrollo local ni el diseño app Android + web de Expo.

**Config condicional.** app.json queda intacto. El ajuste vive en apps/cuentame/app.config.js, que devuelve app.json tal cual y solo cuando el build trae PAGES_DEPLOY=1 cambia web.output a "single" y fija experiments.baseUrl con PAGES_BASE_URL (/monorepo/). make dev y make dev-clear no ven nada: esas llaves solo afectan al artefacto de expo export.

**Bundle estático.** Pages no corre servidores Node, así que el build de Pages exporta con output "single": una sola HTML con la navegación del lado del cliente. El bundle es 100% estático: la foto viaja en base64 dentro del documento (ADR-0009), la sesión es la persistente de Firebase Auth (ADR-0004, ADR-0016) y los datos corren por el SDK web contra Firestore, igual que en Expo Go.

**Config de Firebase.** La apiKey del SDK web es pública por diseño (la protección la dan las reglas de Firestore), así que puede viajar dentro del bundle. Al build llega por variables del repositorio los valores públicos del proyecto y por el secreto de Actions la apiKey.

**Enlaces profundos.** Cargar directo /monorepo/transacciones da 404 en Pages porque no existe ese archivo; la navegación interna funciona porque es del lado del cliente. Aceptado para la demo.

Se consideró publicar en el repo .github de la org (URL en la raíz) y mantener el modo server con un servidor propio. Se descartaron: el perfil de la org no es lugar para el build de una app, y un servidor propio contradice el costo cero y cero operación que la demo necesita. Consecuencias: el primer workflow del monorepo aparece en .github/workflows; mientras Firestore siga en modo prueba, quien tenga el URL puede leer y escribir las semillas (solo datos demo y el sembrador repone todo); el modo prueba vence alrededor del 2026-12-25. El login con Google y las reglas por usuario reemplazan el aplazamiento de Auth: ver ADR-0016. El dominio de Pages hay que agregarlo a los dominios autorizados de Firebase Auth para que el popup de Google funcione en la demo publicada.
