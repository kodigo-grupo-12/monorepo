import { describe, expect, it } from 'vitest';

import type { Categoria, TipoCategoria } from '../../apps/cuentame/src/datos/categorias';
import type { Transaccion } from '../../apps/cuentame/src/datos/transacciones';
import {
  diaConMasGasto,
  gastoDelMes,
  resolverCategoria,
  resumenIngresos,
  totalPorCategoria,
  type DatosAgente,
} from '../../apps/cuentame/src/agente/herramientas';

const CATEGORIAS: Categoria[] = [
  { id: 'c-comida', nombre: 'Comida y bebida', tipo: 'gasto' },
  { id: 'c-transporte', nombre: 'Transporte', tipo: 'gasto' },
  { id: 'c-compras', nombre: 'Compras', tipo: 'gasto' },
  { id: 'c-educacion', nombre: 'Educación', tipo: 'gasto' },
  { id: 'c-otros-gastos', nombre: 'Otros gastos', tipo: 'gasto' },
  { id: 'c-salario', nombre: 'Salario', tipo: 'ingreso' },
  { id: 'c-otros-ingresos', nombre: 'Otros ingresos', tipo: 'ingreso' },
];

let consecutivo = 0;
function tx(
  tipo: 'gasto' | 'ingreso',
  monto: number,
  fecha: string,
  categoriaId?: string,
  extra: Partial<Transaccion> = {},
): Transaccion {
  consecutivo += 1;
  return { id: `t${consecutivo}`, uid: 'u1', tipo, monto, fecha, categoria_id: categoriaId, ...extra };
}

function datos(transacciones: Transaccion[], hoy = '2026-11-26'): DatosAgente {
  return { transacciones, categorias: CATEGORIAS, hoy };
}

describe('totalPorCategoria', () => {
  const transacciones = [
    tx('gasto', 10.1, '2026-01-10', 'c-comida'),
    tx('gasto', 20.2, '2026-03-05', 'c-comida'),
    tx('gasto', 0.3, '2026-11-01', 'c-comida'),
    tx('gasto', 99, '2026-02-02', 'c-transporte'),
    tx('ingreso', 500, '2026-02-02', 'c-salario'),
  ];

  it('el total del año en una categoría con transacciones de varios meses es exacto', () => {
    const resultado = totalPorCategoria(datos(transacciones), {
      categoriaId: 'c-comida',
      desde: '2026-01-01',
      hasta: '2026-12-31',
    });
    expect(resultado.total).toBe(30.6);
    expect(resultado.cantidad).toBe(3);
  });

  it('sin rango usa todo el historial', () => {
    const resultado = totalPorCategoria(datos(transacciones), { categoriaId: 'c-comida' });
    expect(resultado.total).toBe(30.6);
    expect(resultado.rango).toEqual({ desde: '0000-01-01', hasta: '2026-11-26' });
  });

  it('0.1 + 0.2 + 0.3 suma 0.60 exacto', () => {
    const resultado = totalPorCategoria(
      datos([
        tx('gasto', 0.1, '2026-01-01', 'c-comida'),
        tx('gasto', 0.2, '2026-01-02', 'c-comida'),
        tx('gasto', 0.3, '2026-01-03', 'c-comida'),
      ]),
      { categoriaId: 'c-comida' },
    );
    expect(resultado.total).toBe(0.6);
  });

  it('fuera del rango no suma', () => {
    const resultado = totalPorCategoria(datos(transacciones), {
      categoriaId: 'c-comida',
      desde: '2026-03-01',
      hasta: '2026-03-31',
    });
    expect(resultado.total).toBe(20.2);
    expect(resultado.cantidad).toBe(1);
  });
});

describe('diaConMasGasto', () => {
  const transacciones = [
    tx('gasto', 50, '2026-03-10', 'c-comida'),
    tx('gasto', 30, '2026-03-10', 'c-transporte'),
    tx('gasto', 20, '2026-03-10', 'c-compras'),
    tx('gasto', 15, '2026-03-10', 'c-otros-gastos'),
    tx('gasto', 100, '2026-05-02', 'c-compras'),
    tx('gasto', 15, '2026-05-02', 'c-transporte'),
    tx('gasto', 20, '2026-02-01', 'c-comida'),
  ];

  it('con empate devuelve todos los días empatados y las 3 más grandes sin nota', () => {
    const resultado = diaConMasGasto(datos(transacciones), {});
    expect(resultado.dias).toEqual([
      { fecha: '2026-03-10', total: 115 },
      { fecha: '2026-05-02', total: 115 },
    ]);
    expect(resultado.mayores).toEqual([
      { monto: 50, categoria: 'Comida y bebida' },
      { monto: 30, categoria: 'Transporte' },
      { monto: 20, categoria: 'Compras' },
    ]);
    expect(resultado.rango).toEqual({ desde: '0000-01-01', hasta: '2026-11-26' });
  });

  it('filtra por categoría y por rango', () => {
    const resultado = diaConMasGasto(datos(transacciones), {
      categoriaId: 'c-compras',
      desde: '2026-04-01',
      hasta: '2026-05-31',
    });
    expect(resultado.dias).toEqual([{ fecha: '2026-05-02', total: 100 }]);
    expect(resultado.mayores).toEqual([{ monto: 100, categoria: 'Compras' }]);
  });

  it('sin gastos devuelve listas vacías sin fallar', () => {
    const resultado = diaConMasGasto(datos([tx('ingreso', 10, '2026-01-01', 'c-salario')]), {});
    expect(resultado.dias).toEqual([]);
    expect(resultado.mayores).toEqual([]);
  });
});

describe('gastoDelMes', () => {
  const transacciones = [
    tx('gasto', 100, '2026-11-03', 'c-comida'),
    tx('gasto', 50, '2026-11-10', 'c-comida'),
    tx('gasto', 30, '2026-11-15', 'c-transporte'),
    tx('ingreso', 400, '2026-11-01', 'c-salario'),
    tx('gasto', 70, '2026-10-05', 'c-comida'),
  ];

  it('por defecto suma el mes de hoy y desglosa por categoría de mayor a menor', () => {
    const resultado = gastoDelMes(datos(transacciones), {});
    expect(resultado.total).toBe(180);
    expect(resultado.cantidad).toBe(3);
    expect(resultado.porCategoria).toEqual([
      { categoria: 'Comida y bebida', total: 150 },
      { categoria: 'Transporte', total: 30 },
    ]);
    expect(resultado.rango).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
  });

  it('acepta un mes distinto al de hoy', () => {
    const resultado = gastoDelMes(datos(transacciones), { mes: '2026-10' });
    expect(resultado.total).toBe(70);
    expect(resultado.rango).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
  });

  it('sin gastos en el mes devuelve ceros', () => {
    const resultado = gastoDelMes(datos(transacciones), { mes: '2025-01' });
    expect(resultado.total).toBe(0);
    expect(resultado.cantidad).toBe(0);
    expect(resultado.porCategoria).toEqual([]);
  });
});

describe('resumenIngresos', () => {
  const transacciones = [
    tx('ingreso', 200, '2026-09-20', 'c-salario'),
    tx('ingreso', 300, '2026-10-15', 'c-salario'),
    tx('ingreso', 50, '2026-10-20', 'c-otros-ingresos'),
    tx('ingreso', 400, '2026-11-01', 'c-salario'),
    tx('ingreso', 25, '2026-11-10', 'c-otros-ingresos'),
    tx('gasto', 30, '2026-11-05', 'c-comida'),
  ];

  it('por defecto usa el mes calendario anterior completo y trae desglose, mayor y el período anterior de igual duración', () => {
    const resultado = resumenIngresos(datos(transacciones), {});
    expect(resultado.rango).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(resultado.total).toBe(350);
    expect(resultado.cantidad).toBe(2);
    expect(resultado.porCategoria).toEqual([
      { categoria: 'Salario', total: 300 },
      { categoria: 'Otros ingresos', total: 50 },
    ]);
    expect(resultado.mayor).toEqual({ monto: 300, categoria: 'Salario', fecha: '2026-10-15' });
    expect(resultado.anterior).toEqual({ rango: { desde: '2026-08-31', hasta: '2026-09-30' }, total: 200 });
  });

  it('con rango propio respeta desde/hasta', () => {
    const resultado = resumenIngresos(datos(transacciones), {
      desde: '2026-10-01',
      hasta: '2026-10-31',
    });
    expect(resultado.total).toBe(350);
    expect(resultado.cantidad).toBe(2);
    expect(resultado.mayor).toEqual({ monto: 300, categoria: 'Salario', fecha: '2026-10-15' });
  });

  it('sin ingresos devuelve ceros, cobertura y mayor nulo sin fallar', () => {
    const resultado = resumenIngresos(datos([tx('gasto', 10, '2026-11-01', 'c-comida')]), {
      desde: '2026-11-01',
      hasta: '2026-11-30',
    });
    expect(resultado.total).toBe(0);
    expect(resultado.cantidad).toBe(0);
    expect(resultado.porCategoria).toEqual([]);
    expect(resultado.mayor).toBeNull();
    expect(resultado.anterior.total).toBe(0);
    expect(resultado.cobertura.consideradas).toBe(1);
  });
});

describe('resolverCategoria', () => {
  it('resuelve «comida» y «TRANSPORTE» sin tildes ni mayúsculas', () => {
    const una = resolverCategoria(datos([]), { texto: 'comida' });
    expect(una.estado).toBe('una');
    if (una.estado === 'una') {
      expect(una.categoria).toEqual({ id: 'c-comida', nombre: 'Comida y bebida', tipo: 'gasto' });
    }
    expect(resolverCategoria(datos([]), { texto: 'TRANSPORTE' }).estado).toBe('una');
    expect(resolverCategoria(datos([]), { texto: 'EDUCACION' }).estado).toBe('una');
  });

  it('devuelve varias candidatas cuando el texto es ambiguo', () => {
    const varias = resolverCategoria(datos([]), { texto: 'otros' });
    expect(varias.estado).toBe('varias');
    if (varias.estado === 'varias') {
      expect(varias.candidatas.map((c) => c.nombre)).toEqual(['Otros gastos', 'Otros ingresos']);
    }
  });

  it('devuelve ninguna cuando la categoría no existe', () => {
    expect(resolverCategoria(datos([]), { texto: 'pizza' }).estado).toBe('ninguna');
  });

  it('respeta el filtro por tipo', () => {
    const resultado = resolverCategoria(datos([]), { texto: 'otros', tipo: 'ingreso' });
    expect(resultado.estado).toBe('una');
    if (resultado.estado === 'una') {
      expect(resultado.categoria.id).toBe('c-otros-ingresos');
    }
  });
});

describe('cobertura', () => {
  const transacciones = [
    tx('gasto', 10, '2026-03-01', 'c-comida'),
    tx('gasto', 5, '2026-04-01'),
    tx('gasto', 7, '2026-04-02', 'c-inexistente'),
    tx('ingreso', 400, '2026-04-03', 'c-salario'),
  ];

  it('un rango que empieza antes de la primera transacción levanta antesDeLaPrimera', () => {
    const resultado = totalPorCategoria(datos(transacciones), {
      categoriaId: 'c-comida',
      desde: '2026-01-01',
      hasta: '2026-04-30',
    });
    expect(resultado.cobertura.antesDeLaPrimera).toBe(true);
    expect(resultado.cobertura.primeraFecha).toBe('2026-03-01');
  });

  it('las transacciones sin categoría se cuentan en sinCategoria y consideradas mira todo el rango', () => {
    const resultado = diaConMasGasto(datos(transacciones), {
      desde: '2026-04-01',
      hasta: '2026-04-30',
    });
    expect(resultado.cobertura).toEqual({
      consideradas: 3,
      primeraFecha: '2026-03-01',
      sinCategoria: 2,
      antesDeLaPrimera: false,
    });
  });

  it('sin transacciones la cobertura queda nula sin fallar', () => {
    const resultado = totalPorCategoria(datos([]), { categoriaId: 'c-comida' });
    expect(resultado.cobertura).toEqual({
      consideradas: 0,
      primeraFecha: null,
      sinCategoria: 0,
      antesDeLaPrimera: false,
    });
    expect(resultado.total).toBe(0);
  });
});

describe('privacidad', () => {
  it('ningún resultado contiene las claves nota, imagen ni foto', () => {
    const datosCompletos = datos([
      tx('gasto', 10, '2026-11-01', 'c-comida', { nota: 'pupusas', imagen: 'base64' }),
      tx('ingreso', 400, '2026-11-01', 'c-salario', { nota: 'salario' }),
    ]);
    const resultados: unknown[] = [
      resolverCategoria(datosCompletos, { texto: 'comida' }),
      totalPorCategoria(datosCompletos, { categoriaId: 'c-comida' }),
      diaConMasGasto(datosCompletos, {}),
      gastoDelMes(datosCompletos, {}),
      resumenIngresos(datosCompletos, {}),
    ];
    for (const resultado of resultados) {
      const json = JSON.stringify(resultado);
      const revisar = (valor: unknown): void => {
        if (Array.isArray(valor)) {
          valor.forEach(revisar);
          return;
        }
        if (valor && typeof valor === 'object') {
          for (const [clave, contenido] of Object.entries(valor)) {
            expect(['nota', 'imagen', 'foto', 'categoria_id', 'cartera_id']).not.toContain(clave);
            revisar(contenido);
          }
        }
      };
      revisar(JSON.parse(json));
    }
  });
});

describe('tipos de la suite', () => {
  it('CATEGORIAS y tx compilan con los tipos reales de datos/', () => {
    const tipo: TipoCategoria = 'gasto';
    const transaccion: Transaccion = tx(tipo, 1, '2026-01-01', 'c-comida');
    expect(transaccion.fecha).toBe('2026-01-01');
  });
});
