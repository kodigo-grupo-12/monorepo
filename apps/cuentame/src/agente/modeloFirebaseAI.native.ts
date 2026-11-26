import type { ModeloAgente } from './modelo';

// El Agente solo se usa en web (spec #107): en Android no hay cerebro
// todavía y la implementación nativa avisa en vez de llamar a nada.
export function crearModeloFirebaseAI(): ModeloAgente {
  return {
    async enviar() {
      throw new Error('Por ahora el Agente se usa en el navegador.');
    },
  };
}
