import { describe, expect, it } from 'vitest';

import {
  abonadoDe,
  abonosDe,
  diasDeAtraso,
  esMovimientoReal,
  notaDeAbono,
  notaDeOrigen,
  estaAbierto,
  estadoDe,
  pendienteDe,
  resumenCompromisos,
} from '../../apps/cuentame/src/compromisos/calculos';
import type { Compromiso } from '../../apps/cuentame/src/datos/compromisos';
import type { Transaccion } from '../../apps/cuentame/src/datos/transacciones';

const HOY = '2026-11-26';

function compromiso(extra: Partial<Compromiso> = {}): Compromiso {
  return {
    id: 'c1',
    direccion: 'me_deben',
    naturaleza: 'dinero',
    contraparte: 'Juan',
    monto: 50,
    fecha: '2026-11-01',
    ...extra,
  };
}

function transaccion(extra: Partial<Transaccion> = {}): Transaccion {
  return { id: 't1', tipo: 'gasto', monto: 10, fecha: '2026-11-20', ...extra };
}

describe('esMovimientoReal', () => {
  it('un movimiento neutral no es real y el resto sí', () => {
    expect(esMovimientoReal(transaccion({ neutral: true }))).toBe(false);
    expect(esMovimientoReal(transaccion({ neutral: false }))).toBe(true);
    expect(esMovimientoReal(transaccion())).toBe(true);
  });
});

describe('abonosDe y abonadoDe', () => {
  it('trae solo los abonos del compromiso, del más viejo al más nuevo, y el origen no cuenta', () => {
    const transacciones = [
      transaccion({ id: 'origen', compromiso_id: 'c1', rol: 'origen', monto: 50 }),
      transaccion({ id: 'b2', compromiso_id: 'c1', rol: 'abono', tipo: 'ingreso', monto: 30, fecha: '2026-11-25' }),
      transaccion({ id: 'b1', compromiso_id: 'c1', rol: 'abono', tipo: 'ingreso', monto: 20, fecha: '2026-11-15' }),
      transaccion({ id: 'otro', compromiso_id: 'c2', rol: 'abono', tipo: 'ingreso', monto: 99 }),
    ];
    const abonos = abonosDe('c1', transacciones);
    expect(abonos.map((abono) => abono.id)).toEqual(['b1', 'b2']);
    expect(abonadoDe('c1', transacciones)).toBeCloseTo(50, 2);
  });

  it('abonos de 0.1, 0.2 y 0.3 suman 0.60 exacto', () => {
    const transacciones = [0.1, 0.2, 0.3].map((monto, indice) =>
      transaccion({
        id: `b${indice}`,
        compromiso_id: 'c1',
        rol: 'abono',
        tipo: 'ingreso',
        monto,
      }),
    );
    expect(abonadoDe('c1', transacciones)).toBe(0.6);
  });
});

describe('pendienteDe y estadoDe', () => {
  it('con 20 y 30 abonados el pendiente es 0 y el estado cerrado', () => {
    const transacciones = [20, 30].map((monto, indice) =>
      transaccion({
        id: `b${indice}`,
        compromiso_id: 'c1',
        rol: 'abono',
        tipo: 'ingreso',
        monto,
      }),
    );
    expect(pendienteDe(compromiso(), transacciones)).toBe(0);
    expect(estadoDe(compromiso(), transacciones, HOY)).toBe('cerrado');
  });

  it('con 20 abonados el pendiente es 30 y el estado activo', () => {
    const transacciones = [transaccion({ compromiso_id: 'c1', rol: 'abono', tipo: 'ingreso', monto: 20 })];
    expect(pendienteDe(compromiso(), transacciones)).toBe(30);
    expect(estadoDe(compromiso(), transacciones, HOY)).toBe('activo');
  });

  it('con vence pasado y pendiente el estado es vencido y los días de atraso cuadran', () => {
    const c = compromiso({ vence: '2026-11-20' });
    expect(estadoDe(c, [], HOY)).toBe('vencido');
    expect(diasDeAtraso('2026-11-20', HOY)).toBe(6);
  });

  it('un vencimiento futuro no vence y sin vence tampoco', () => {
    expect(estadoDe(compromiso({ vence: '2026-11-27' }), [], HOY)).toBe('activo');
    expect(estadoDe(compromiso(), [], HOY)).toBe('activo');
  });

  it('el cierre manda aunque haya pendiente', () => {
    expect(estadoDe(compromiso({ cierre: 'perdonado' }), [], HOY)).toBe('perdonado');
    expect(estadoDe(compromiso({ cierre: 'cancelado', vence: '2026-11-01' }), [], HOY)).toBe('cancelado');
  });

  it('diasDeAtraso da 0 si hoy no es mayor que desde', () => {
    expect(diasDeAtraso('2026-11-26', HOY)).toBe(0);
    expect(diasDeAtraso('2026-11-27', HOY)).toBe(0);
  });
});

describe('estaAbierto', () => {
  it('activo y vencido están abiertos; cerrado, perdonado y cancelado no', () => {
    expect(estaAbierto('activo')).toBe(true);
    expect(estaAbierto('vencido')).toBe(true);
    expect(estaAbierto('cerrado')).toBe(false);
    expect(estaAbierto('perdonado')).toBe(false);
    expect(estaAbierto('cancelado')).toBe(false);
  });
});

describe('resumenCompromisos', () => {
  it('suma solo los abiertos por dirección y cuenta los vencidos', () => {
    const juan = compromiso({ id: 'juan', monto: 50, vence: '2026-11-20' });
    const pedro = compromiso({ id: 'pedro', monto: 10 });
    const ana = compromiso({ id: 'ana', direccion: 'debo', monto: 30 });
    const cerrado = compromiso({ id: 'cerrado', monto: 15, cierre: 'cancelado', direccion: 'debo' });
    const abonos = [transaccion({ id: 'b1', compromiso_id: 'juan', rol: 'abono', tipo: 'ingreso', monto: 20 })];
    const resumen = resumenCompromisos([juan, pedro, ana, cerrado], abonos, HOY);
    expect(resumen.meDeben).toBeCloseTo(40, 2);
    expect(resumen.debo).toBeCloseTo(30, 2);
    expect(resumen.vencidos).toBe(1);
  });
});

describe('notas de origen y abono', () => {
  it('da las cuatro frases exactas', () => {
    expect(notaDeOrigen({ direccion: 'me_deben', contraparte: 'Juan' })).toBe('Préstamo a Juan');
    expect(notaDeOrigen({ direccion: 'debo', contraparte: 'Ana' })).toBe('Préstamo de Ana');
    expect(notaDeAbono({ direccion: 'me_deben', contraparte: 'Juan' })).toBe('Cobro de Juan');
    expect(notaDeAbono({ direccion: 'debo', contraparte: 'Ana' })).toBe('Pago a Ana');
  });
});
