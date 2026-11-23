## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on kodigo-grupo-12/monorepo. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `wontfix`, and `ready-for-human` labelled `ready-to-merge`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Validación rápida

Desde la raíz, con Node 22.13 o más:

```bash
pnpm install
pnpm start
pnpm typecheck
```

`pnpm start` es el único servidor. La pantalla «Cuéntame» se ve en el navegador y, con el teléfono en la misma red, en Expo Go del SDK 58. No se usa la carpeta nativa de Android.

Lint, los tests automáticos y el build formal quedan fuera de esta tarea.
