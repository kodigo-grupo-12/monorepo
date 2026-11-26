import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import type { Content, FunctionDeclaration } from 'firebase/ai';

import { firebase } from '../datos/firebase';
import { MODELO_AGENTE } from './config';
import type { MensajeAgente, ModeloAgente } from './modelo';
import type { Declaracion } from './declaraciones';

// El cerebro real del Agente en web (T011, #115): Gemini por Firebase
// AI Logic con el backend Gemini Developer API (capa gratis). Sin llave
// propia: la config pública del proyecto basta. La interfaz es la propia
// del orquestador (modelo.ts), no el modo automático del SDK, para poder
// contar rondas y probar sin red.

function contenidoDe(mensajes: MensajeAgente[]) {
  return mensajes.map((mensaje) => {
    if (mensaje.rol === 'persona') return { role: 'user', parts: [{ text: mensaje.texto }] };
    if (mensaje.rol === 'modelo') {
      if ('texto' in mensaje) return { role: 'model', parts: [{ text: mensaje.texto }] };
      // El API exige devolver el turno del modelo con sus thoughtSignature
      // (rechazado en vivo con 400 el 2026-11-26): si el SDK dio partes
      // crudas se devuelven tal cual; si no, se reconstruye desde llamadas.
      if ('crudo' in mensaje && mensaje.crudo) {
        return { role: 'model', parts: mensaje.crudo as Content['parts'] };
      }
      return {
        role: 'model',
        parts: mensaje.llamadas.map((llamada) => ({
          functionCall: { name: llamada.nombre, args: llamada.argumentos, id: llamada.id },
        })),
      };
    }
    // Gemini Developer API no acepta el rol 'function' (rechazado en vivo
    // con 400 el 2026-11-26): las respuestas de herramientas salen con rol
    // 'user' y sus partes functionResponse.
    return {
      role: 'user',
      parts: mensaje.resultados.map((r) => ({
        functionResponse: { id: r.id, name: r.nombre, response: { resultado: r.resultado } },
      })),
    };
  });
}

export function crearModeloFirebaseAI(): ModeloAgente {
  const ai = getAI(firebase, { backend: new GoogleAIBackend() });
  const modelo = getGenerativeModel(ai, { model: MODELO_AGENTE });
  return {
    async enviar({ instrucciones, herramientas, mensajes }) {
      // Las declaraciones del orquestador son JSON puro; el SDK pide su
      // propio tipo Schema, equivalente. Un solo cast en la frontera.
      const peticion = {
        contents: contenidoDe(mensajes) as Content[],
        systemInstruction: instrucciones,
        tools: [{ functionDeclarations: herramientas as unknown as FunctionDeclaration[] }],
      };
      const respuesta = await modelo.generateContent(peticion);
      const partes = respuesta.response.candidates?.[0]?.content?.parts ?? [];
      const llamadas = respuesta.response.functionCalls() ?? [];
      if (llamadas.length > 0) {
        return {
          tipo: 'herramientas',
          crudo: partes,
          llamadas: llamadas.map((llamada) => ({
            id: llamada.id,
            nombre: llamada.name,
            argumentos: (llamada.args ?? {}) as Record<string, unknown>,
          })),
        };
      }
      let texto = '';
      try {
        texto = respuesta.response.text();
      } catch {
        texto = '';
      }
      if (texto.trim() === '') texto = 'El Agente no pudo responder ahora. Intentá de nuevo.';
      return { tipo: 'texto', texto };
    },
  };
}

// Se espera en otro módulo: el tipo Declaracion vive en declaraciones.ts.
export type { Declaracion };
