import type { Declaracion } from './declaraciones';

// Contrato propio del modelo (T011, #114): el orquestador hace el bucle
// de herramientas, no el SDK, para poder contar rondas y probar sin red.
// Una llamada puede volver a pedir herramientas o responder texto.

export interface LlamadaHerramienta {
  id?: string;
  nombre: string;
  argumentos: Record<string, unknown>;
}

export type MensajeAgente =
  | { rol: 'persona'; texto: string }
  | { rol: 'modelo'; texto: string }
  | { rol: 'modelo'; llamadas: LlamadaHerramienta[]; crudo?: unknown }
  | { rol: 'herramienta'; resultados: { id?: string; nombre: string; resultado: unknown }[] };

export type RespuestaModelo =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramientas'; llamadas: LlamadaHerramienta[]; crudo?: unknown };

export interface PeticionAlModelo {
  instrucciones: string;
  herramientas: Declaracion[];
  mensajes: MensajeAgente[];
}

export interface ModeloAgente {
  enviar(peticion: PeticionAlModelo): Promise<RespuestaModelo>;
}
