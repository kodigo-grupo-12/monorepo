// Interfaz de modelo del Agente: solo tipos. El orquestador hace el bucle de
// herramientas; cualquier implementación (Firebase AI Logic en web, la
// variante nativa o un modelo falso de prueba) cumple esta interfaz.

import type { DECLARACIONES_HERRAMIENTAS } from './declaraciones';

export interface LlamadaHerramienta {
  id?: string;
  nombre: string;
  argumentos: Record<string, unknown>;
}

export type MensajeAgente =
  | { rol: 'persona'; texto: string }
  | { rol: 'modelo'; texto: string }
  | { rol: 'modelo'; llamadas: LlamadaHerramienta[] }
  | { rol: 'herramienta'; resultados: { id?: string; nombre: string; resultado: unknown }[] };

export type RespuestaModelo =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'herramientas'; llamadas: LlamadaHerramienta[] };

export interface PeticionAlModelo {
  instrucciones: string;
  herramientas: typeof DECLARACIONES_HERRAMIENTAS;
  mensajes: MensajeAgente[];
}

export interface ModeloAgente {
  enviar(peticion: PeticionAlModelo): Promise<RespuestaModelo>;
}
