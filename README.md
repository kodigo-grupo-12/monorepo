<h3 align="center">
	<img src="https://raw.githubusercontent.com/kodigo-grupo-12/.github/main/Assets/cuentame-web-512.png" width="100" alt="Ícono de Cuéntame"/><br/>
	Cuéntame
	<img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/misc/transparent.png" height="30" width="0px"/>
</h3>

<p align="center">
	App de finanzas personales del Grupo 12. Expo, para Android y para la web.
</p>

<p align="center">
	<a href="https://expo.dev/"><img src="https://img.shields.io/static/v1?style=for-the-badge&message=Expo+SDK+58&colorA=363a4f&colorB=cba6f7&logoColor=d9e0ee"/></a>
	<img src="https://img.shields.io/static/v1?style=for-the-badge&message=Node+22.13%2B&colorA=363a4f&colorB=a6da95&logoColor=d9e0ee"/>
	<img src="https://img.shields.io/static/v1?style=for-the-badge&message=pnpm+12&colorA=363a4f&colorB=fab387&logoColor=d9e0ee"/>
	<a href="https://firebase.google.com/products/firestore"><img src="https://img.shields.io/static/v1?style=for-the-badge&message=Firestore&colorA=363a4f&colorB=f9e2af&logoColor=d9e0ee"/></a>
</p>

<p align="center">
	<a href="https://github.com/kodigo-grupo-12/documentacion">Documentación</a> ·
	<a href="https://kodigo-grupo-12.github.io/documentacion/">Sitio</a> ·
	<a href="https://github.com/kodigo-grupo-12/monorepo/issues">Issues</a>
</p>

## Empezar

Hace falta [mise](https://mise.jdx.dev/), `make` y un teléfono o navegador.

```bash
git clone https://github.com/kodigo-grupo-12/monorepo.git
cd monorepo
mise use node@22.13.0 pnpm@12.15.0   # fija las versiones del repo
make doctor                          # audita el entorno
make install                         # instala dependencias (pnpm)
make dev                             # servidor de Expo
```

`make dev` no termina: levanta un solo servidor. Sin sesión, el navegador muestra el splash y después el carrusel; con sesión, el inicio. El teléfono abre esa misma pantalla: misma red y Expo Go del SDK 58. Si hay Tailscale o Docker de por medio, usa `make dev-lan`, que anuncia la IP real de la LAN. No se usa la carpeta nativa de Android y no se genera un APK.

En otra terminal, mientras `make dev` sigue corriendo:

```bash
make typecheck   # chequeo de tipos
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `make doctor` | audita Node, pnpm, Java, Android SDK y puertos |
| `make install` | instala las dependencias del monorepo |
| `make dev` | servidor de Expo en el primer puerto libre |
| `make dev-lan` | Expo anuncia la IP de la LAN (para Expo Go) |
| `make web` | servidor apuntado al navegador |
| `make typecheck` | chequeo de TypeScript |
| `make verify` | verificación completa local |
| `make stop` | detiene servidores Metro o Expo colgados |

Para Android en dispositivo o emulador, `make` también trae `emulator`, `devices`, `reverse`, `logcat` y `apk-install APK=ruta`. Lint, tests automáticos y build formal quedan fuera de esta etapa.

## Firebase

La app lee y escribe transacciones en Firestore del proyecto **kodigo-grupo12**, en modo prueba.

```bash
cp apps/cuentame/.env.example apps/cuentame/.env
```

Llena los cinco valores desde Firebase console > Configuración del proyecto > General > Configuración web. El `.env` está en `.gitignore` y no se sube.

- La sincronización entre dispositivos es en tiempo real: el teléfono y el navegador ven lo mismo.
- Para el MVP con Expo Go no hace falta `google-services.json`; solo se necesita en builds nativas.
- La app arranca con la cuenta demo.

Las reglas de Firestore se prueban en el emulador (hace falta Java):

```bash
pnpm test:reglas
```

Esa suite es el gate junto al typecheck en el workflow `ci-pr`. No despliega nada.

### Reglas e índices de Firestore

Viven en `firestore.rules` y `firestore.indexes.json`. El único comando que las sube al proyecto `kodigo-grupo12` es:

```bash
make deploy-firestore
```

Envuelve `firebase deploy --only firestore:rules,firestore:indexes --project kodigo-grupo12`. Es manual: solo se corre con la orden explícita de Roberto, a más tardar el 2026-12-20. El CI no lo ejecuta. Mientras tanto las reglas se validan solo en el emulador (`pnpm test:reglas` usa `--project demo-cuentame`).

`.firebaserc` deja `kodigo-grupo12` como proyecto por defecto. Cualquier comando `firebase` sin `--project` apunta a producción.

## Estructura

```
apps/cuentame   la app (Expo, TypeScript)
make/           recetas del Makefile (doctor, dev, mobile, quality)
docs/           ADRs y guías para agentes
GLOSSARY.md     glosario del dominio
```
