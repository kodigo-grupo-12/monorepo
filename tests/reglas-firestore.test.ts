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

import {
  consultaCompromisosPorDuenio,
  consultaCarterasPorDuenio,
  consultaCategoriasGlobales,
  consultaCategoriasPropias,
  consultaTransaccionesPorDuenio,
  documentoNuevaCartera,
  documentoNuevaCategoria,
  documentoNuevaTransaccion,
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

  describe('capa de datos: uid de sesión', () => {
    it('crea transacción, categoría y cartera con uid, sin cuenta demo y sin global', async () => {
      const altaTransaccion = documentoNuevaTransaccion(
        {
          tipo: 'gasto',
          monto: 4.5,
          fecha: '2026-11-26',
          nota: 'Café',
          categoria_id: 'cat-1',
          cartera_id: 'w-1',
        },
        UID_A,
      );
      const altaCategoria = documentoNuevaCategoria('Café de la esquina', 'gasto', UID_A);
      const altaCartera = documentoNuevaCartera('Banco', UID_A);

      expect(altaTransaccion).toMatchObject({ uid: UID_A, tipo: 'gasto', monto: 4.5 });
      expect(altaTransaccion).not.toHaveProperty('cuenta');
      expect(altaTransaccion).not.toHaveProperty('global');
      expect(altaCategoria).toEqual({ uid: UID_A, nombre: 'Café de la esquina', tipo: 'gasto' });
      expect(altaCategoria).not.toHaveProperty('global');
      expect(altaCartera).toEqual({ uid: UID_A, nombre: 'Banco' });
      expect(altaCartera).not.toHaveProperty('global');

      const db = sesion(UID_A);
      await assertSucceeds(setDoc(doc(db, 'transacciones', 'alta-t'), altaTransaccion));
      await assertSucceeds(setDoc(doc(db, 'categorias', 'alta-k'), altaCategoria));
      await assertSucceeds(setDoc(doc(db, 'carteras', 'alta-w'), altaCartera));

      const transaccion = await getDoc(doc(db, 'transacciones', 'alta-t'));
      const categoria = await getDoc(doc(db, 'categorias', 'alta-k'));
      const cartera = await getDoc(doc(db, 'carteras', 'alta-w'));
      expect(transaccion.data()).toMatchObject({ uid: UID_A, monto: 4.5 });
      expect(transaccion.data()).not.toHaveProperty('cuenta');
      expect(transaccion.data()).not.toHaveProperty('global');
      expect(categoria.data()).toEqual({ uid: UID_A, nombre: 'Café de la esquina', tipo: 'gasto' });
      expect(cartera.data()).toEqual({ uid: UID_A, nombre: 'Banco' });
    });

    it('rechaza crear sin uid válido o con uid y global juntos', async () => {
      const db = sesion(UID_A);
      await assertFails(
        setDoc(doc(db, 'transacciones', 'sin-uid'), {
          tipo: 'gasto',
          monto: 10,
          fecha: '2026-11-26',
        }),
      );
      await assertFails(
        setDoc(doc(db, 'carteras', 'sin-uid'), { nombre: 'Efectivo' }),
      );
      await assertFails(
        setDoc(doc(db, 'categorias', 'sin-uid'), { nombre: 'Gym', tipo: 'gasto' }),
      );
      await assertFails(
        setDoc(doc(db, 'transacciones', 'uid-ajeno'), documentoNuevaTransaccion(
          { tipo: 'ingreso', monto: 20, fecha: '2026-11-26' },
          UID_B,
        )),
      );
      await assertFails(
        setDoc(doc(db, 'categorias', 'con-global'), {
          ...documentoNuevaCategoria('Falsa', 'gasto', UID_A),
          global: true,
        }),
      );
    });
  });

  describe('consultas de los listeners', () => {
    const TOTAL_A = 110;

    function fechaDe(indice: number): string {
      const fecha = new Date(Date.UTC(2024, 0, 1 + indice));
      return fecha.toISOString().slice(0, 10);
    }

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
        await setDoc(doc(db, 'carteras', 'w-a-1'), { uid: UID_A, nombre: 'Efectivo' });
        await setDoc(doc(db, 'carteras', 'w-a-2'), { uid: UID_A, nombre: 'Banco' });
        await setDoc(doc(db, 'carteras', 'w-b'), { uid: UID_B, nombre: 'Ajena' });

        await Promise.all(
          Array.from({ length: TOTAL_A }, (_, indice) =>
            setDoc(
              doc(db, 'transacciones', `t-a-${indice}`),
              transaccionDe(UID_A, { fecha: fechaDe(indice), monto: indice + 1 }),
            ),
          ),
        );
        await setDoc(doc(db, 'transacciones', 't-b-1'), transaccionDe(UID_B, { fecha: '2026-01-01' }));
        await setDoc(doc(db, 'transacciones', 't-b-2'), transaccionDe(UID_B, { fecha: '2026-12-31' }));
      });
    });

    it('con sesión A solo ve lo de A, más las categorías de producción', async () => {
      const a = sesion(UID_A);
      const b = sesion(UID_B);

      const transaccionesA = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(a, UID_A)));
      const carterasA = await assertSucceeds(getDocs(consultaCarterasPorDuenio(a, UID_A)));
      const propiasA = await assertSucceeds(getDocs(consultaCategoriasPropias(a, UID_A)));
      const globalesA = await assertSucceeds(getDocs(consultaCategoriasGlobales(a)));

      const idsTransaccionesA = transaccionesA.docs.map((documento) => documento.id);
      expect(idsTransaccionesA).toHaveLength(TOTAL_A);
      expect(idsTransaccionesA).not.toContain('t-b-1');
      expect(idsTransaccionesA).not.toContain('t-b-2');
      expect(carterasA.docs.map((documento) => documento.id).sort()).toEqual(['w-a-1', 'w-a-2']);
      expect(propiasA.docs.map((documento) => documento.id)).toEqual(['de-a']);
      expect(globalesA.docs.map((documento) => documento.id).sort()).toEqual([
        'prod-comida',
        'prod-salario',
      ]);

      const categoriasA = [...globalesA.docs, ...propiasA.docs].map((documento) => documento.id).sort();
      expect(categoriasA).toEqual(['de-a', 'prod-comida', 'prod-salario']);
      expect(categoriasA).not.toContain('de-b');

      const transaccionesB = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(b, UID_B)));
      expect(transaccionesB.docs.map((documento) => documento.id).sort()).toEqual(['t-b-1', 't-b-2']);
      await assertFails(getDocs(consultaTransaccionesPorDuenio(a, UID_B)));
      await assertFails(getDocs(consultaCarterasPorDuenio(a, UID_B)));
      await assertFails(getDocs(consultaCategoriasPropias(a, UID_B)));
    });

    it('el listener de transacciones no recorta y viene ordenado por fecha', async () => {
      const db = sesion(UID_A);
      const instantanea = await assertSucceeds(getDocs(consultaTransaccionesPorDuenio(db, UID_A)));
      expect(instantanea.size).toBe(TOTAL_A);
      expect(instantanea.size).toBeGreaterThan(100);

      const fechas = instantanea.docs.map((documento) => documento.data().fecha as string);
      const ids = instantanea.docs.map((documento) => documento.id);
      expect(fechas).toEqual([...fechas].sort().reverse());
      expect(ids[0]).toBe(`t-a-${TOTAL_A - 1}`);
      expect(ids[ids.length - 1]).toBe('t-a-0');
      expect(consultaTransaccionesPorDuenio.toString()).not.toMatch(/\blimit\s*\(/);
    });
  });
});

function compromisoDe(uid: string, extra: Record<string, unknown> = {}) {
  return {
    uid,
    direccion: 'me_deben',
    naturaleza: 'dinero',
    contraparte: 'Juan',
    monto: 50,
    fecha: '2026-11-26',
    ...extra,
  };
}

describe('reglas de compromisos', () => {
  it('el dueño crea, lee, actualiza y borra; el ajeno no puede nada', async () => {
    const a = sesion(UID_A);
    const b = sesion(UID_B);
    await assertSucceeds(setDoc(doc(a, 'compromisos', 'c-a'), compromisoDe(UID_A)));
    await assertSucceeds(getDoc(doc(a, 'compromisos', 'c-a')));
    await assertSucceeds(updateDoc(doc(a, 'compromisos', 'c-a'), { monto: 60 }));
    await assertSucceeds(deleteDoc(doc(a, 'compromisos', 'c-a')));

    await assertSucceeds(setDoc(doc(a, 'compromisos', 'c-2'), compromisoDe(UID_A)));
    await assertFails(getDoc(doc(b, 'compromisos', 'c-2')));
    await assertFails(updateDoc(doc(b, 'compromisos', 'c-2'), { monto: 70 }));
    await assertFails(deleteDoc(doc(b, 'compromisos', 'c-2')));
    await assertFails(setDoc(doc(b, 'compromisos', 'c-b'), compromisoDe(UID_A)));
  });

  it('rechaza un compromiso inválido, un caso por dato', async () => {
    const db = sesion(UID_A);
    const casos = [
      { direccion: 'presto' },
      { monto: 0 },
      { contraparte: '' },
      { contraparte: 'a'.repeat(61) },
      { fecha: '26/11/2026' },
      { telefono: '12ab' },
      { cierre: 'pagado' },
      { plan: { modo: 'mensual', numero_cuotas: 12, dia: 5, primera: '2026-12' } },
      { plan: { modo: 'fijo', numero_cuotas: 12, dia: 5, primera: '2026-12' } },
      { plan: { modo: 'fijo', cuota: 20, numero_cuotas: 12, dia: 32, primera: '2026-12' } },
      { plan: { modo: 'fijo', cuota: 20, numero_cuotas: 1.5, dia: 5, primera: '2026-12' } },
      { global: true },
    ];
    for (const [indice, extra] of casos.entries()) {
      await assertFails(
        setDoc(doc(db, 'compromisos', `malo-${indice}`), compromisoDe(UID_A, extra)),
      );
    }
    await assertFails(setDoc(doc(db, 'compromisos', 'ajeno'), compromisoDe(UID_B)));
  });

  it('un plan fijo con cuota y uno variable sin cuota pasan; el cierre solo con valores válidos', async () => {
    const db = sesion(UID_A);
    await assertSucceeds(
      setDoc(
        doc(db, 'compromisos', 'fijo'),
        compromisoDe(UID_A, {
          naturaleza: 'compra',
          plan: { modo: 'fijo', cuota: 20, numero_cuotas: 24, dia: 19, primera: '2026-12' },
        }),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(db, 'compromisos', 'variable'),
        compromisoDe(UID_A, {
          naturaleza: 'compra',
          plan: { modo: 'variable', numero_cuotas: 12, dia: 5, primera: '2026-12' },
        }),
      ),
    );
    await assertSucceeds(setDoc(doc(db, 'compromisos', 'c-u'), compromisoDe(UID_A)));
    await assertFails(updateDoc(doc(db, 'compromisos', 'c-u'), { cierre: 'pagado' }));
    await assertSucceeds(updateDoc(doc(db, 'compromisos', 'c-u'), { cierre: 'perdonado' }));
  });

  it('los campos de amarre de transacciones pasan o no según las reglas', async () => {
    const db = sesion(UID_A);
    await assertFails(setDoc(doc(db, 'transacciones', 't-1'), transaccionDe(UID_A, { rol: 'abono' })));
    await assertFails(
      setDoc(doc(db, 'transacciones', 't-2'), transaccionDe(UID_A, { rol: 'otro', compromiso_id: 'c1' })),
    );
    await assertFails(setDoc(doc(db, 'transacciones', 't-3'), transaccionDe(UID_A, { neutral: 'si' })));
    await assertSucceeds(
      setDoc(
        doc(db, 'transacciones', 't-4'),
        transaccionDe(UID_A, { compromiso_id: 'c1', rol: 'origen', neutral: true }),
      ),
    );
  });

  it('consultaCompromisosPorDuenio funciona sin índice y solo trae los del dueño', async () => {
    await entorno.withSecurityRulesDisabled(async (contexto) => {
      const db = contexto.firestore();
      await setDoc(doc(db, 'compromisos', 'c-a-1'), compromisoDe(UID_A));
      await setDoc(doc(db, 'compromisos', 'c-b-1'), compromisoDe(UID_B));
    });
    const a = sesion(UID_A);
    const b = sesion(UID_B);
    const deA = await assertSucceeds(getDocs(consultaCompromisosPorDuenio(a, UID_A)));
    expect(deA.docs.map((documento) => documento.id)).toEqual(['c-a-1']);
    const deB = await assertSucceeds(getDocs(consultaCompromisosPorDuenio(b, UID_B)));
    expect(deB.docs.map((documento) => documento.id)).toEqual(['c-b-1']);
    await assertFails(getDocs(consultaCompromisosPorDuenio(a, UID_B)));
  });
});
