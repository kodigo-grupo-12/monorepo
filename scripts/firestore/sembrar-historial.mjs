// Siembra el historial determinista de un uid (issue #112), idempotente:
// escribe con set por id y no toca nada fuera de esos ids.
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore/sembrar-historial.mjs --uid <uid>
//   ... --semilla 12 --hoy AAAA-MM-DD ; contra producción solo con --produccion
//   y con la orden explícita de Roberto (permiso ya dado para hasta 100
//   ejemplos en su cuenta de prueba, cuando él lo diga).
//
import { pathToFileURL } from 'node:url';

import { abrirFirestoreAdmin, leerBanderas } from './admin.mjs';
import { generarHistorial, hoyEnElSalvador } from './historial.mjs';

const LOTE_MAXIMO = 500;

export async function sembrarHistorial(db, { uid, semilla = 12, hoy = hoyEnElSalvador() }) {
  if (!uid) {
    throw new Error('Falta el uid: sembrarHistorial necesita --uid <uid>.');
  }
  const globales = await db.collection('categorias').where('global', '==', true).get();
  const categorias = globales.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
  if (categorias.length === 0) {
    throw new Error(
      'No hay categorías con global: true. Corre primero marcar-categorias-produccion.mjs.',
    );
  }
  const historial = generarHistorial({ uid, semilla, hoy, categorias });

  const loteCarteras = db.batch();
  for (const cartera of historial.carteras) {
    // merge: true: si la cartera ya existía (por ejemplo la de las semillas
    // por persona), conserva lo demás y solo asegura nombre y uid.
    loteCarteras.set(db.collection('carteras').doc(cartera.id), cartera, { merge: true });
  }
  await loteCarteras.commit();

  for (let inicio = 0; inicio < historial.transacciones.length; inicio += LOTE_MAXIMO) {
    const lote = db.batch();
    for (const transaccion of historial.transacciones.slice(inicio, inicio + LOTE_MAXIMO)) {
      const { id, ...datos } = transaccion;
      lote.set(db.collection('transacciones').doc(id), datos);
    }
    await lote.commit();
  }
  return { carteras: historial.carteras.length, transacciones: historial.transacciones.length };
}

function leerArgumentos(argv) {
  const opciones = { semilla: 12, hoy: hoyEnElSalvador() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--uid') {
      opciones.uid = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--semilla') {
      opciones.semilla = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--hoy') {
      opciones.hoy = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--produccion') {
      opciones.produccion = true;
    }
  }
  return opciones;
}

async function principal() {
  const banderas = leerBanderas(process.argv.slice(2));
  const opciones = leerArgumentos(process.argv.slice(2));
  if (!opciones.uid) {
    console.error('Falta --uid <uid>.');
    process.exit(2);
  }
  const { app, db } = abrirFirestoreAdmin(banderas);
  try {
    const resultado = await sembrarHistorial(db, opciones);
    console.log(`Sembradas ${resultado.transacciones} transacciones y ${resultado.carteras} carteras para ${opciones.uid} (semilla ${opciones.semilla}, hoy ${opciones.hoy}).`);
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
