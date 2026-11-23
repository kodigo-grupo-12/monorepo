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

`pnpm start` no termina: levanta un solo servidor. Sin sesión, el navegador muestra el splash y después el carrusel. Con sesión, el splash deja ver el inicio. El teléfono abre esa misma pantalla. En otra terminal:

```bash
pnpm typecheck
```

`pnpm typecheck` es el chequeo automático.

El teléfono tiene que estar en la misma red y usar Expo Go del SDK 58. No se usa la carpeta nativa de Android y no se genera un APK.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.

## Ilustraciones del carrusel

Las seis ilustraciones de `apps/cuentame/assets/carrusel/` son copias. Se reponen desde la carpeta de assets del carrusel de la TAREA 003:

- `01-finanzas-simple.png`
- `02-gastos-por-mes.png`
- `03-balance-todo.png`
- `04-metas-ahorro.png`
- `05-agente.png`
- `06-privacidad.png`

La pantalla no las pide por URL. El modelo y la plantilla de login no se muestran.
