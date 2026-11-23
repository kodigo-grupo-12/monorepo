# Monorepo

Repositorio de la aplicación del Grupo 12. Una app Expo, para Android y para la web.

En esta etapa la aplicación se llama Cuéntame. El nombre puede cambiar.

- Código: https://github.com/kodigo-grupo-12/monorepo
- Documentación: https://github.com/kodigo-grupo-12/documentacion
- Sitio: https://kodigo-grupo-12.github.io/documentacion/

## Validación rápida

Hace falta Node 22.13 o más. En la raíz del repo:

```bash
pnpm install
pnpm start
pnpm typecheck
```

`pnpm install` instala el único paquete, `cuentame`. `pnpm start` levanta un solo servidor: el navegador muestra la pantalla «Cuéntame» y el teléfono abre esa misma pantalla. `pnpm typecheck` es el chequeo automático.

El teléfono tiene que estar en la misma red y usar Expo Go del SDK 58. No se usa la carpeta nativa de Android y no se genera un APK.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.
