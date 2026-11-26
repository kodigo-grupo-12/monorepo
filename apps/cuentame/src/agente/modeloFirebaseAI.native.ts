// En nativo el Agente no corre en este MVP: AI Logic en Android pide App
// Check con Play Integrity y la salida es solo web (ADR-0018). Metro resuelve
// este archivo en Android e iOS; el chat que llega aquí avisa y no llama a
// nada. El mensaje viaja por errores.ts en la pantalla.
import type { ModeloAgente } from './modelo';

export function crearModeloFirebaseAI(): ModeloAgente {
  return {
    async enviar() {
      throw new Error('Por ahora el Agente se usa en el navegador.');
    },
  };
}
