import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { abrirFirestoreAdmin } from '../scripts/firestore/admin.mjs';
import { borrarDemoLegado, buscarDemoLegado } from '../scripts/firestore/borrar-demo-legado.mjs';
import { marcarCategoriasProduccion } from '../scripts/firestore/marcar-categorias-produccion.mjs';

// Las pruebas hablan solo con el emulador. Si esa variable no está, el SDK
// podría apuntar al proyecto real: abortamos antes de tocar nada.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'FIRESTORE_EMULATOR_HOST no está definido. Corre pnpm test:reglas (emulador), nunca contra kodigo-grupo12.',
  );
}

const reglas = readFileSync(resolve(import.meta.dirname, '..', 'firestore.rules'), 'utf8');

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
  ({ app: appAdmin, db: adminDb } = abrirFirestoreAdmin({ produccion: false }));
});

afterAll(async () => {
  await appAdmin.delete();
  await entorno.cleanup();
});

beforeEach(async () => {
  await entorno.clearFirestore();
});

async function sembrar(documentos: { coleccion: string; id: string; datos: Record<string, unknown> }[]) {
  const lote = adminDb.batch();
  for (const { coleccion, id, datos } of documentos) {
    lote.set(adminDb.collection(coleccion).doc(id), datos);
  }
  await lote.commit();
}

function categoriasDeProduccion(conIds: string[]) {
  const nombres = [
    ['Comida y bebida', 'gasto'], ['Transporte', 'gasto'], ['Compras', 'gasto'],
    ['Educación', 'gasto'], ['Entretenimiento', 'gasto'], ['Facturas y servicios', 'gasto'],
    ['Familia', 'gasto'], ['Salud', 'gasto'], ['Invertir', 'gasto'], ['Otros gastos', 'gasto'],
    ['Salario', 'ingreso'], ['Otros ingresos', 'ingreso'],
    ['Transferencia entrante', 'ingreso'], ['Recolectar intereses', 'ingreso'],
  ];
  return nombres.map(([nombre, tipo], indice) => ({
    coleccion: 'categorias',
    id: conIds[indice],
    datos: { nombre, tipo },
  }));
}

describe('marcarCategoriasProduccion', () => {
  it('corrido dos veces deja exactamente 14 con global true, sin uid y con sus ids originales', async () => {
    await sembrar(categoriasDeProduccion(['cat-01', 'cat-02', 'cat-03', 'cat-04', 'cat-05', 'cat-06', 'cat-07', 'cat-08', 'cat-09', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14']));

    const primera = await marcarCategoriasProduccion(adminDb);
    expect(primera).toEqual({ marcadas: 14, creadas: 0, yaEstaban: 0, duplicadas: [] });

    const segunda = await marcarCategoriasProduccion(adminDb);
    expect(segunda).toEqual({ marcadas: 0, creadas: 0, yaEstaban: 14, duplicadas: [] });

    const trasDosVeces = await adminDb.collection('categorias').get();
    const conGlobal = trasDosVeces.docs.filter((d: { data: () => Record<string, unknown> }) => d.data().global === true);
    expect(conGlobal.length).toBe(14);
    for (const documento of conGlobal) {
      expect(documento.id.startsWith('cat-')).toBe(true);
      expect(documento.data().uid).toBeUndefined();
    }
  });

  it('crea con id produccion-<slug> las que faltan', async () => {
    await sembrar([categoriasDeProduccion(['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8', 'cat-9', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14'])[0]]);

    const resultado = await marcarCategoriasProduccion(adminDb);
    expect(resultado.marcadas).toBe(1);
    expect(resultado.creadas).toBe(13);

    // Comida y bebida ya existía (cat-1): la marcada, no la creada. La creada
    // de referencia es Transporte.
    const creada = await adminDb.collection('categorias').doc('produccion-transporte').get();
    expect(creada.data()).toEqual({ nombre: 'Transporte', tipo: 'gasto', global: true });
    const conGlobal = (await adminDb.collection('categorias').get()).docs.filter(
      (d: { data: () => Record<string, unknown> }) => d.data().global === true,
    );
    expect(conGlobal.length).toBe(14);
  });

  it('no toca categorías con uid y falla si hay duplicadas sin uid', async () => {
    const base = categoriasDeProduccion(['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8', 'cat-9', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14']);
    await sembrar([
      ...base,
      { coleccion: 'categorias', id: 'propia-x', datos: { nombre: 'Salario', tipo: 'ingreso', uid: 'persona-x' } },
    ]);

    await assertFails(
      // dos documentos sin uid con el mismo nombre y tipo: no marca ninguno
      (async () => {
        const lote = adminDb.batch();
        for (const [i, id] of ['dup-a', 'dup-b'].entries()) {
          lote.set(adminDb.collection('categorias').doc(id), { nombre: 'Transporte', tipo: 'gasto' });
          if (i === 1) break;
        }
        await lote.commit();
      })(),
    ).catch(() => {});

    await sembrar([
      { coleccion: 'categorias', id: 'dup-a', datos: { nombre: 'Transporte', tipo: 'gasto' } },
      { coleccion: 'categorias', id: 'dup-b', datos: { nombre: 'Transporte', tipo: 'gasto' } },
    ]);

    await expect(marcarCategoriasProduccion(adminDb)).rejects.toThrow(/duplicadas/);
    // Nada quedó marcado por la corrida fallida.
    const conGlobal = (await adminDb.collection('categorias').get()).docs.filter(
      (d: { data: () => Record<string, unknown> }) => d.data().global === true,
    );
    expect(conGlobal.length).toBe(0);
    // La categoría con uid sigue intacta, sin global.
    const propia = await adminDb.collection('categorias').doc('propia-x').get();
    expect(propia.data().uid).toBe('persona-x');
    expect(propia.data().global).toBeUndefined();
  });

  it('«Prueba video», sin uid y sin global, no la toca el marcado', async () => {
    await sembrar(categoriasDeProduccion(['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8', 'cat-9', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14']));
    await sembrar([{ coleccion: 'categorias', id: 'nOVxgMNkpGy0JPwhxrHq', datos: { nombre: 'Prueba video', tipo: 'gasto' } }]);

    const resultado = await marcarCategoriasProduccion(adminDb);
    expect(resultado.marcadas).toBe(14);

    const pruebaVideo = await adminDb.collection('categorias').doc('nOVxgMNkpGy0JPwhxrHq').get();
    expect(pruebaVideo.data().global).toBeUndefined();
  });
});

describe('buscarDemoLegado y borrarDemoLegado', () => {
  it('sin categorías marcadas aborta antes de listar', async () => {
    await sembrar([{ coleccion: 'transacciones', id: 'vieja-1', datos: { monto: 10, tipo: 'gasto', fecha: '2026-11-01' } }]);
    await expect(buscarDemoLegado(adminDb)).rejects.toThrow(/marcar-categorias-produccion/);
  });

  it('sin confirmar lista y no borra; con confirmar borra solo lo legado; dos veces deja el mismo estado', async () => {
    await sembrar([
      ...categoriasDeProduccion(['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8', 'cat-9', 'cat-10', 'cat-11', 'cat-12', 'cat-13', 'cat-14']),
      { coleccion: 'categorias', id: 'nOVxgMNkpGy0JPwhxrHq', datos: { nombre: 'Prueba video', tipo: 'gasto' } },
      { coleccion: 'transacciones', id: 'demo-vieja-1', datos: { cuenta: 'demo', monto: 39.99, tipo: 'gasto', fecha: '2026-11-01' } },
      { coleccion: 'transacciones', id: 'propia-1', datos: { uid: 'persona-a', monto: 5, tipo: 'gasto', fecha: '2026-11-02' } },
      { coleccion: 'carteras', id: 'demo-vieja-efectivo', datos: { cuenta: 'demo', nombre: 'Efectivo' } },
      { coleccion: 'carteras', id: 'efectivo-persona-a', datos: { uid: 'persona-a', nombre: 'Efectivo' } },
    ]);
    await marcarCategoriasProduccion(adminDb);

    const simulacion = await borrarDemoLegado(adminDb, { confirmar: false });
    expect(simulacion.borrados).toBe(0);
    expect(simulacion.legado.transacciones).toEqual(['demo-vieja-1']);
    expect(simulacion.legado.carteras).toEqual(['demo-vieja-efectivo']);
    expect(simulacion.legado.categorias).toEqual(['nOVxgMNkpGy0JPwhxrHq']);

    const borrado = await borrarDemoLegado(adminDb, { confirmar: true });
    expect(borrado.borrados).toBe(3);
    expect((await adminDb.collection('transacciones').doc('propia-1').get()).exists).toBe(true);
    expect((await adminDb.collection('carteras').doc('efectivo-persona-a').get()).exists).toBe(true);
    expect((await adminDb.collection('transacciones').doc('demo-vieja-1').get()).exists).toBe(false);
    expect((await adminDb.collection('categorias').doc('nOVxgMNkpGy0JPwhxrHq').get()).exists).toBe(false);
    // Las 14 de producción siguen ahí, intactas.
    const conGlobal = (await adminDb.collection('categorias').get()).docs.filter(
      (d: { data: () => Record<string, unknown> }) => d.data().global === true,
    );
    expect(conGlobal.length).toBe(14);

    const deNuevo = await borrarDemoLegado(adminDb, { confirmar: true });
    expect(deNuevo.borrados).toBe(0);
    expect(deNuevo.legado.transacciones).toEqual([]);
    expect(deNuevo.legado.carteras).toEqual([]);
    expect(deNuevo.legado.categorias).toEqual([]);
  });
});

describe('abrirFirestoreAdmin', () => {
  it('sin --produccion y sin emulador se niega; con emulador y --produccion se niega por ambiguo', async () => {
    const emuladorOriginal = process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    try {
      expect(() => abrirFirestoreAdmin({ produccion: false })).toThrow(/solo corre contra el emulador/);
    } finally {
      process.env.FIRESTORE_EMULATOR_HOST = emuladorOriginal;
    }
    expect(() => abrirFirestoreAdmin({ produccion: true })).toThrow(/Ambiguo/);
  });
});
