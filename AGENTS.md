## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on kodigo-grupo-12/monorepo. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `wontfix`, and `ready-for-human` labelled `ready-to-merge`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Hooks y sesión

Los hooks propios se llaman `use` más un nombre en español (`useSesion`, `useSplashActivo`), nunca `usar*`. El compilador de React solo reconoce los nombres que siguen el patrón de React: `use` seguido de una mayúscula o un dígito (`/^use[A-Z0-9]/`). El prefijo `use` no se traduce.

No se anida un segundo proveedor de sesión dentro de un componente que ya consume la sesión. Queda un solo proveedor, en la disposición raíz, compartido por el recorrido de bienvenida y por las pantallas.

## Validación rápida

Desde la raíz, con Node 22.13 o más. `pnpm start` no termina, así que el typecheck va en otra terminal:

```bash
pnpm install
```

```bash
pnpm start
```

```bash
pnpm typecheck
```

`pnpm start` es el único servidor. Sin sesión, el splash deja ver el carrusel en el navegador y, con el teléfono en la misma red, en Expo Go del SDK 58. Con sesión, deja ver el inicio. No se usa la carpeta nativa de Android.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.
