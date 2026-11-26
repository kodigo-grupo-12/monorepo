import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

function transaccionDe(uid: string, extra: Record<string, unknown> = {}) {
  return {
    uid,
    tipo: 'gasto',
    monto: 10,
    fecha: '2026-11-26',
    cuenta: 'demo',
    ...extra,
  };
}

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

function sesion(uid: string) {
  return entorno.authenticatedContext(uid).firestore();
}

function sinSesion() {
  return entorno.unauthenticatedContext().firestore();
}

describe('reglas de Firestore', () => {
  describe('sin sesión', () => {
    it('niega toda lectura y escritura', async () => {
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        const db = contexto.firestore();
        await setDoc(doc(db, 'transacciones', 't1'), transaccionDe(UID_A));
        await setDoc(doc(db, 'carteras', 'c1'), { uid: UID_A, nombre: 'Efectivo' });
        await setDoc(doc(db, 'categorias', 'prod'), {
          nombre: 'Comida y bebida',
          tipo: 'gasto',
          global: true,
        });
        await setDoc(doc(db, 'categorias', 'mia'), { uid: UID_A, nombre: 'Café', tipo: 'gasto' });
      });

      const db = sinSesion();
      await assertFails(getDoc(doc(db, 'transacciones', 't1')));
      await assertFails(getDoc(doc(db, 'carteras', 'c1')));
      await assertFails(getDoc(doc(db, 'categorias', 'prod')));
      await assertFails(getDoc(doc(db, 'categorias', 'mia')));
      await assertFails(getDocs(collection(db, 'transacciones')));
      await assertFails(setDoc(doc(db, 'transacciones', 'nueva'), transaccionDe(UID_A)));
      await assertFails(setDoc(doc(db, 'carteras', 'nueva'), { uid: UID_A, nombre: 'Banco' }));
      await assertFails(
        setDoc(doc(db, 'categorias', 'nueva'), { uid: UID_A, nombre: 'Gym', tipo: 'gasto' }),
      );
      await assertFails(updateDoc(doc(db, 'transacciones', 't1'), { monto: 11 }));
      await assertFails(deleteDoc(doc(db, 'transacciones', 't1')));
      await assertFails(deleteDoc(doc(db, 'categorias', 'prod')));
    });
  });

  describe('dueño', () => {
    it('con la sesión A se lee y escribe lo de A', async () => {
      const db = sesion(UID_A);
      await assertSucceeds(setDoc(doc(db, 'transacciones', 't-a'), transaccionDe(UID_A)));
      await assertSucceeds(setDoc(doc(db, 'carteras', 'w-a'), { uid: UID_A, nombre: 'Efectivo' }));
      await assertSucceeds(setDoc(doc(db, 'categorias', 'k-a'), { uid: UID_A, nombre: 'Café', tipo: 'gasto' }));
      await assertSucceeds(getDoc(doc(db, 'transacciones', 't-a')));
      await assertSucceeds(getDoc(doc(db, 'carteras', 'w-a')));
      await assertSucceeds(getDoc(doc(db, 'categorias', 'k-a')));
      await assertSucceeds(
        getDocs(query(collection(db, 'transacciones'), where('uid', '==', UID_A))),
      );
      await assertSucceeds(updateDoc(doc(db, 'transacciones', 't-a'), { monto: 12, tipo: 'gasto', fecha: '2026-11-26' }));
      await assertSucceeds(updateDoc(doc(db, 'carteras', 'w-a'), { nombre: 'Banco' }));
      await assertSucceeds(deleteDoc(doc(db, 'transacciones', 't-a')));
      await assertSucceeds(deleteDoc(doc(db, 'categorias', 'k-a')));
    });

    it('A no lee, no edita ni borra lo de B', async () => {
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        const db = contexto.firestore();
        await setDoc(doc(db, 'transacciones', 't-b'), transaccionDe(UID_B));
        await setDoc(doc(db, 'carteras', 'w-b'), { uid: UID_B, nombre: 'Efectivo' });
        await setDoc(doc(db, 'categorias', 'k-b'), { uid: UID_B, nombre: 'Gym', tipo: 'gasto' });
      });

      const db = sesion(UID_A);
      await assertFails(getDoc(doc(db, 'transacciones', 't-b')));
      await assertFails(getDoc(doc(db, 'carteras', 'w-b')));
      await assertFails(getDoc(doc(db, 'categorias', 'k-b')));
      await assertFails(updateDoc(doc(db, 'transacciones', 't-b'), { monto: 1 }));
      await assertFails(updateDoc(doc(db, 'carteras', 'w-b'), { nombre: 'Ajeno' }));
      await assertFails(deleteDoc(doc(db, 'transacciones', 't-b')));
      await assertFails(deleteDoc(doc(db, 'categorias', 'k-b')));
      await assertFails(deleteDoc(doc(db, 'carteras', 'w-b')));
    });

    it('no se puede crear un documento con el uid de otra persona', async () => {
      const db = sesion(UID_A);
      await assertFails(setDoc(doc(db, 'transacciones', 'robo'), transaccionDe(UID_B)));
      await assertFails(setDoc(doc(db, 'carteras', 'robo'), { uid: UID_B, nombre: 'Efectivo' }));
      await assertFails(setDoc(doc(db, 'categorias', 'robo'), { uid: UID_B, nombre: 'Gym', tipo: 'gasto' }));
    });

    it('no se puede cambiar el uid de un documento existente', async () => {
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        await setDoc(doc(contexto.firestore(), 'transacciones', 't-a'), transaccionDe(UID_A));
        await setDoc(doc(contexto.firestore(), 'carteras', 'w-a'), { uid: UID_A, nombre: 'Efectivo' });
      });

      const db = sesion(UID_A);
      await assertFails(updateDoc(doc(db, 'transacciones', 't-a'), { uid: UID_B }));
      await assertFails(updateDoc(doc(db, 'carteras', 'w-a'), { uid: UID_B }));
    });

    it('una consulta sin filtro por uid se rechaza', async () => {
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        const db = contexto.firestore();
        await setDoc(doc(db, 'transacciones', 't-a'), transaccionDe(UID_A));
        await setDoc(doc(db, 'transacciones', 't-b'), transaccionDe(UID_B));
        await setDoc(doc(db, 'carteras', 'w-a'), { uid: UID_A, nombre: 'Efectivo' });
      });

      const db = sesion(UID_A);
      await assertFails(getDocs(collection(db, 'transacciones')));
      await assertFails(getDocs(collection(db, 'carteras')));
      await assertSucceeds(
        getDocs(query(collection(db, 'transacciones'), where('uid', '==', UID_A))),
      );
    });
  });

  describe('categorías de producción', () => {
    beforeEach(async () => {
      await entorno.withSecurityRulesDisabled(async (contexto) => {
        const db = contexto.firestore();
        await setDoc(doc(db, 'categorias', 'prod-comida'), {
          nombre: 'Comida y bebida',
          tipo: 'gasto',
          global: true,
        });
        await setDoc(doc(db, 'categorias', 'prod-salario'), {
          nombre: 'Salario',
          tipo: 'ingreso',
          global: true,
        });
        await setDoc(doc(db, 'categorias', 'de-a'), { uid: UID_A, nombre: 'Café', tipo: 'gasto' });
        await setDoc(doc(db, 'categorias', 'de-b'), { uid: UID_B, nombre: 'Gym', tipo: 'gasto' });
      });
    });

    it('se leen con cualquier sesión', async () => {
      await assertSucceeds(getDoc(doc(sesion(UID_A), 'categorias', 'prod-comida')));
      await assertSucceeds(getDoc(doc(sesion(UID_B), 'categorias', 'prod-comida')));
    });

    it('cualquier sesión lista las de producción y esa consulta no trae las ajenas', async () => {
      const consulta = query(collection(sesion(UID_A), 'categorias'), where('global', '==', true));
      const instantanea = await assertSucceeds(getDocs(consulta));
      const ids = instantanea.docs.map((documento) => documento.id).sort();
      expect(ids).toEqual(['prod-comida', 'prod-salario']);
      expect(ids).not.toContain('de-a');
      expect(ids).not.toContain('de-b');

      const deB = await assertSucceeds(
        getDocs(query(collection(sesion(UID_B), 'categorias'), where('global', '==', true))),
      );
      expect(deB.docs.map((documento) => documento.id).sort()).toEqual(['prod-comida', 'prod-salario']);

      await assertFails(getDocs(collection(sesion(UID_A), 'categorias')));
      await assertFails(getDocs(query(collection(sesion(UID_A), 'categorias'), where('tipo', '==', 'gasto'))));
    });

    it('nadie las crea, edita ni borra', async () => {
      const a = sesion(UID_A);
      const b = sesion(UID_B);
      await assertFails(
        setDoc(doc(a, 'categorias', 'otra-prod'), { nombre: 'Inventada', tipo: 'gasto', global: true }),
      );
      await assertFails(setDoc(doc(a, 'categorias', 'sin-uid'), { nombre: 'Inventada', tipo: 'gasto' }));
      await assertFails(updateDoc(doc(a, 'categorias', 'prod-comida'), { nombre: 'Cambiada' }));
      await assertFails(updateDoc(doc(b, 'categorias', 'prod-comida'), { nombre: 'Cambiada' }));
      await assertFails(deleteDoc(doc(a, 'categorias', 'prod-comida')));
      await assertFails(deleteDoc(doc(b, 'categorias', 'prod-comida')));
      await assertFails(deleteDoc(doc(sinSesion(), 'categorias', 'prod-comida')));
      await assertFails(
        setDoc(doc(a, 'categorias', 'con-marcador'), {
          uid: UID_A,
          nombre: 'Falsa',
          tipo: 'gasto',
          global: true,
        }),
      );
    });
  });

  describe('validación de transacción', () => {
    it('rechaza monto 0, monto no numérico, tipo inválido o fecha que no es AAAA-MM-DD', async () => {
      const db = sesion(UID_A);
      await assertFails(setDoc(doc(db, 'transacciones', 'cero'), transaccionDe(UID_A, { monto: 0 })));
      await assertFails(setDoc(doc(db, 'transacciones', 'texto'), transaccionDe(UID_A, { monto: '10' })));
      await assertFails(setDoc(doc(db, 'transacciones', 'tipo'), transaccionDe(UID_A, { tipo: 'transferencia' })));
      await assertFails(setDoc(doc(db, 'transacciones', 'fecha'), transaccionDe(UID_A, { fecha: '26/11/2026' })));
      await assertSucceeds(setDoc(doc(db, 'transacciones', 'ok'), transaccionDe(UID_A)));
    });
  });
});
