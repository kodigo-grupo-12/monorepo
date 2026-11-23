# Una sola app Expo

El ADR-0001 de `kodigo-grupo-12/documentacion` ya fijó una app Expo para Android y web, con pnpm y Turborepo. Aquí esa app es un solo paquete, `apps/cuentame`. Android y web ejecutan el mismo código. Lo que no se comparte va en un archivo de plataforma, no en un segundo paquete.

Se consideró un paquete para Android, otro para web y un tercero compartido. Comparte menos código y obliga a mantener dos arranques. Se descartó.
