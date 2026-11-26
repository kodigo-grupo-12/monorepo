import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  armarBatchCompromiso,
  consultaCompromisosPorDuenio,
  consultaTransaccionesPorDuenio,
} from '../apps/cuentame/src/datos/consultas';

// Las pruebas hablan solo con el emulador. Si esa variable no está, el SDK
// podría apuntar al proyecto real: abortamos antes de tocar nada.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido. Corre pnpm test:reglas (emulador), nunca contra kodigo-grupo12.',
  );
}

const reglas = readFileSync(resolve(import.meta.dirname, '..', 'firestore.rules'), 'utf8');

const UID_A = 'persona-a';

let entorno: RulesTestEnvironment;

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: 'demo-cuentame',
    firestore: { rules: reglas },
  });
});

afterAll(async () => {
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
});

function dbDe() {
  return entorno.authenticatedContext(UID_A).firestore();
}

describe('armarBatchCompromiso', () => {
  it('un préstamo de dinero con origen escribe el compromiso y la transacción gasto neutral de origen en un solo batch', async () => {
    const db = dbDe();
    const { batch, id } = armarBatchCompromiso(
      db,
      {
        direccion: 'me_deben',
        naturaleza: 'dinero',
        contraparte: '  Juan  ',
        monto: 50,
        fecha: '2026-11-26',
      },
      UID_A,
      { cartera_id: 'efectivo' },
    );
    await batch.commit();

    const compromiso = await assertSucceeds(getDoc(doc(db, 'compromisos', id)));
    expect(compromiso.exists()).toBe(true);
    expect(compromiso.data()).toMatchObject({
      uid: UID_A,
      direccion: 'me_deben',
      naturaleza: 'dinero',
      contraparte: 'Juan',
      monto: 50,
      fecha: '2026-11-26',
    });
    expect(compromiso.data()).not.toHaveProperty('cierre');

    const transacciones = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(db, UID_A)));
    expect(transacciones.size).toBe(1);
    const t = transacciones.docs[0].data();
    expect(t).toMatchObject({
      uid: UID_A,
      tipo: 'gasto',
      monto: 50,
      fecha: '2026-11-26',
      cartera_id: 'efectivo',
      compromiso_id: id,
      rol: 'origen',
      neutral: true,
      nota: 'Préstamo a Juan',
    });
    expect(t).not.toHaveProperty('categoria_id');
  });

  it('con debo el origen es un ingreso neutral con la nota Préstamo de Ana', async () => {
    const db = dbDe();
    const { batch, id } = armarBatchCompromiso(
      db,
      {
        direccion: 'debo',
        naturaleza: 'dinero',
        contraparte: 'Ana',
        monto: 80,
        fecha: '2026-11-26',
      },
      UID_A,
      { cartera_id: 'banco' },
    );
    await batch.commit();

    const transacciones = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(db, UID_A)));
    const t = transacciones.docs[0].data();
    expect(t).toMatchObject({
      tipo: 'ingreso',
      cartera_id: 'banco',
      compromiso_id: id,
      rol: 'origen',
      neutral: true,
      nota: 'Préstamo de Ana',
    });
  });

  it('sin origen escribe solo el compromiso, y con compra y origen también', async () => {
    const db = dbDe();
    await armarBatchCompromiso(
      db,
      {
        direccion: 'me_deben',
        naturaleza: 'dinero',
        contraparte: 'Juan',
        monto: 50,
        fecha: '2026-11-26',
      },
      UID_A,
    ).batch.commit();
    await armarBatchCompromiso(
      db,
      {
        direccion: 'debo',
        naturaleza: 'compra',
        contraparte: 'Tienda Ana',
        monto: 600,
        fecha: '2026-11-26',
        categoria_id: 'compras',
      },
      UID_A,
      { cartera_id: 'efectivo' },
    ).batch.commit();

    const compromisos = await assertSucceeds(getDocs(consultaCompromisosPorDuenio(db, UID_A)));
    expect(compromisos.size).toBe(2);
    const transacciones = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(db, UID_A)));
    expect(transacciones.size).toBe(0);
  });

  it('todo el batch pasa las reglas: con origen ajeno al dueño el commit falla', async () => {
    const db = dbDe();
    const { batch } = armarBatchCompromiso(
      db,
      {
        direccion: 'me_deben',
        naturaleza: 'dinero',
        contraparte: 'Juan',
        monto: 50,
        fecha: '2026-11-26',
      },
      'otro-uid',
      { cartera_id: 'efectivo' },
    );
    // El compromiso lleva uid ajeno y la transacción lleva compromiso_id con
    // rol 'origen': ambas escrituras chocan con las reglas del dueño.
    await expect(batch.commit()).rejects.toThrow();
  });
});
