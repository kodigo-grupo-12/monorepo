import { describe, expect, it } from 'vitest';

import {
  contraparteValida,
  normalizarTelefono,
} from '../../apps/cuentame/src/compromisos/contraparte';

describe('normalizarTelefono', () => {
  it('8 dígitos llevan 503 adelante', () => {
    expect(normalizarTelefono('7123-4567')).toBe('50371234567');
  });

  it('más de 8 dígitos quedan tal cual, sin espacios ni signos', () => {
    expect(normalizarTelefono('+1 (555) 123-4567')).toBe('15551234567');
  });

  it('vacío da undefined y un teléfono corto lanza', () => {
    expect(normalizarTelefono('')).toBeUndefined();
    expect(() => normalizarTelefono('123')).toThrow('Teléfono inválido');
  });
});

describe('contraparteValida', () => {
  it('de 1 a 60 caracteres después de recortar', () => {
    expect(contraparteValida('Juan')).toBe(true);
    expect(contraparteValida('  ')).toBe(false);
    expect(contraparteValida('a'.repeat(61))).toBe(false);
    expect(contraparteValida('a'.repeat(60))).toBe(true);
  });
});
