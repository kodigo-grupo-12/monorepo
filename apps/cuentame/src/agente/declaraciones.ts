// Las 5 herramientas que el modelo puede pedir (T011, #113). Las
// descripciones van en español: son lo que Gemini lee para decidir qué
// llamar. Las categorías siempre pasan por categoriaId, que sale de
// resolver_categoria, y los rangos por periodo o por desde/hasta.

export interface DeclaracionParametro {
  type: 'string';
  description: string;
  enum?: string[];
}

export interface Declaracion {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, DeclaracionParametro>;
    required?: string[];
  };
}

const PERIODOS = ['hoy', 'este_mes', 'mes_pasado', 'ultimo_mes', 'este_anio', 'todo'];
const PARAMETROS_FECHA = {
  periodo: {
    type: 'string',
    description: 'Rango como período: hoy, este_mes, mes_pasado, ultimo_mes, este_anio o todo.',
    enum: PERIODOS,
  },
  desde: { type: 'string', description: 'Inicio del rango como AAAA-MM-DD, si no se usa periodo.' },
  hasta: { type: 'string', description: 'Fin del rango como AAAA-MM-DD, si no se usa periodo.' },
} satisfies Record<string, DeclaracionParametro>;

export const DECLARACIONES_HERRAMIENTAS: Declaracion[] = [
  {
    name: 'resolver_categoria',
    description:
      'Convierte el nombre de una categoría escrito por la persona («comida», «transporte») en la categoría exacta con su id. Llámala SIEMPRE primero cuando la pregunta mencione una categoría por su nombre y usa el id que devuelve en las demás herramientas.',
    parameters: {
      type: 'object',
      properties: {
        texto: { type: 'string', description: 'La categoría tal como la escribió la persona.' },
        tipo: { type: 'string', description: 'Opcional: limita la búsqueda a gasto o a ingreso.', enum: ['gasto', 'ingreso'] },
      },
      required: ['texto'],
    },
  },
  {
    name: 'total_por_categoria',
    description:
      'Total gastado en una categoría dentro de un rango. Sin rango, cuenta todo el historial. Devuelve el total, cuántas transacciones entraron, el rango usado y la cobertura.',
    parameters: {
      type: 'object',
      properties: {
        categoriaId: { type: 'string', description: 'El id que devolvió resolver_categoria.' },
        ...PARAMETROS_FECHA,
      },
      required: ['categoriaId'],
    },
  },
  {
    name: 'dia_con_mas_gasto',
    description:
      'El día con más gasto dentro de un rango, opcionalmente de una sola categoría. Devuelve todos los días empatados con el mayor total y las 3 transacciones más grandes del primero, con monto y nombre de categoría.',
    parameters: { type: 'object', properties: { categoriaId: { type: 'string', description: 'Opcional: el id de resolver_categoria.' }, ...PARAMETROS_FECHA } },
  },
  {
    name: 'gasto_del_mes',
    description:
      'Gasto de un mes calendario; sin mes, el mes actual. Devuelve el total, la cantidad y el desglose por categoría, de mayor a menor.',
    parameters: {
      type: 'object',
      properties: {
        mes: { type: 'string', description: 'El mes como AAAA-MM; si falta, se usa el mes actual.' },
        categoriaId: { type: 'string', description: 'Opcional: el id de resolver_categoria.' },
      },
    },
  },
  {
    name: 'resumen_ingresos',
    description:
      'Resumen de ingresos de un rango; por defecto el último mes completo. Devuelve el total, la cantidad, el desglose por categoría, el ingreso mayor y el total del período anterior de igual duración.',
    parameters: { type: 'object', properties: PARAMETROS_FECHA },
  },
];
