import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { consultaCategoriasGlobales } from '../apps/cuentame/src/datos/consultas';
import { borrarContenidoDeDuenio, sembrarArranque } from '../apps/cuentame/src/datos/arranque';
import { hoyEnElSalvador } from '../apps/cuentame/src/datos/historialEjemplo';
import { marcarCategoriasProduccion } from '../scripts/firestore/marcar-categorias-produccion.mjs';

// Las pruebas hablan solo con el emulador. Si esa variable no está, el SDK
// podría apuntar al proyecto real: abortamos antes de tocar nada.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido. Corre pnpm test:reglas (emulador), nunca contra kodigo-grupo12.',
  );
}

const reglas = readFileSync(resolve(import.meta.dirname, '..', 'firestore.rules'), 'utf8');

const UID_A = 'persona-a';
const UID_B = 'persona-b';
const UID_C = 'persona-c';

let entorno: RulesTestEnvironment;
let adminDb: ReturnType<typeof adminFirestore>;

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
  // Las 14 categorías de producción, marcadas por el mismo script que usa la
  // línea de comandos (sobre una base vacía crea ids produccion-<slug>).
  await marcarCategoriasProduccion(adminDb);
});

function sesion(uid: string) {
  return entorno.authenticatedContext(uid).firestore();
}

async function idsDeCategoriasPorNombre(db: ReturnType<typeof sesion>) {
  const globales = await getDocs(consultaCategoriasGlobales(db));
  return new Map(
    globales.docs.map((documento) => [documento.data().nombre as string, documento.id]),
  );
}

function transaccionesDe(db: ReturnType<typeof sesion>, uid: string) {
  return getDocs(query(collection(db, 'transacciones'), where('uid', '==', uid)));
}

function carterasDe(db: ReturnType<typeof sesion>, uid: string) {
  return getDocs(query(collection(db, 'carteras'), where('uid', '==', uid)));
}

describe('sembrarArranque (T015)', () => {
  it('empezar de cero crea solo la cartera Efectivo vacía, y una segunda llamada no cambia nada', async () => {
    const dbA = sesion(UID_A);
    expect(await sembrarArranque(dbA, UID_A, 'cero')).toBe('sembrada');

    const carteras = await carterasDe(dbA, UID_A);
    expect(carteras.size).toBe(1);
    const cartera = await getDoc(doc(dbA, 'carteras', `efectivo-${UID_A}`));
    expect(cartera.data()).toEqual({ uid: UID_A, nombre: 'Efectivo' });
    expect((await transaccionesDe(dbA, UID_A)).size).toBe(0);

    expect(await sembrarArranque(dbA, UID_A, 'cero')).toBe('ya-tenia-datos');
    expect((await carterasDe(dbA, UID_A)).size).toBe(1);
  });

  it('cargar el ejemplo crea las 3 carteras y 173 transacciones con su uid, categorías de producción y sin fechas a futuro', async () => {
    const dbA = sesion(UID_A);
    const ids = await idsDeCategoriasPorNombre(dbA);

    expect(await sembrarArranque(dbA, UID_A, 'ejemplo')).toBe('sembrada');

    const carteras = await carterasDe(dbA, UID_A);
    expect(carteras.size).toBe(3);
    for (const [id, nombre] of [
      [`efectivo-${UID_A}`, 'Efectivo'],
      [`banco-${UID_A}`, 'Banco'],
      [`tarjeta-${UID_A}`, 'Tarjeta'],
    ] as const) {
      const cartera = await getDoc(doc(dbA, 'carteras', id));
      expect(cartera.data()).toEqual({ uid: UID_A, nombre });
    }

    const transacciones = await transaccionesDe(dbA, UID_A);
    expect(transacciones.size).toBe(173);
    const idsDeCategorias = new Set(ids.values());
    const hoy = hoyEnElSalvador();
    for (let indice = 1; indice <= 173; indice += 1) {
      const documento = await getDoc(doc(dbA, 'transacciones', `semilla-${UID_A}-${String(indice).padStart(3, '0')}`));
      const datos = documento.data();
      expect(datos).toBeTruthy();
      expect(datos?.uid).toBe(UID_A);
      expect(datos?.monto).toBeGreaterThan(0);
      expect(datos?.fecha <= hoy).toBe(true);
      expect(datos?.fecha >= '2025-12-01').toBe(true);
      expect(idsDeCategorias.has(datos?.categoria_id)).toBe(true);
      expect(['efectivo', 'banco', 'tarjeta'].some((base) => datos?.cartera_id === `${base}-${UID_A}`)).toBe(true);
      expect(datos?.cuenta).toBeUndefined();
    }

    expect(await sembrarArranque(dbA, UID_A, 'ejemplo')).toBe('ya-tenia-datos');
    expect(transaccionesDe.length).toBeDefined();
    expect((await transaccionesDe(dbA, UID_A)).size).toBe(173);
  });

  it('una persona que ya tiene una cartera, o una transacción, no recibe datos', async () => {
    const dbC = sesion(UID_C);
    await assertSucceeds(setDoc(doc(dbC, 'carteras', 'propia-c'), { uid: UID_C, nombre: 'Banco' }));
    expect(await sembrarArranque(dbC, UID_C, 'ejemplo')).toBe('ya-tenia-datos');
    expect((await transaccionesDe(dbC, UID_C)).size).toBe(0);

    await assertSucceeds(
      setDoc(doc(dbC, 'transacciones', 'propia-c'), {
        uid: UID_C,
        tipo: 'gasto',
        monto: 5,
        fecha: '2026-11-26',
      }),
    );
    expect(await sembrarArranque(dbC, UID_C, 'cero')).toBe('ya-tenia-datos');
  });

  it('el ejemplo de A no se ve desde B y las reglas siguen negando lo ajeno', async () => {
    const dbA = sesion(UID_A);
    const dbB = sesion(UID_B);
    expect(await sembrarArranque(dbA, UID_A, 'ejemplo')).toBe('sembrada');
    expect(await sembrarArranque(dbB, UID_B, 'cero')).toBe('sembrada');

    expect((await transaccionesDe(dbB, UID_B)).size).toBe(0);
    await assertFails(getDoc(doc(dbB, 'carteras', `efectivo-${UID_A}`)));
    await assertFails(getDoc(doc(dbB, 'transacciones', `semilla-${UID_A}-001`)));
  });

  it('borrarContenidoDeDuenio deja la cuenta vacía para reelegir y las categorías globales quedan', async () => {
    const dbA = sesion(UID_A);
    const dbB = sesion(UID_B);
    expect(await sembrarArranque(dbA, UID_A, 'ejemplo')).toBe('sembrada');
    expect(await sembrarArranque(dbB, UID_B, 'cero')).toBe('sembrada');

    await borrarContenidoDeDuenio(dbA, UID_A);
    expect((await carterasDe(dbA, UID_A)).size).toBe(0);
    expect((await transaccionesDe(dbA, UID_A)).size).toBe(0);
    expect((await getDocs(consultaCategoriasGlobales(dbA))).size).toBe(14);

    // La cuenta de B no se toca y A puede reelegir.
    expect((await carterasDe(dbB, UID_B)).size).toBe(1);
    expect(await sembrarArranque(dbA, UID_A, 'cero')).toBe('sembrada');
    expect((await carterasDe(dbA, UID_A)).size).toBe(1);
  });
});
