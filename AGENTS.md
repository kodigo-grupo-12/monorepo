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

Desde la raíz, con mise fijando Node 22.13.0 y pnpm 12.15.0. `make dev` no termina, así que el typecheck va en otra terminal:

```bash
mise use node@22.13.0 pnpm@12.15.0
make doctor
make install
```

```bash
make dev
```

```bash
make typecheck
```

`make dev` es el único servidor. Sin sesión, el splash deja ver el carrusel en el navegador y, con el teléfono en la misma red, en Expo Go del SDK 58; con sesión, deja ver el inicio. Si hay Tailscale o Docker de por medio, usa `make dev-lan`, que anuncia la IP real de la LAN. No se usa la carpeta nativa de Android.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.
