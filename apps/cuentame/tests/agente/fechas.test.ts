import { describe, expect, it } from 'vitest';

import { hoyEnElSalvador, mesCalendario, periodoAnterior, resolverPeriodo } from '../../src/agente/fechas';

describe('hoyEnElSalvador', () => {
  it('usa UTC-6 fijo: 2027-01-01T03:00Z es el 31 de diciembre de 2026 en El Salvador', () => {
    expect(hoyEnElSalvador(new Date('2027-01-01T03:00:00Z'))).toBe('2026-12-31');
  });

  it('al mediodía local el día no cambia', () => {
    expect(hoyEnElSalvador(new Date('2026-11-26T18:00:00Z'))).toBe('2026-11-26');
  });
});

describe('resolverPeriodo', () => {
  const hoy = '2026-12-31';

  it('hoy es un rango de un solo día', () => {
    expect(resolverPeriodo('hoy', hoy)).toEqual({ desde: '2026-12-31', hasta: '2026-12-31' });
  });

  it('este_mes arranca el día 1 del mes de hoy (diciembre)', () => {
    expect(resolverPeriodo('este_mes', hoy)).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });

  it('mes_pasado y ultimo_mes son el mes calendario anterior completo', () => {
    expect(resolverPeriodo('mes_pasado', hoy)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(resolverPeriodo('ultimo_mes', '2026-03-15')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
  });

  it('en enero el mes anterior es diciembre del año pasado', () => {
    expect(resolverPeriodo('ultimo_mes', '2027-01-05')).toEqual({ desde: '2026-12-01', hasta: '2026-12-31' });
  });

  it('este_anio es del 1 de enero a hoy (2026 con hoy en diciembre de 2026)', () => {
    expect(resolverPeriodo('este_anio', '2026-12-31')).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
  });

  it('todo arranca en 0000-01-01', () => {
    expect(resolverPeriodo('todo', hoy)).toEqual({ desde: '0000-01-01', hasta: hoy });
  });
});

describe('mesCalendario', () => {
  it('devuelve febrero de año bisiesto con 29 días', () => {
    expect(mesCalendario('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });

  it('devuelve febrero normal con 28 días y meses de 30 y 31', () => {
    expect(mesCalendario('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(mesCalendario('2026-04')).toEqual({ desde: '2026-04-01', hasta: '2026-04-30' });
    expect(mesCalendario('2026-07')).toEqual({ desde: '2026-07-01', hasta: '2026-07-31' });
  });
});

describe('periodoAnterior', () => {
  it('de una semana devuelve la semana inmediata anterior, de igual duración', () => {
    expect(periodoAnterior({ desde: '2026-11-16', hasta: '2026-11-22' })).toEqual({ desde: '2026-11-09', hasta: '2026-11-15' });
  });

  it('de un tramo suelto de 10 días devuelve los 10 días previos', () => {
    expect(periodoAnterior({ desde: '2026-11-11', hasta: '2026-11-20' })).toEqual({ desde: '2026-11-01', hasta: '2026-11-10' });
  });

  it('cruza el cambio de año', () => {
    expect(periodoAnterior({ desde: '2027-01-01', hasta: '2027-01-07' })).toEqual({ desde: '2026-12-25', hasta: '2026-12-31' });
  });
});
