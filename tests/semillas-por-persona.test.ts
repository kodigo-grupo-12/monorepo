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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { consultaCategoriasGlobales } from '../apps/cuentame/src/datos/consultas';
import {
  SEMILLAS_POR_PERSONA,
  sembrarPrimeraEntrada,
} from '../apps/cuentame/src/datos/semillasPorPersona';
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

// Las reglas exigen filtro por uid: ninguna lista de la app va sin él, y
// las pruebas tampoco (un list sin filtro se rechaza entero).
function transaccionesDe(db: ReturnType<typeof sesion>, uid: string) {
  return getDocs(query(collection(db, 'transacciones'), where('uid', '==', uid)));
}

function carterasDe(db: ReturnType<typeof sesion>, uid: string) {
  return getDocs(query(collection(db, 'carteras'), where('uid', '==', uid)));
}

describe('sembrarPrimeraEntrada', () => {
  it('la primera entrada de A crea Efectivo y las 6 semillas con su uid y categorías de producción', async () => {
    const dbA = sesion(UID_A);
    const ids = await idsDeCategoriasPorNombre(dbA);

    expect(await sembrarPrimeraEntrada(dbA, UID_A)).toBe('sembrada');

    const cartera = await getDoc(doc(dbA, 'carteras', `efectivo-${UID_A}`));
    expect(cartera.data()).toEqual({ uid: UID_A, nombre: 'Efectivo' });

    for (const [indice, semilla] of SEMILLAS_POR_PERSONA.entries()) {
      const documento = await getDoc(doc(dbA, 'transacciones', `semilla-${UID_A}-${indice + 1}`));
      const datos = documento.data();
      expect(datos?.uid).toBe(UID_A);
      expect(datos?.tipo).toBe(semilla.tipo);
      expect(datos?.monto).toBe(semilla.monto);
      expect(datos?.fecha).toBe(semilla.fecha);
      expect(datos?.nota).toBe(semilla.nota);
      expect(datos?.cartera_id).toBe(`efectivo-${UID_A}`);
      expect(datos?.categoria_id).toBe(ids.get(semilla.categoria));
      expect(datos?.cuenta).toBeUndefined();
    }
  });

  it('una segunda llamada devuelve ya-tenia-datos y no cambia nada', async () => {
    const dbA = sesion(UID_A);
    expect(await sembrarPrimeraEntrada(dbA, UID_A)).toBe('sembrada');
    expect((await transaccionesDe(dbA, UID_A)).size).toBe(6);

    expect(await sembrarPrimeraEntrada(dbA, UID_A)).toBe('ya-tenia-datos');
    expect((await transaccionesDe(dbA, UID_A)).size).toBe(6);
  });

  it('B no se ve afectado por las semillas de A y no ve los datos de A', async () => {
    const dbA = sesion(UID_A);
    const dbB = sesion(UID_B);
    expect(await sembrarPrimeraEntrada(dbA, UID_A)).toBe('sembrada');
    expect(await sembrarPrimeraEntrada(dbB, UID_B)).toBe('sembrada');

    const deB = await transaccionesDe(dbB, UID_B);
    expect(deB.size).toBe(6);
    for (const documento of deB.docs) {
      expect(documento.data().uid).toBe(UID_B);
    }
    await assertFails(getDoc(doc(dbB, 'carteras', `efectivo-${UID_A}`)));
    await assertFails(getDoc(doc(dbB, 'transacciones', `semilla-${UID_A}-1`)));
  });

  it('una persona que ya tiene una cartera no recibe semillas', async () => {
    const dbC = sesion(UID_C);
    await assertSucceeds(setDoc(doc(dbC, 'carteras', 'propia-c'), { uid: UID_C, nombre: 'Banco' }));
    expect(await sembrarPrimeraEntrada(dbC, UID_C)).toBe('ya-tenia-datos');
    expect((await transaccionesDe(dbC, UID_C)).size).toBe(0);
  });

  it('una persona que ya tiene una transacción no recibe semillas', async () => {
    const dbC = sesion(UID_C);
    await assertSucceeds(
      setDoc(doc(dbC, 'transacciones', 'propia-c'), {
        uid: UID_C,
        tipo: 'gasto',
        monto: 5,
        fecha: '2026-11-26',
      }),
    );
    expect(await sembrarPrimeraEntrada(dbC, UID_C)).toBe('ya-tenia-datos');
    const carteras = await carterasDe(dbC, UID_C);
    expect(carteras.size).toBe(0);
  });
});
