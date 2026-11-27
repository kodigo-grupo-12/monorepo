import { describe, expect, it } from 'vitest';

import { enlaceWhatsApp, mensajeRecordatorio } from '../../apps/cuentame/src/compromisos/recordatorio';
import type { Compromiso } from '../../apps/cuentame/src/datos/compromisos';

const juan: Pick<Compromiso, 'contraparte' | 'naturaleza' | 'monto' | 'vence'> = {
  contraparte: 'Juan',
  naturaleza: 'dinero',
  monto: 30,
  vence: '2026-12-19',
};

describe('mensajeRecordatorio', () => {
  it('con el vencimiento ya pasado', () => {
    expect(mensajeRecordatorio(juan, 30, '2026-12-20')).toBe(
      'Hola Juan, te escribo por los $30.00 del préstamo, que vencían el 19 de diciembre. ¿Cuándo me los podés pasar? Gracias.',
    );
  });

  it('con vencimiento que todavía no llega', () => {
    expect(mensajeRecordatorio(juan, 30, '2026-12-19')).toBe(
      'Hola Juan, te recuerdo los $30.00 del préstamo para el 19 de diciembre. Gracias.',
    );
  });

  it('sin fecha de vencimiento', () => {
    expect(mensajeRecordatorio({ ...juan, vence: undefined }, 30, '2026-12-20')).toBe(
      'Hola Juan, te recuerdo los $30.00 del préstamo. Gracias.',
    );
  });

  it('una compra dice de la compra', () => {
    expect(mensajeRecordatorio({ ...juan, naturaleza: 'compra', vence: undefined }, 30, '2026-12-20')).toBe(
      'Hola Juan, te recuerdo los $30.00 de la compra. Gracias.',
    );
  });

  it('el monto es el pendiente, no el total', () => {
    expect(mensajeRecordatorio(juan, 12.5, '2026-12-20')).toContain('$12.50');
  });
});

describe('enlaceWhatsApp', () => {
  it('con teléfono arma wa.me con el número', () => {
    expect(enlaceWhatsApp('50371234567', 'Hola Juan')).toBe('https://wa.me/50371234567?text=Hola%20Juan');
  });

  it('sin teléfono deja que WhatsApp escoja el contacto', () => {
    expect(enlaceWhatsApp(undefined, 'Hola Juan')).toBe('https://wa.me/?text=Hola%20Juan');
  });
});
