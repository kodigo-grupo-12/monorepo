import { describe, expect, it } from 'vitest';

import {
  hoyEnElSalvador,
  mesCalendario,
  periodoAnterior,
  resolverPeriodo,
} from '../../apps/cuentame/src/agente/fechas';

describe('hoyEnElSalvador', () => {
  it('usa UTC-6 fijo: las 21:00 del 31 de diciembre en El Salvador son el 31 de diciembre de 2026', () => {
    expect(hoyEnElSalvador(new Date('2027-01-01T03:00:00Z'))).toBe('2026-12-31');
  });

  it('cambia de día a las 06:00 UTC (medianoche en El Salvador)', () => {
    expect(hoyEnElSalvador(new Date('2026-11-27T05:59:59Z'))).toBe('2026-11-26');
    expect(hoyEnElSalvador(new Date('2026-11-27T06:00:00Z'))).toBe('2026-11-27');
  });

  it('sin argumento devuelve texto AAAA-MM-DD', () => {
    expect(hoyEnElSalvador()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('resolverPeriodo', () => {
  it('con hoy 2026-12-31 devuelve cada rango del ticket', () => {
    expect(resolverPeriodo('hoy', '2026-12-31')).toEqual({ desde: '2026-12-31', hasta: '2026-12-31' });
    expect(resolverPeriodo('este_mes', '2026-12-31')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
    expect(resolverPeriodo('mes_pasado', '2026-12-31')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(resolverPeriodo('ultimo_mes', '2026-12-31')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(resolverPeriodo('este_anio', '2026-12-31')).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    expect(resolverPeriodo('todo', '2026-12-31')).toEqual({ desde: '0000-01-01', hasta: '2026-12-31' });
  });

  it('este_mes a fin de mes incompleto no incluye días que no llegaron', () => {
    expect(resolverPeriodo('este_mes', '2026-11-30')).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
  });

  it('el mes pasado cruza el cambio de año', () => {
    expect(resolverPeriodo('mes_pasado', '2026-01-15')).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });

  it('lanza con un periodo desconocido', () => {
    expect(() => resolverPeriodo('semana' as never, '2026-11-26')).toThrow(/Periodo desconocido/);
  });
});

describe('mesCalendario', () => {
  it('devuelve el primer y el último día del mes', () => {
    expect(mesCalendario('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(mesCalendario('2024-02')).toEqual({ desde: '2024-02-01', hasta: '2024-02-29' });
    expect(mesCalendario('2026-12')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
    expect(mesCalendario('2025-04')).toEqual({ desde: '2025-04-01', hasta: '2025-04-30' });
  });

  it('lanza con un mes que no tiene forma AAAA-MM', () => {
    expect(() => mesCalendario('2026-13')).toThrow(/Mes inválido/);
    expect(() => mesCalendario('marzo')).toThrow(/Mes inválido/);
  });
});

describe('periodoAnterior', () => {
  it('los 30 días de noviembre quedan como los 30 días que terminan el 31 de octubre', () => {
    expect(periodoAnterior({ desde: '2026-11-01', hasta: '2026-11-30' })).toEqual({
      desde: '2026-10-02',
      hasta: '2026-10-31',
    });
  });

  it('una ventana de 31 días arbitraria se recorre completa hacia atrás', () => {
    expect(periodoAnterior({ desde: '2026-10-27', hasta: '2026-11-26' })).toEqual({
      desde: '2026-09-26',
      hasta: '2026-10-26',
    });
  });

  it('un solo día queda el día anterior', () => {
    expect(periodoAnterior({ desde: '2026-03-05', hasta: '2026-03-05' })).toEqual({
      desde: '2026-03-04',
      hasta: '2026-03-04',
    });
  });

  it('cruza el cambio de año', () => {
    expect(periodoAnterior({ desde: '2026-01-01', hasta: '2026-01-31' })).toEqual({
      desde: '2025-12-01',
      hasta: '2025-12-31',
    });
  });
});
