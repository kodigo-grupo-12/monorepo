import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { generarHistorial } from '../scripts/firestore/historial.mjs';
import { sembrarHistorial } from '../scripts/firestore/sembrar-historial.mjs';
import { marcarCategoriasProduccion } from '../scripts/firestore/marcar-categorias-produccion.mjs';

// Las pruebas hablan solo con el emulador. Si esa variable no está, el SDK
// podría apuntar al proyecto real: abortamos antes de tocar nada.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido. Corre pnpm test:reglas (emulador), nunca contra kodigo-grupo12.',
  );
}

const reglas = readFileSync(resolve(import.meta.dirname, '..', 'firestore.rules'), 'utf8');
const HOY = '2026-11-26';
const UID = 'persona-h';

const CATEGORIAS = [
  ['Comida y bebida', 'gasto'], ['Transporte', 'gasto'], ['Compras', 'gasto'],
  ['Educación', 'gasto'], ['Entretenimiento', 'gasto'], ['Facturas y servicios', 'gasto'],
  ['Familia', 'gasto'], ['Salud', 'gasto'], ['Invertir', 'gasto'], ['Otros gastos', 'gasto'],
  ['Salario', 'ingreso'], ['Otros ingresos', 'ingreso'],
  ['Transferencia entrante', 'ingreso'], ['Recolectar intereses', 'ingreso'],
].map(([nombre, tipo]) => ({ id: `prod-${nombre.toLowerCase().replace(/\s+/g, '-')}`, nombre, tipo }));

function historial(semilla: number) {
  return generarHistorial({ uid: UID, semilla, hoy: HOY, categorias: CATEGORIAS });
}

describe('generarHistorial (puro)', () => {
  it('con la misma semilla y el mismo hoy devuelve exactamente lo mismo, 98 transacciones e ids en orden', () => {
    const primera = historial(12);
    const segunda = historial(12);
    expect(JSON.stringify(primera)).toBe(JSON.stringify(segunda));
    expect(primera.transacciones.length).toBe(98);
    expect(primera.carteras.map((cartera) => cartera.nombre)).toEqual(['Efectivo', 'Banco', 'Tarjeta']);
    primera.transacciones.forEach((transaccion, indice) => {
      expect(transaccion.id).toBe(`hist-${UID}-${String(indice + 1).padStart(3, '0')}`);
    });
  });

  it('nunca pasa de 100 y ninguna fecha sale del rango ni pasa de hoy', () => {
    for (const semilla of [1, 12, 99]) {
      const { transacciones } = historial(semilla);
      expect(transacciones.length).toBeLessThanOrEqual(100);
      for (const transaccion of transacciones) {
        expect(transaccion.fecha >= '2025-12-01').toBe(true);
        expect(transaccion.fecha <= HOY).toBe(true);
      }
    }
  });

  it.each([1, 12, 99])('con la semilla %i: 12 salarios, 6 otros ingresos, gastos en las 10 categorías y 3 carteras', (semilla) => {
    const { carteras, transacciones } = historial(semilla);

    const salarios = transacciones.filter((t) => t.nota === 'Ejemplo: Salario');
    expect(salarios.length).toBe(12);
    expect(new Set(salarios.map((t) => t.fecha.slice(0, 7))).size).toBe(12);
    for (const salario of salarios) {
      expect(salario.monto).toBe(750);
      expect(salario.cartera_id).toBe(`banco-${UID}`);
    }

    const otros = transacciones.filter(
      (t) => t.tipo === 'ingreso' && t.nota !== 'Ejemplo: Salario',
    );
    expect(otros.length).toBe(6);
    expect(new Set(otros.map((t) => t.fecha.slice(0, 7))).size).toBe(6);
    for (const otro of otros) {
      expect(otro.monto).toBeGreaterThanOrEqual(15);
      expect(otro.monto).toBeLessThanOrEqual(250);
    }

    const gastos = transacciones.filter((t) => t.tipo === 'gasto');
    expect(gastos.length).toBe(80);
    const categoriasDeGastos = new Set(gastos.map((t) => t.nota));
    expect(categoriasDeGastos.size).toBe(10);
    expect(carteras.length).toBe(3);
    for (const cartera of carteras) {
      expect(cartera.uid).toBe(UID);
    }
  });

  it.each([1, 12, 99])('con la semilla %i: el día pico del 15 de hace dos meses gana por 1.5 veces', (semilla) => {
    const { transacciones } = historial(semilla);
    const gastos = transacciones.filter((t) => t.tipo === 'gasto');

    const sumaPorDia = new Map<string, number>();
    for (const gasto of gastos) {
      sumaPorDia.set(gasto.fecha, (sumaPorDia.get(gasto.fecha) ?? 0) + gasto.monto);
    }
    const ordenados = [...sumaPorDia.entries()].sort((a, b) => b[1] - a[1]);
    const pico = ordenados[0];
    expect(pico[0]).toBe('2026-09-15');
    expect(pico[1]).toBe(660);
    const enElPico = gastos.filter((gasto) => gasto.fecha === pico[0]);
    expect(enElPico.map((gasto) => gasto.monto).sort((a, b) => a - b)).toEqual([180, 220, 260]);
    expect(pico[1]).toBeGreaterThanOrEqual(1.5 * (ordenados[1]?.[1] ?? 0));
  });

  it('todos los montos traen 2 decimales y ningún documento lleva cuenta, global ni imagen', () => {
    const { transacciones } = historial(12);
    for (const transaccion of transacciones) {
      // monto son centavos enteros entre 100: el redondeo a 2 decimales lo
      // deja igual (la comparación directa con *100 sufre el flotante de JS).
      expect(Number(transaccion.monto.toFixed(2))).toBe(transaccion.monto);
      expect(Object.keys(transaccion)).toEqual(
        expect.arrayContaining(['uid', 'tipo', 'monto', 'fecha', 'nota', 'categoria_id', 'cartera_id']),
      );
      expect('cuenta' in transaccion).toBe(false);
      expect('global' in transaccion).toBe(false);
      expect('imagen' in transaccion).toBe(false);
    }
  });

  it('lanza si falta alguna de las 14 categorías', () => {
    expect(() =>
      generarHistorial({
        uid: UID,
        hoy: HOY,
        categorias: CATEGORIAS.filter((categoria) => categoria.nombre !== 'Salud'),
      }),
    ).toThrow(/Faltan categorías/);
  });
});

let entorno: RulesTestEnvironment;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adminDb: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let appAdmin: any;

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-cuentame',
    firestore: { rules: reglas },
  });
  const app = initializeApp({ projectId: 'demo-cuentame' });
  adminDb = adminFirestore(app);
});

afterAll(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)));
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
  await marcarCategoriasProduccion(adminDb);
});

describe('sembrarHistorial (emulador)', () => {
  it('corrido dos veces deja 98 transacciones y 3 carteras del uid y no toca lo ajeno', async () => {
    await adminDb.collection('transacciones').doc('ajena-1').set({ uid: 'otra-persona', monto: 1, tipo: 'gasto', fecha: HOY });

    const primera = await sembrarHistorial(adminDb, { uid: UID, semilla: 12, hoy: HOY });
    expect(primera).toEqual({ carteras: 3, transacciones: 98 });
    const segunda = await sembrarHistorial(adminDb, { uid: UID, semilla: 12, hoy: HOY });
    expect(segunda).toEqual({ carteras: 3, transacciones: 98 });

    const transacciones = await adminDb
      .collection('transacciones')
      .where('uid', '==', UID)
      .get();
    expect(transacciones.size).toBe(98);
    const carteras = await adminDb.collection('carteras').where('uid', '==', UID).get();
    expect(carteras.size).toBe(3);
    // Lo ajeno queda intacto.
    const ajena = await adminDb.collection('transacciones').doc('ajena-1').get();
    expect(ajena.exists).toBe(true);
    expect(ajena.data().uid).toBe('otra-persona');
  });

  it('sin --produccion y sin FIRESTORE_EMULATOR_HOST el script se niega a escribir', async () => {
    const { FIRESTORE_EMULATOR_HOST: _sinUso, ...sinEmulador } = process.env;
    let stderr = '';
    try {
      execFileSync(
        process.execPath,
        ['scripts/firestore/sembrar-historial.mjs', '--uid', 'alguien'],
        { env: sinEmulador, stdio: ['ignore', 'pipe', 'pipe'] },
      );
      throw new Error('El script corrió sin emulador y sin --produccion: no debía.');
    } catch (error) {
      stderr = String((error as { stderr?: Buffer }).stderr ?? '');
    }
    expect(stderr).toContain('solo corre contra el emulador');
    const escritas = await adminDb.collection('transacciones').where('uid', '==', 'alguien').get();
    expect(escritas.size).toBe(0);
  });
});
