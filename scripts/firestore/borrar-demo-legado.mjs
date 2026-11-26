// Lista y borra los datos demo legados: la demo compartida anterior, sin uid.
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore/borrar-demo-legado.mjs
//   ... con --confirmar para borrar de verdad. Sin --confirmar solo lista.
//
import { pathToFileURL } from 'node:url';

import { abrirFirestoreAdmin, leerBanderas } from './admin.mjs';

const LOTE_MAXIMO = 500;

// Legado: transacciones sin uid, carteras sin uid, y categorías sin uid que
// no son de producción (global: true). No tiene excepciones por nombre:
// cualquier categoría sin uid y sin global sale en la lista.
export async function buscarDemoLegado(db) {
  const categorias = await db.collection('categorias').get();
  if (!categorias.docs.some((documento) => documento.data().global === true)) {
    throw new Error(
      'No hay categorías con global: true: el marcado no se corrió. Corre primero marcar-categorias-produccion.mjs.',
    );
  }
  const legado = { transacciones: [], carteras: [], categorias: [] };
  for (const documento of (await db.collection('transacciones').get()).docs) {
    if (documento.data().uid === undefined) {
      legado.transacciones.push(documento.id);
    }
  }
  for (const documento of (await db.collection('carteras').get()).docs) {
    if (documento.data().uid === undefined) {
      legado.carteras.push(documento.id);
    }
  }
  for (const documento of categorias.docs) {
    if (documento.data().uid === undefined && documento.data().global !== true) {
      legado.categorias.push(documento.id);
    }
  }
  return legado;
}

// Sin confirmar no borra nada. Con confirmar borra en lotes de 500 como
// máximo. Idempotente: una segunda corrida sobre el mismo estado no borra
// nada más.
export async function borrarDemoLegado(db, { confirmar }) {
  const legado = await buscarDemoLegado(db);
  if (!confirmar) {
    return { legado, borrados: 0 };
  }
  const apuntadores = [
    ...legado.transacciones.map((id) => ['transacciones', id]),
    ...legado.carteras.map((id) => ['carteras', id]),
    ...legado.categorias.map((id) => ['categorias', id]),
  ];
  let borrados = 0;
  for (let inicio = 0; inicio < apuntadores.length; inicio += LOTE_MAXIMO) {
    const lote = db.batch();
    for (const [coleccion, id] of apuntadores.slice(inicio, inicio + LOTE_MAXIMO)) {
      lote.delete(db.collection(coleccion).doc(id));
    }
    await lote.commit();
    borrados += Math.min(LOTE_MAXIMO, apuntadores.length - inicio);
  }
  return { legado, borrados };
}

async function principal() {
  const banderas = leerBanderas(process.argv.slice(2));
  const { app, db } = abrirFirestoreAdmin(banderas);
  try {
    const { legado, borrados } = await borrarDemoLegado(db, banderas);
    const conteos = `transacciones: ${legado.transacciones.length} · carteras: ${legado.carteras.length} · categorías: ${legado.categorias.length}`;
    if (!banderas.confirmar) {
      console.log(`Simulación (sin --confirmar no borra nada): ${conteos}`);
      console.log(`Transacciones: ${legado.transacciones.join(', ') || '(ninguna)'}`);
      console.log(`Carteras: ${legado.carteras.join(', ') || '(ninguna)'}`);
      console.log(`Categorías: ${legado.categorias.join(', ') || '(ninguna)'}`);
    } else {
      console.log(`Borrados ${borrados} documentos legados (${conteos}).`);
    }
  } finally {
    await app.delete();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
