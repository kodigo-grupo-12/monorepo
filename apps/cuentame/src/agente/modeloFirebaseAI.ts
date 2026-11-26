// Implementación web del modelo del Agente sobre Firebase AI Logic con
// GoogleAIBackend (Gemini Developer API, capa gratis, plan Spark) por el SDK
// firebase/ai que ya trae firebase@13.4.0 (spec #107, ADR-0018). Manda la
// conversación completa en cada generateContent y devuelve los functionCalls
// como llamadas de herramienta: el bucle lo hace el orquestador, no el modo
// automático del SDK. No inicializa App Check: queda fuera solo del MVP.
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  type Content,
  type FunctionDeclaration,
} from 'firebase/ai';

import { firebase } from '../datos/firebase';
import { MODELO_AGENTE } from './config';
import { DECLARACIONES_HERRAMIENTAS } from './declaraciones';
import type { MensajeAgente, ModeloAgente, RespuestaModelo } from './modelo';

// functionResponse pide response como objeto: lo que no sea objeto va
// envuelto en { resultado }.
function respuestaDeHerramienta(resultado: unknown): Record<string, unknown> {
  if (resultado && typeof resultado === 'object' && !Array.isArray(resultado)) {
    return resultado as Record<string, unknown>;
  }
  return { resultado };
}

function contenidoDe(mensajes: MensajeAgente[]): Content[] {
  return mensajes.map((mensaje) => {
    if (mensaje.rol === 'persona') {
      return { role: 'user', parts: [{ type: 'text' as const, text: mensaje.texto }] };
    }
    if (mensaje.rol === 'herramienta') {
      return {
        role: 'function',
        parts: mensaje.resultados.map((resultado) => ({
          type: 'functionResponse' as const,
          functionResponse: {
            id: resultado.id,
            name: resultado.nombre,
            response: respuestaDeHerramienta(resultado.resultado),
          },
        })),
      };
    }
    if ('texto' in mensaje) {
      return { role: 'model', parts: [{ type: 'text' as const, text: mensaje.texto }] };
    }
    return {
      role: 'model',
      parts: mensaje.llamadas.map((llamada) => ({
        type: 'functionCall' as const,
        functionCall: { id: llamada.id, name: llamada.nombre, args: llamada.argumentos },
      })),
    };
  });
}

export function crearModeloFirebaseAI(): ModeloAgente {
  const ai = getAI(firebase, { backend: new GoogleAIBackend() });
  const modelo = getGenerativeModel(ai, { model: MODELO_AGENTE });
  return {
    async enviar({ instrucciones, herramientas, mensajes }): Promise<RespuestaModelo> {
      const r = await modelo.generateContent({
        contents: contenidoDe(mensajes),
        systemInstruction: instrucciones,
        tools: [{ functionDeclarations: herramientas as unknown as FunctionDeclaration[] }],
      });
      const llamadas = r.response.functionCalls() ?? [];
      if (llamadas.length > 0) {
        return {
          tipo: 'herramientas',
          llamadas: llamadas.map((llamada) => ({
            id: llamada.id,
            nombre: llamada.name,
            argumentos: (llamada.args ?? {}) as Record<string, unknown>,
          })),
        };
      }
      return { tipo: 'texto', texto: r.response.text() };
    },
  };
}
