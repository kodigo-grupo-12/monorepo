// Orquestador del Agente: hace el bucle de herramientas con tope de rondas,
// ejecuta las herramientas en el aparato y traduce los errores del modelo
// (spec #107). Al modelo solo llegan la pregunta, la conversación y los
// resultados de las herramientas: nunca la lista de transacciones, notas ni
// imágenes.

import { TOPE_RONDAS } from './config';
import { mensajeDeErrorDelAgente } from './errores';
import { hoyEnElSalvador, resolverPeriodo, type Periodo } from './fechas';
import {
  diaConMasGasto,
  gastoDelMes,
  resolverCategoria,
  resumenIngresos,
  totalPorCategoria,
  type DatosAgente,
} from './herramientas';
import { DECLARACIONES_HERRAMIENTAS } from './declaraciones';
import { INSTRUCCIONES_AGENTE } from './instrucciones';
import type { LlamadaHerramienta, MensajeAgente, ModeloAgente } from './modelo';

const MENSAJE_TOPE = 'No pude calcularlo con mis herramientas. Probá con una pregunta más concreta.';
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export type RespuestaPreguntar =
  | { tipo: 'esperando' }
  | { tipo: 'respuesta'; texto: string; historial: MensajeAgente[] };

function fechaValida(clave: 'desde' | 'hasta', valor: unknown): string | null {
  if (valor === undefined) {
    return null;
  }
  return typeof valor === 'string' && FORMATO_FECHA.test(valor)
    ? null
    : `La fecha ${clave} debe tener forma AAAA-MM-DD.`;
}

function idValido(valor: unknown): string | null {
  return typeof valor === 'string' && valor.length > 0 ? null : 'El id de la categoría debe ser un texto que salga de resolverCategoria.';
}

// Ejecuta una llamada de herramienta en el aparato. Una herramienta
// desconocida o con argumentos inválidos devuelve { error } como resultado,
// nunca lanza.
function ejecutarLlamada(datos: DatosAgente, hoy: string, llamada: LlamadaHerramienta): unknown {
  const argumentos: Record<string, unknown> = { ...(llamada.argumentos ?? {}) };
  // Las fechas relativas se resuelven aquí, con resolverPeriodo, antes de
  // llamar a la herramienta: el modelo nunca resuelve rangos.
  if (argumentos.periodo !== undefined) {
    try {
      const rango = resolverPeriodo(argumentos.periodo as Periodo, hoy);
      if (argumentos.desde === undefined) {
        argumentos.desde = rango.desde;
      }
      if (argumentos.hasta === undefined) {
        argumentos.hasta = rango.hasta;
      }
    } catch {
      return {
        error:
          'El periodo enviado no lo reconozco. Puedo usar hoy, este_mes, mes_pasado, ultimo_mes, este_anio o todo.',
      };
    }
    delete argumentos.periodo;
  }

  switch (llamada.nombre) {
    case 'resolverCategoria': {
      if (typeof argumentos.texto !== 'string' || argumentos.texto.trim() === '') {
        return { error: 'Falta el texto de la categoría para resolverla.' };
      }
      const tipo = argumentos.tipo;
      if (tipo !== undefined && tipo !== 'gasto' && tipo !== 'ingreso') {
        return { error: 'El tipo de categoría debe ser gasto o ingreso.' };
      }
      return resolverCategoria(datos, {
        texto: argumentos.texto,
        tipo: tipo as 'gasto' | 'ingreso' | undefined,
      });
    }
    case 'totalPorCategoria': {
      const fallo = idValido(argumentos.categoriaId) ?? fechaValida('desde', argumentos.desde) ?? fechaValida('hasta', argumentos.hasta);
      if (fallo) {
        return { error: fallo };
      }
      return totalPorCategoria(datos, {
        categoriaId: argumentos.categoriaId as string,
        desde: argumentos.desde as string | undefined,
        hasta: argumentos.hasta as string | undefined,
      });
    }
    case 'diaConMasGasto': {
      const fallo = idValido(argumentos.categoriaId ?? 'ok') ?? fechaValida('desde', argumentos.desde) ?? fechaValida('hasta', argumentos.hasta);
      if (fallo) {
        return { error: fallo };
      }
      return diaConMasGasto(datos, {
        categoriaId: argumentos.categoriaId as string | undefined,
        desde: argumentos.desde as string | undefined,
        hasta: argumentos.hasta as string | undefined,
      });
    }
    case 'gastoDelMes': {
      if (argumentos.mes !== undefined && (typeof argumentos.mes !== 'string' || !FORMATO_MES.test(argumentos.mes))) {
        return { error: 'El mes debe tener forma AAAA-MM, por ejemplo 2026-11.' };
      }
      const fallo = idValido(argumentos.categoriaId ?? 'ok');
      if (fallo) {
        return { error: fallo };
      }
      try {
        return gastoDelMes(datos, {
          mes: argumentos.mes as string | undefined,
          categoriaId: argumentos.categoriaId as string | undefined,
        });
      } catch (error) {
        return { error: (error as Error).message };
      }
    }
    case 'resumenIngresos': {
      const fallo = fechaValida('desde', argumentos.desde) ?? fechaValida('hasta', argumentos.hasta);
      if (fallo) {
        return { error: fallo };
      }
      return resumenIngresos(datos, {
        desde: argumentos.desde as string | undefined,
        hasta: argumentos.hasta as string | undefined,
      });
    }
    default:
      return {
        error:
          'No conozco esa herramienta. Las disponibles son resolverCategoria, totalPorCategoria, diaConMasGasto, gastoDelMes y resumenIngresos.',
      };
  }
}

export async function preguntar({
  pregunta,
  historial,
  datos,
  cargando,
  ahora,
  modelo,
}: {
  pregunta: string;
  historial: MensajeAgente[];
  datos: DatosAgente;
  cargando: boolean;
  ahora: Date;
  modelo: ModeloAgente;
}): Promise<RespuestaPreguntar> {
  if (cargando) {
    return { tipo: 'esperando' };
  }
  const hoy = hoyEnElSalvador(ahora);
  let mensajes: MensajeAgente[] = [...historial, { rol: 'persona', texto: pregunta }];
  let rondasUsadas = 0;
  while (true) {
    let respuesta;
    try {
      respuesta = await modelo.enviar({
        instrucciones: INSTRUCCIONES_AGENTE,
        herramientas: DECLARACIONES_HERRAMIENTAS,
        mensajes,
      });
    } catch (error) {
      // El error traducido también es un mensaje del Agente en el historial:
      // si no, la pantalla no pinta nada y el fallo queda invisible (#https://github.com/kodigo-grupo-12/monorepo/issues/159).
      const mensaje = mensajeDeErrorDelAgente(error);
      return {
        tipo: 'respuesta',
        texto: mensaje,
        historial: [...mensajes, { rol: 'modelo', texto: mensaje }],
      };
    }
    if (respuesta.tipo === 'texto') {
      return {
        tipo: 'respuesta',
        texto: respuesta.texto,
        historial: [...mensajes, { rol: 'modelo', texto: respuesta.texto }],
      };
    }
    if (rondasUsadas >= TOPE_RONDAS) {
      return {
        tipo: 'respuesta',
        texto: MENSAJE_TOPE,
        historial: [...mensajes, { rol: 'modelo', texto: MENSAJE_TOPE }],
      };
    }
    rondasUsadas += 1;
    const resultados = respuesta.llamadas.map((llamada) => ({
      id: llamada.id,
      nombre: llamada.nombre,
      resultado: ejecutarLlamada(datos, hoy, llamada),
    }));
    mensajes = [...mensajes, { rol: 'modelo', llamadas: respuesta.llamadas }, { rol: 'herramienta', resultados }];
  }
}
