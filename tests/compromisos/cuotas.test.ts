import { describe, expect, it } from 'vitest';

import {
  atrasoDePlan,
  cuotasDe,
  fechaDeCuota,
  montosDeCuotas,
  montoRompeElPlan,
  proximaCuota,
} from '../../apps/cuentame/src/compromisos/cuotas';
import { estadoDe, proximosVencimientos } from '../../apps/cuentame/src/compromisos/calculos';
import type { Compromiso, Plan } from '../../apps/cuentame/src/datos/compromisos';
import type { Transaccion } from '../../apps/cuentame/src/datos/transacciones';

const refri: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 24, dia: 19, primera: '2026-12' };

function compromiso(extra: Partial<Compromiso> = {}): Compromiso {
  return {
    id: 'refri',
    direccion: 'debo',
    naturaleza: 'compra',
    contraparte: 'Simán',
    monto: 480,
    fecha: '2026-11-20',
    plan: refri,
    ...extra,
  };
}

function abono(monto: number, fecha: string, compromisoId = 'refri'): Transaccion {
  return {
    id: `a-${monto}-${fecha}`,
    tipo: 'gasto',
    monto,
    fecha,
    compromiso_id: compromisoId,
    rol: 'abono',
  };
}

describe('fechaDeCuota', () => {
  it('la refri vence el 19 desde dic 2026 hasta nov 2028', () => {
    expect(fechaDeCuota(refri, 1)).toBe('2026-12-19');
    expect(fechaDeCuota(refri, 24)).toBe('2028-11-19');
  });

  it('el día 31 cae en el último día de los meses cortos y el mes siguiente vuelve al 31', () => {
    const dia31: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 4, dia: 31, primera: '2027-01' };
    expect(fechaDeCuota(dia31, 1)).toBe('2027-01-31');
    expect(fechaDeCuota(dia31, 2)).toBe('2027-02-28');
    expect(fechaDeCuota(dia31, 3)).toBe('2027-03-31');
    expect(fechaDeCuota(dia31, 4)).toBe('2027-04-30');
    const bisiesto: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 2, dia: 31, primera: '2028-01' };
    expect(fechaDeCuota(bisiesto, 2)).toBe('2028-02-29');
    const treinta: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 2, dia: 30, primera: '2026-12' };
    expect(fechaDeCuota(treinta, 1)).toBe('2026-12-30');
    expect(fechaDeCuota(treinta, 2)).toBe('2027-01-30');
  });
});

describe('montosDeCuotas', () => {
  it('la refri de 480 en 24 cuotas de 20 vale 20 cada una', () => {
    expect(montosDeCuotas(480, refri)).toEqual(Array(24).fill(20));
  });

  it('un total que no divide exacto deja la diferencia en la última y suma el total exacto', () => {
    const montos = montosDeCuotas(500, { ...refri, cuota: 20.83 });
    expect(montos[23]).toBeCloseTo(20.91, 2);
    expect(Math.round(montos.reduce((a, b) => a + b, 0) * 100)).toBe(50000);
  });

  it('lanza el error exacto si la última cuota no da', () => {
    expect(() => montosDeCuotas(500, { ...refri, cuota: 25 })).toThrow(
      'La última cuota no puede ser 0 o negativa',
    );
  });

  it('el modo variable no tiene montos de cuota', () => {
    expect(() =>
      montosDeCuotas(300, { modo: 'variable', numero_cuotas: 3, dia: 19, primera: '2026-12' }),
    ).toThrow();
  });
});

describe('cuotasDe', () => {
  it('sin plan no hay cuotas', () => {
    expect(cuotasDe(compromiso({ plan: undefined }), [], '2026-12-01')).toEqual([]);
  });

  it('fijo: el total abonado cae en cascada y la cuota sin cubrir vencida queda atrasada', () => {
    const cuotas = cuotasDe(
      compromiso(),
      [abono(20, '2026-12-15'), abono(15, '2027-01-10')],
      '2027-01-25',
    );
    expect(cuotas[0]).toMatchObject({
      numero: 1,
      vence: '2026-12-19',
      esperado: 20,
      referencia: 20,
      pagado: 20,
      estado: 'pagada',
      diasAtraso: 37,
    });
    expect(cuotas[1]).toMatchObject({
      numero: 2,
      vence: '2027-01-19',
      esperado: 20,
      pagado: 15,
      estado: 'atrasada',
      diasAtraso: 6,
    });
    expect(cuotas[2]).toMatchObject({ estado: 'pendiente', pagado: 0, diasAtraso: 0 });
    expect(proximaCuota(cuotas)?.numero).toBe(2);
  });

  it('fijo: pagar de más adelanta las siguientes', () => {
    const cuotas = cuotasDe(compromiso(), [abono(50, '2026-12-15')], '2027-01-25');
    expect(cuotas[0].estado).toBe('pagada');
    expect(cuotas[1].estado).toBe('pagada');
    expect(cuotas[2]).toMatchObject({ estado: 'parcial', pagado: 10 });
  });

  it('variable: cada abono cae en la cuota de su ventana y la referencia es monto ÷ n', () => {
    const compromisoVariable = compromiso({
      monto: 300,
      plan: { modo: 'variable', numero_cuotas: 3, dia: 19, primera: '2026-12' },
    });
    const cuotas = cuotasDe(
      compromisoVariable,
      [abono(90, '2026-12-10'), abono(120, '2027-01-25')],
      '2027-01-26',
    );
    expect(cuotas[0]).toMatchObject({
      numero: 1,
      esperado: null,
      referencia: 100,
      pagado: 90,
      estado: 'pagada',
    });
    expect(cuotas[1]).toMatchObject({
      numero: 2,
      estado: 'atrasada',
      diasAtraso: 7,
      pagado: 0,
      referencia: 100,
    });
    expect(cuotas[2]).toMatchObject({ numero: 3, pagado: 120, estado: 'pagada' });
  });

  it('atrasoDePlan es el de la cuota atrasada más vieja', () => {
    expect(
      atrasoDePlan(compromiso(), [abono(20, '2026-12-15'), abono(15, '2027-01-10')], '2027-01-25'),
    ).toBe(6);
  });
});

describe('estadoDe y proximosVencimientos con plan', () => {
  it('vencido con una cuota atrasada y cerrado al llegar al total', () => {
    const c = compromiso();
    expect(
      estadoDe(c, [abono(20, '2026-12-15'), abono(15, '2027-01-10')], '2027-01-25'),
    ).toBe('vencido');
    expect(estadoDe(c, [abono(480, '2026-12-15')], '2027-01-25')).toBe('cerrado');
  });

  it('sin plan no cambia: el vencido sigue viniendo de vence', () => {
    const simple = compromiso({
      plan: undefined,
      naturaleza: 'dinero',
      precio_contado: undefined,
      vence: '2026-12-01',
    });
    expect(estadoDe(simple, [], '2027-01-25')).toBe('vencido');
  });

  it('proximosVencimientos trae la cuota atrasada con «Cuota k de n»', () => {
    const c = compromiso();
    const vencimientos = proximosVencimientos(
      [c],
      [abono(20, '2026-12-15'), abono(15, '2027-01-10')],
      '2027-01-25',
      7,
    );
    expect(vencimientos).toHaveLength(1);
    expect(vencimientos[0]).toMatchObject({
      situacion: 'atrasado',
      fecha: '2027-01-19',
      pendiente: 5,
      diasAtraso: 6,
      numero: 2,
      totalCuotas: 24,
    });
  });

  it('la próxima cuota entra cuando vence dentro de la ventana', () => {
    const c = compromiso();
    const vencimientos = proximosVencimientos(
      [c],
      [abono(20, '2026-12-15'), abono(15, '2027-01-10')],
      '2027-02-14',
      7,
    );
    expect(vencimientos).toHaveLength(2);
    expect(vencimientos[0]).toMatchObject({ numero: 2, situacion: 'atrasado' });
    expect(vencimientos[1]).toMatchObject({
      numero: 3,
      situacion: 'proximo',
      fecha: '2027-02-19',
      pendiente: 20,
    });
  });
});

describe('montoRompeElPlan', () => {
  const fijo12: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 12, dia: 19, primera: '2026-12' };
  const variable: Plan = { modo: 'variable', numero_cuotas: 12, dia: 19, primera: '2026-12' };
  const fijo1: Plan = { modo: 'fijo', cuota: 20, numero_cuotas: 1, dia: 19, primera: '2026-12' };

  it('monto 200 con cuota 20 y 12 cuotas deja la última en -20: rompe', () => {
    expect(montoRompeElPlan(fijo12, 200)).toBe(true);
  });

  it('el límite exacto (220 deja la última en 0) también rompe', () => {
    expect(montoRompeElPlan(fijo12, 220)).toBe(true);
  });

  it('monto 221 deja la última cuota en 1.00: no rompe', () => {
    expect(montoRompeElPlan(fijo12, 221)).toBe(false);
  });

  it('un plan variable nunca rompe y una sola cuota con monto positivo tampoco', () => {
    expect(montoRompeElPlan(variable, 5)).toBe(false);
    expect(montoRompeElPlan(fijo1, 5)).toBe(false);
  });
});
