import { describe, expect, it } from 'vitest';

import {
  COLECCION_COMPROMISOS,
  cambiosTransaccion,
  documentoNuevoCompromiso,
} from '../../apps/cuentame/src/datos/consultas';

const UID = 'persona-a';

function datos(extra: Record<string, unknown> = {}) {
  return {
    direccion: 'me_deben',
    naturaleza: 'dinero',
    contraparte: '  Juan  ',
    monto: 50,
    fecha: '2026-11-26',
    ...extra,
  };
}

describe('documentoNuevoCompromiso', () => {
  it('pone el uid, recorta la contraparte y no escribe cierre, global ni indefinidos', () => {
    const documento = documentoNuevoCompromiso(datos() as never, UID);
    expect(documento.uid).toBe(UID);
    expect(documento.contraparte).toBe('Juan');
    expect(documento).not.toHaveProperty('cierre');
    expect(documento).not.toHaveProperty('global');
    expect(documento).not.toHaveProperty('telefono');
    expect(documento).not.toHaveProperty('vence');
    expect(documento).not.toHaveProperty('plan');
  });

  it('con cierre en los datos de entrada igual no lo escribe', () => {
    const documento = documentoNuevoCompromiso(datos({ cierre: 'perdonado' }) as never, UID);
    expect(documento).not.toHaveProperty('cierre');
  });

  it('los campos opcionales que llegan sí se copian', () => {
    const documento = documentoNuevoCompromiso(
      datos({ telefono: '50371234567', nota: 'refri' }) as never,
      UID,
    );
    expect(documento.telefono).toBe('50371234567');
    expect(documento.nota).toBe('refri');
  });

  it('la constante de la colección es compromisos', () => {
    expect(COLECCION_COMPROMISOS).toBe('compromisos');
  });
});

describe('cambiosTransaccion', () => {
  it('nunca lleva compromiso_id, rol ni neutral, aunque lleguen en los datos', () => {
    const cambios = cambiosTransaccion({
      tipo: 'gasto',
      monto: 10,
      fecha: '2026-11-26',
      compromiso_id: 'c1',
      rol: 'origen',
      neutral: true,
    } as never);
    expect(cambios).not.toHaveProperty('compromiso_id');
    expect(cambios).not.toHaveProperty('rol');
    expect(cambios).not.toHaveProperty('neutral');
  });
});
