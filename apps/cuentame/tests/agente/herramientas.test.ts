import { describe, expect, it } from 'vitest';

import {
  diaConMasGasto,
  gastoDelMes,
  resolverCategoria,
  resumenIngresos,
  totalPorCategoria,
  type DatosAgente,
} from '../../src/agente/herramientas';

let contador = 0;
function transaccion(
  fecha: string,
  monto: number,
  opciones: { categoriaId?: string; tipo?: 'gasto' | 'ingreso' } = {},
) {
  contador += 1;
  return {
    id: `t${contador}`,
    tipo: opciones.tipo ?? 'gasto',
    monto,
    fecha,
    cuenta: 'demo',
    nota: 'no debe salir',
    ...(opciones.categoriaId === undefined ? {} : { categoria_id: opciones.categoriaId }),
  };
}

const CATEGORIAS = [
  { id: 'c1', nombre: 'Comida y bebida', tipo: 'gasto' },
  { id: 'c2', nombre: 'Transporte', tipo: 'gasto' },
  { id: 'c3', nombre: 'Otros gastos', tipo: 'gasto' },
  { id: 's1', nombre: 'Salario', tipo: 'ingreso' },
  { id: 's2', nombre: 'Otros ingresos', tipo: 'ingreso' },
] as const;

function datos(transacciones: ReturnType<typeof transaccion>[], hoy = '2026-11-26'): DatosAgente {
  return { transacciones: transacciones as DatosAgente['transacciones'], categorias: [...CATEGORIAS], hoy };
}

describe('resolverCategoria', () => {
  const base = datos([]);

  it('resuelve «comida» por prefijo y «TRANSPORTE» exacto sin tildes ni mayúsculas', () => {
    const comida = resolverCategoria(base, { texto: 'comida' });
    expect(comida).toEqual({ estado: 'una', categoria: { id: 'c1', nombre: 'Comida y bebida', tipo: 'gasto' } });
    expect(resolverCategoria(base, { texto: 'TRANSPORTE' })).toEqual({
      estado: 'una',
      categoria: { id: 'c2', nombre: 'Transporte', tipo: 'gasto' },
    });
    expect(resolverCategoria(base, { texto: 'transporté' }).estado).toBe('una');
  });

  it('devuelve varias candidatas cuando el texto es ambiguo y una con filtro de tipo', () => {
    const varias = resolverCategoria(base, { texto: 'otros' });
    expect(varias.estado).toBe('varias');
    if (varias.estado === 'varias') expect(varias.candidatas.map((c) => c.id)).toEqual(['c3', 's2']);
    const una = resolverCategoria(base, { texto: 'otros', tipo: 'ingreso' });
    expect(una).toEqual({ estado: 'una', categoria: { id: 's2', nombre: 'Otros ingresos', tipo: 'ingreso' } });
  });

  it('devuelve ninguna cuando no existe', () => {
    expect(resolverCategoria(base, { texto: 'viajes' })).toEqual({ estado: 'ninguna' });
  });
});

describe('totalPorCategoria', () => {
  it('el total del año en una categoría con transacciones de varios meses es exacto', () => {
    const base = datos([
      transaccion('2026-01-15', 10.25, { categoriaId: 'c1' }),
      transaccion('2026-03-02', 5.5, { categoriaId: 'c1' }),
      transaccion('2026-11-20', 4.25, { categoriaId: 'c1' }),
      transaccion('2026-06-10', 99, { categoriaId: 'c2' }),
      transaccion('2025-12-30', 500, { categoriaId: 'c1' }),
    ]);
    const total = totalPorCategoria(base, { categoriaId: 'c1', desde: '2026-01-01', hasta: '2026-12-31' });
    expect(total.total).toBe(20);
    expect(total.cantidad).toBe(3);
    expect(total.rango).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
  });

  it('0.1 + 0.2 + 0.3 suma 0.60 exacto', () => {
    const base = datos([
      transaccion('2026-11-01', 0.1, { categoriaId: 'c2' }),
      transaccion('2026-11-02', 0.2, { categoriaId: 'c2' }),
      transaccion('2026-11-03', 0.3, { categoriaId: 'c2' }),
    ]);
    expect(totalPorCategoria(base, { categoriaId: 'c2' }).total).toBe(0.6);
  });

  it('sin rango cuenta todo el historial', () => {
    const base = datos([transaccion('2020-01-01', 7, { categoriaId: 'c2' })]);
    const total = totalPorCategoria(base, { categoriaId: 'c2' });
    expect(total.total).toBe(7);
    expect(total.rango).toEqual({ desde: '0000-01-01', hasta: '2026-11-26' });
    expect(total.cobertura.antesDeLaPrimera).toBe(true);
  });
});

describe('diaConMasGasto', () => {
  const base = datos([
    transaccion('2026-11-10', 12, { categoriaId: 'c1' }),
    transaccion('2026-11-10', 7, { categoriaId: 'c2' }),
    transaccion('2026-11-10', 1, { categoriaId: 'c1' }),
    transaccion('2026-11-20', 20, { categoriaId: 'c2' }),
    transaccion('2026-11-25', 20, { categoriaId: 'c3' }),
  ]);

  it('el mayor gasto empatado devuelve todos los días empatados y el top 3 sin nota', () => {
    const empate = diaConMasGasto(base, { desde: '2026-11-01', hasta: '2026-11-26' });
    expect(empate.dias.map((dia) => dia.fecha)).toEqual(['2026-11-10', '2026-11-20', '2026-11-25']);
    expect(empate.dias.every((dia) => dia.total === 20)).toBe(true);
    expect(empate.mayores).toEqual([
      { monto: 12, categoria: 'Comida y bebida' },
      { monto: 7, categoria: 'Transporte' },
      { monto: 1, categoria: 'Comida y bebida' },
    ]);
  });

  it('los mayores salen solo del primer día empatado', () => {
    const resultado = diaConMasGasto(base, { desde: '2026-11-01', hasta: '2026-11-26' });
    expect(resultado.mayores.some((mayor) => mayor.monto === 20)).toBe(false);
  });

  it('sin gastos devuelve arreglos vacíos sin fallar', () => {
    const vacio = diaConMasGasto(datos([]), {});
    expect(vacio.dias).toEqual([]);
    expect(vacio.mayores).toEqual([]);
  });
});

describe('gastoDelMes', () => {
  it('sin mes usa el mes de hoy y desglosa por categoría de mayor a menor', () => {
    const base = datos([
      transaccion('2026-11-05', 30, { categoriaId: 'c1' }),
      transaccion('2026-11-15', 50, { categoriaId: 'c2' }),
      transaccion('2026-10-30', 1000, { categoriaId: 'c2' }),
      transaccion('2026-11-26', 15, { categoriaId: 'c1' }),
    ]);
    const mes = gastoDelMes(base, {});
    expect(mes.rango).toEqual({ desde: '2026-11-01', hasta: '2026-11-26' });
    expect(mes.total).toBe(95);
    expect(mes.cantidad).toBe(3);
    expect(mes.porCategoria).toEqual([
      { categoria: 'Transporte', total: 50 },
      { categoria: 'Comida y bebida', total: 45 },
    ]);
  });

  it('un mes pedido cap su fin en hoy cuando es el mes en curso', () => {
    const base = datos([transaccion('2026-11-20', 5, { categoriaId: 'c1' })]);
    const mes = gastoDelMes(base, { mes: '2026-11' });
    expect(mes.rango).toEqual({ desde: '2026-11-01', hasta: '2026-11-26' });
  });

  it('un mes pasado conserva su fin completo', () => {
    const base = datos([transaccion('2026-10-15', 5, { categoriaId: 'c1' })]);
    const mes = gastoDelMes(base, { mes: '2026-10' });
    expect(mes.rango).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(mes.total).toBe(5);
  });
});

describe('resumenIngresos', () => {
  it('sin ingresos devuelve ceros, mayor null y no falla', () => {
    const vacio = resumenIngresos(datos([]), {});
    expect(vacio.total).toBe(0);
    expect(vacio.cantidad).toBe(0);
    expect(vacio.mayor).toBeNull();
    expect(vacio.porCategoria).toEqual([]);
    expect(vacio.rango).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
  });

  it('con ingresos trae total, cantidad, desglose, el mayor y el período anterior de igual duración', () => {
    const base = datos([
      transaccion('2026-11-01', 300, { categoriaId: 's1', tipo: 'ingreso' }),
      transaccion('2026-11-10', 150, { categoriaId: 's1', tipo: 'ingreso' }),
      transaccion('2026-11-20', 50, { categoriaId: 's2', tipo: 'ingreso' }),
      transaccion('2026-10-15', 200, { categoriaId: 's1', tipo: 'ingreso' }),
      transaccion('2026-11-15', 999, { categoriaId: 'c1' }),
    ]);
    const resumen = resumenIngresos(base, { desde: '2026-11-01', hasta: '2026-11-30' });
    expect(resumen.total).toBe(500);
    expect(resumen.cantidad).toBe(3);
    expect(resumen.porCategoria).toEqual([
      { categoria: 'Salario', total: 450 },
      { categoria: 'Otros ingresos', total: 50 },
    ]);
    expect(resumen.mayor).toEqual({ monto: 300, categoria: 'Salario', fecha: '2026-11-01' });
    expect(resumen.anterior).toEqual({ rango: { desde: '2026-10-02', hasta: '2026-10-31' }, total: 200 });
  });
});

describe('cobertura', () => {
  it('un rango que empieza antes de la primera transacción levanta antesDeLaPrimera', () => {
    const base = datos([transaccion('2026-03-01', 5, { categoriaId: 'c1' })]);
    const total = totalPorCategoria(base, { categoriaId: 'c1', desde: '2026-01-01', hasta: '2026-12-31' });
    expect(total.cobertura.primeraFecha).toBe('2026-03-01');
    expect(total.cobertura.antesDeLaPrimera).toBe(true);
    expect(total.cobertura.consideradas).toBe(1);
  });

  it('las transacciones sin categoría se cuentan en sinCategoria', () => {
    const base = datos([
      transaccion('2026-11-01', 5),
      transaccion('2026-11-02', 5, { categoriaId: 'inexistente' }),
      transaccion('2026-11-03', 5, { categoriaId: 'c1' }),
    ]);
    const dia = diaConMasGasto(base, { desde: '2026-11-01', hasta: '2026-11-30' });
    expect(dia.cobertura.sinCategoria).toBe(2);
    expect(dia.mayores).toEqual([{ monto: 5, categoria: 'Sin categoría' }]);
  });
});

describe('privacidad: ningún resultado lleva notas ni adjuntos', () => {
  const base = datos([
    transaccion('2026-11-01', 5, { categoriaId: 'c1' }),
    transaccion('2026-11-02', 3, { categoriaId: 'c2' }),
    transaccion('2026-11-03', 2, { categoriaId: 's1', tipo: 'ingreso' }),
  ]);

  function clavesProhibidas(valor: unknown, camino = ''): string[] {
    if (Array.isArray(valor)) return valor.flatMap((elemento, i) => clavesProhibidas(elemento, `${camino}[${i}]`));
    if (valor !== null && typeof valor === 'object') {
      return Object.entries(valor as Record<string, unknown>).flatMap(([clave, hijo]) =>
        ['nota', 'imagen', 'foto'].includes(clave) ? [`${camino}.${clave}`] : clavesProhibidas(hijo, `${camino}.${clave}`),
      );
    }
    return [];
  }

  it('recorre el JSON de cada resultado completo', () => {
    const resultados = [
      resolverCategoria(base, { texto: 'comida' }),
      totalPorCategoria(base, { categoriaId: 'c1' }),
      diaConMasGasto(base, {}),
      gastoDelMes(base, {}),
      resumenIngresos(base, {}),
    ];
    for (const resultado of resultados) expect(clavesProhibidas(resultado)).toEqual([]);
  });
});
