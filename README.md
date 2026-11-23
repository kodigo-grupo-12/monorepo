# Monorepo

Repositorio de la aplicación del Grupo 12. Una app Expo, para Android y para la web.

En esta etapa la aplicación se llama Cuéntame. El nombre puede cambiar.

- Código: https://github.com/kodigo-grupo-12/monorepo
- Documentación: https://github.com/kodigo-grupo-12/documentacion
- Sitio: https://kodigo-grupo-12.github.io/documentacion/

## Validación rápida

Hace falta Node 22.13 o más. En la raíz del repo, primero:

```bash
pnpm install
```

Ese comando instala el único paquete, `cuentame`. Después, en una terminal:

```bash
pnpm start
```

`pnpm start` no termina: levanta un solo servidor. El navegador muestra la pantalla «Cuéntame» y el teléfono abre esa misma pantalla. En otra terminal:

```bash
pnpm typecheck
```

`pnpm typecheck` es el chequeo automático.

El teléfono tiene que estar en la misma red y usar Expo Go del SDK 58. No se usa la carpeta nativa de Android y no se genera un APK.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.
