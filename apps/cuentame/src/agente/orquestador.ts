import { DECLARACIONES_HERRAMIENTAS } from './declaraciones';
import {
  diaConMasGasto,
  gastoDelMes,
  resolverCategoria,
  resumenIngresos,
  totalPorCategoria,
  type DatosAgente,
} from './herramientas';
import { hoyEnElSalvador, resolverPeriodo, type Periodo } from './fechas';
import { INSTRUCCIONES_AGENTE } from './instrucciones';
import { mensajeDeErrorDelAgente } from './errores';
import type { LlamadaHerramienta, MensajeAgente, ModeloAgente } from './modelo';
import { TOPE_RONDAS } from './config';

// El orquestador del Agente (T011, #114): traduce la pregunta, ejecuta las
// herramientas en el aparato y le devuelve los resultados al modelo. Al
// modelo solo le llegan la pregunta, la conversación y los resultados:
// nunca la lista de transacciones.

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ES_MES = /^\d{4}-\d{2}$/;

export interface PeticionOrquestador {
  pregunta: string;
  historial: MensajeAgente[];
  datos: Omit<DatosAgente, 'hoy'>;
  cargando: boolean;
  ahora: Date;
  modelo: ModeloAgente;
}

export type RespuestaOrquestador =
  | { tipo: 'esperando' }
  | { tipo: 'respuesta'; texto: string; historial: MensajeAgente[] };

function rangoDe(argumentos: Record<string, unknown>): { periodo?: Periodo; desde?: string; hasta?: string } | string {
  const periodo = argumentos.periodo;
  if (periodo !== undefined) {
    if (typeof periodo !== 'string' || !PERIODOS_VALIDOS.includes(periodo as Periodo)) {
      return 'El período no es válido.';
    }
    return { periodo: periodo as Periodo };
  }
  const desde = argumentos.desde;
  const hasta = argumentos.hasta;
  if (desde !== undefined && (typeof desde !== 'string' || !ES_FECHA.test(desde))) return 'La fecha desde debe ser AAAA-MM-DD.';
  if (hasta !== undefined && (typeof hasta !== 'string' || !ES_FECHA.test(hasta))) return 'La fecha hasta debe ser AAAA-MM-DD.';
  return { desde: desde as string | undefined, hasta: hasta as string | undefined };
}

const PERIODOS_VALIDOS: Periodo[] = ['hoy', 'este_mes', 'mes_pasado', 'ultimo_mes', 'este_anio', 'todo'];

function textoOpcional(argumentos: Record<string, unknown>, clave: string): string | undefined | string {
  const valor = argumentos[clave];
  if (valor === undefined) return undefined;
  if (typeof valor !== 'string' || valor.trim() === '') return `El campo ${clave} debe ser texto.`;
  return valor;
}

function categoriaIdDe(argumentos: Record<string, unknown>): string | string {
  const valor = argumentos.categoriaId;
  if (typeof valor !== 'string' || valor.trim() === '') return 'Falta el id de la categoría: llamá primero a resolver_categoria.';
  return valor;
}

// Cada llamada se ejecuta en el aparato. Un argumento inválido devuelve
// un error en español como resultado, no lanza: el modelo puede corregir.
function ejecutarLlamada(datos: DatosAgente, llamada: LlamadaHerramienta): unknown {
  const argumentos = llamada.argumentos ?? {};
  switch (llamada.nombre) {
    case 'resolver_categoria': {
      const texto = textoOpcional(argumentos, 'texto');
      if (typeof texto !== 'string') return { error: texto };
      const tipo = argumentos.tipo;
      if (tipo !== undefined && tipo !== 'gasto' && tipo !== 'ingreso') return { error: 'El tipo debe ser gasto o ingreso.' };
      return resolverCategoria(datos, { texto, tipo: tipo as 'gasto' | 'ingreso' | undefined });
    }
    case 'total_por_categoria': {
      const categoriaId = categoriaIdDe(argumentos);
      if (typeof categoriaId !== 'string') return { error: categoriaId };
      const rango = rangoDe(argumentos);
      if (typeof rango !== 'string' && typeof rango.periodo === 'string') {
        const { desde, hasta } = resolverPeriodo(rango.periodo, datos.hoy);
        return totalPorCategoria(datos, { categoriaId, desde, hasta });
      }
      if (typeof rango === 'string') return { error: rango };
      return totalPorCategoria(datos, { categoriaId, desde: rango.desde, hasta: rango.hasta });
    }
    case 'dia_con_mas_gasto': {
      const categoria = textoOpcional(argumentos, 'categoriaId');
      if (typeof categoria !== 'string' && categoria !== undefined) return { error: categoria };
      const rango = rangoDe(argumentos);
      if (typeof rango === 'string') return { error: rango };
      if (typeof rango.periodo === 'string') {
        const { desde, hasta } = resolverPeriodo(rango.periodo, datos.hoy);
        return diaConMasGasto(datos, { categoriaId: categoria, desde, hasta });
      }
      return diaConMasGasto(datos, { categoriaId: categoria, desde: rango.desde, hasta: rango.hasta });
    }
    case 'gasto_del_mes': {
      const mes = textoOpcional(argumentos, 'mes');
      if (typeof mes !== 'string' && mes !== undefined) return { error: mes };
      if (mes !== undefined && !ES_MES.test(mes)) return { error: 'El mes debe ser AAAA-MM.' };
      const categoria = textoOpcional(argumentos, 'categoriaId');
      if (typeof categoria !== 'string' && categoria !== undefined) return { error: categoria };
      return gastoDelMes(datos, { mes, categoriaId: categoria });
    }
    case 'resumen_ingresos': {
      const rango = rangoDe(argumentos);
      if (typeof rango === 'string') return { error: rango };
      if (typeof rango.periodo === 'string') {
        const { desde, hasta } = resolverPeriodo(rango.periodo, datos.hoy);
        return resumenIngresos(datos, { desde, hasta });
      }
      return resumenIngresos(datos, { desde: rango.desde, hasta: rango.hasta });
    }
    default:
      return { error: 'No reconozco esa herramienta.' };
  }
}

export async function preguntar(peticion: PeticionOrquestador): Promise<RespuestaOrquestador> {
  if (peticion.cargando) return { tipo: 'esperando' };
  const hoy = hoyEnElSalvador(peticion.ahora);
  const datos: DatosAgente = { ...peticion.datos, hoy };
  const conversacion: MensajeAgente[] = [...peticion.historial, { rol: 'persona', texto: peticion.pregunta }];
  try {
    for (let ronda = 0; ; ronda++) {
      const respuesta = await peticion.modelo.enviar({
        instrucciones: INSTRUCCIONES_AGENTE,
        herramientas: DECLARACIONES_HERRAMIENTAS,
        // Copia del momento: el modelo no debe ver rondas futuras.
        mensajes: [...conversacion],
      });
      if (respuesta.tipo === 'texto') {
        return {
          tipo: 'respuesta',
          texto: respuesta.texto,
          historial: [...conversacion, { rol: 'modelo', texto: respuesta.texto }],
        };
      }
      // El tope mide las rondas de herramientas EJECUTADAS: el modelo
      // recibe las 4 rondas de resultados y, si vuelve a pedir
      // herramientas después de eso, recibe el mensaje de tope.
      if (ronda >= TOPE_RONDAS) break;
      conversacion.push({ rol: 'modelo', llamadas: respuesta.llamadas, crudo: respuesta.crudo });
      const resultados = respuesta.llamadas.map((llamada) => {
        let resultado: unknown;
        try {
          resultado = ejecutarLlamada(datos, llamada);
        } catch {
          resultado = { error: 'No pude ejecutar esa herramienta.' };
        }
        return { id: llamada.id, nombre: llamada.nombre, resultado };
      });
      conversacion.push({ rol: 'herramienta', resultados });
    }
    const texto = 'No pude calcularlo con mis herramientas. Probá con una pregunta más concreta.';
    return { tipo: 'respuesta', texto, historial: [...conversacion, { rol: 'modelo', texto }] };
  } catch (error) {
    return { tipo: 'respuesta', texto: mensajeDeErrorDelAgente(error), historial: conversacion };
  }
}
