// Las 5 declaraciones de herramientas para el modelo, con descripciones en
// español (spec #107). Los rangos van por periodo (el enum de
// resolverPeriodo) o por desde/hasta; la categoría va por categoriaId, que
// sale de resolverCategoria.

export type EsquemaTexto = { type: 'STRING'; description?: string; enum?: string[] };

export interface DeclaracionHerramienta {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, EsquemaTexto>;
    required?: string[];
  };
}

const PERIODOS = ['hoy', 'este_mes', 'mes_pasado', 'ultimo_mes', 'este_anio', 'todo'];

function esquemaPeriodo(): EsquemaTexto {
  return {
    type: 'STRING',
    description: 'Rango opcional. Sin periodo ni fechas se usa todo el historial.',
    enum: PERIODOS,
  };
}

export const DECLARACIONES_HERRAMIENTAS: DeclaracionHerramienta[] = [
  {
    name: 'resolverCategoria',
    description:
      'Resuelve el nombre de una categoría que menciona la persona: devuelve una coincidencia, varias candidatas o ninguna. Llámala primero, antes de cualquier herramienta que pida categoriaId.',
    parameters: {
      type: 'OBJECT',
      properties: {
        texto: {
          type: 'STRING',
          description: 'La categoría como la dijo la persona, por ejemplo «comida» o «Transporte».',
        },
        tipo: { type: 'STRING', description: 'Opcional: limita la búsqueda a gasto o ingreso.', enum: ['gasto', 'ingreso'] },
      },
      required: ['texto'],
    },
  },
  {
    name: 'totalPorCategoria',
    description: 'Cuánto se gastó en total en una categoría (solo gastos) y en cuántas transacciones.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoriaId: { type: 'STRING', description: 'Id de la categoría, que sale de resolverCategoria.' },
        periodo: esquemaPeriodo(),
        desde: { type: 'STRING', description: 'Opcional: fecha inicial AAAA-MM-DD, alternativa a periodo.' },
        hasta: { type: 'STRING', description: 'Opcional: fecha final AAAA-MM-DD, alternativa a periodo.' },
      },
      required: ['categoriaId'],
    },
  },
  {
    name: 'diaConMasGasto',
    description:
      'El día o los días con más gasto (si empatan, todos) y las 3 transacciones más grandes de ese día, por monto y categoría.',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoriaId: { type: 'STRING', description: 'Opcional: id de la categoría, que sale de resolverCategoria.' },
        periodo: esquemaPeriodo(),
        desde: { type: 'STRING', description: 'Opcional: fecha inicial AAAA-MM-DD, alternativa a periodo.' },
        hasta: { type: 'STRING', description: 'Opcional: fecha final AAAA-MM-DD, alternativa a periodo.' },
      },
    },
  },
  {
    name: 'gastoDelMes',
    description: 'Cuánto se gastó en un mes calendario, con el desglose por categoría de mayor a menor.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mes: { type: 'STRING', description: 'Mes AAAA-MM opcional; si falta, el mes de hoy.' },
        categoriaId: { type: 'STRING', description: 'Opcional: id de la categoría, que sale de resolverCategoria.' },
      },
    },
  },
  {
    name: 'resumenIngresos',
    description:
      'Resumen de los ingresos de un rango: total, cantidad, desglose por categoría, el ingreso mayor y el mismo rango del período anterior.',
    parameters: {
      type: 'OBJECT',
      properties: {
        periodo: esquemaPeriodo(),
        desde: { type: 'STRING', description: 'Opcional: fecha inicial AAAA-MM-DD, alternativa a periodo.' },
        hasta: { type: 'STRING', description: 'Opcional: fecha final AAAA-MM-DD, alternativa a periodo.' },
      },
    },
  },
];
