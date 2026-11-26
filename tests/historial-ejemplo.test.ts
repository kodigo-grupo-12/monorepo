import { describe, expect, it } from 'vitest';

import {
  generarHistorialEjemplo,
  necesitaArranque,
} from '../apps/cuentame/src/datos/historialEjemplo';

const HOY = '2026-11-26';
const UID = 'persona-ejemplo';

// Las 14 categorías de producción, con los ids que el marcador crea sobre una
// base vacía (produccion-<slug>).
const CATEGORIAS = [
  ['Comida y bebida', 'gasto'], ['Transporte', 'gasto'], ['Compras', 'gasto'],
  ['Educación', 'gasto'], ['Entretenimiento', 'gasto'], ['Facturas y servicios', 'gasto'],
  ['Familia', 'gasto'], ['Salud', 'gasto'], ['Invertir', 'gasto'], ['Otros gastos', 'gasto'],
  ['Salario', 'ingreso'], ['Otros ingresos', 'ingreso'],
  ['Transferencia entrante', 'ingreso'], ['Recolectar intereses', 'ingreso'],
].map(([nombre, tipo]) => ({ id: `prod-${nombre.toLowerCase().replace(/\s+/g, '-')}`, nombre, tipo }));

function historial(uid: string = UID, hoy: string = HOY) {
  return generarHistorialEjemplo({ uid, hoy, categorias: CATEGORIAS });
}

describe('generarHistorialEjemplo (puro)', () => {
  it('dado el mismo uid y el mismo hoy devuelve exactamente lo mismo: 173 transacciones, 3 carteras e ids semilla en orden', () => {
    const primera = historial();
    const segunda = historial();
    expect(JSON.stringify(primera)).toBe(JSON.stringify(segunda));
    expect(primera.transacciones.length).toBe(173);
    expect(primera.carteras.map((cartera) => cartera.nombre)).toEqual(['Efectivo', 'Banco', 'Tarjeta']);
    for (const cartera of primera.carteras) {
      expect(cartera.uid).toBe(UID);
    }
    primera.transacciones.forEach((transaccion, indice) => {
      expect(transaccion.id).toBe(`semilla-${UID}-${String(indice + 1).padStart(3, '0')}`);
      expect(transaccion.uid).toBe(UID);
    });
  });

  it('otra cuenta con el mismo hoy ve otro historial, también determinista', () => {
    const primera = historial('otra-persona');
    const segunda = historial('otra-persona');
    expect(JSON.stringify(primera)).toBe(JSON.stringify(segunda));
    expect(JSON.stringify(primera.transacciones.map((t) => [t.fecha, t.monto]))).not.toBe(
      JSON.stringify(historial().transacciones.map((t) => [t.fecha, t.monto])),
    );
  });

  it('las fechas quedan dentro de los últimos 12 meses y ninguna cae a futuro', () => {
    for (const hoy of ['2026-11-26', '2027-01-05', '2026-03-20']) {
      const { transacciones } = historial(UID, hoy);
      const [anho, mes] = hoy.split('-').map(Number);
      const inicio = new Date(Date.UTC(anho, mes - 1 - 11, 1)).toISOString().slice(0, 10);
      for (const transaccion of transacciones) {
        expect(transaccion.fecha >= inicio).toBe(true);
        expect(transaccion.fecha <= hoy).toBe(true);
      }
    }
  });

  it('el día pico es único, es de Comida y bebida, hace 3 meses y suma 541.75', () => {
    const { transacciones } = historial();
    // La garantía es sobre gasto: el día pico es el de más gasto del año.
    const sumaPorDia = new Map<string, number>();
    for (const transaccion of transacciones) {
      if (transaccion.tipo !== 'gasto') {
        continue;
      }
      sumaPorDia.set(transaccion.fecha, (sumaPorDia.get(transaccion.fecha) ?? 0) + transaccion.monto);
    }
    const diasSobre400 = [...sumaPorDia.entries()].filter(([, suma]) => suma > 400);
    expect(diasSobre400.length).toBe(1);
    const [fechaPico, sumaPico] = diasSobre400[0];
    expect(sumaPico).toBeCloseTo(541.75, 2);
    const [anho, mes] = HOY.split('-').map(Number);
    expect(fechaPico).toBe(new Date(Date.UTC(anho, mes - 1 - 3, 15)).toISOString().slice(0, 10));
    const delPico = transacciones.filter((transaccion) => transaccion.fecha === fechaPico);
    expect(delPico.length).toBe(3);
    for (const transaccion of delPico) {
      expect(transaccion.tipo).toBe('gasto');
      expect(transaccion.categoria_id).toBe('prod-comida-y-bebida');
      expect(transaccion.cartera_id).toBe(`tarjeta-${UID}`);
    }
    expect(delPico.map((t) => t.monto).sort((a, b) => b - a)).toEqual([512.9, 21.4, 7.45]);
  });

  it('los montos son positivos y cada transacción cae en una de las 14 categorías y en una de las 3 carteras', () => {
    const { transacciones } = historial();
    const idsDeCategorias = new Set(CATEGORIAS.map((categoria) => categoria.id));
    const idsDeCarteras = new Set(historial().carteras.map((cartera) => cartera.id));
    for (const transaccion of transacciones) {
      expect(transaccion.monto).toBeGreaterThan(0);
      expect(idsDeCategorias.has(transaccion.categoria_id)).toBe(true);
      expect(idsDeCarteras.has(transaccion.cartera_id)).toBe(true);
      expect(['gasto', 'ingreso']).toContain(transaccion.tipo);
    }
  });

  it('falla ruidoso si falta una de las categorías de producción', () => {
    const sinSalud = CATEGORIAS.filter((categoria) => categoria.nombre !== 'Salud');
    expect(() => generarHistorialEjemplo({ uid: UID, hoy: HOY, categorias: sinSalud })).toThrow(/Salud/);
  });
});

describe('necesitaArranque (idempotencia de la pantalla de bienvenida)', () => {
  it('una cuenta sin carteras ni transacciones ve la pantalla', () => {
    expect(necesitaArranque(0, 0)).toBe(true);
  });

  it('una cuenta con una cartera, o con transacciones aunque no tenga carteras, ya no la ve', () => {
    expect(necesitaArranque(1, 0)).toBe(false);
    expect(necesitaArranque(0, 1)).toBe(false);
    expect(necesitaArranque(3, 173)).toBe(false);
  });
});
