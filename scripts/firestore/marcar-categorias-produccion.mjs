// Marca las 14 categorías de producción con global: true, idempotente.
//
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/firestore/marcar-categorias-produccion.mjs
//
import { pathToFileURL } from 'node:url';

import { CATEGORIAS_PRODUCCION, abrirFirestoreAdmin, leerBanderas } from './admin.mjs';

// minúsculas, sin tildes, espacios a guiones: «Comida y bebida» → comida-y-bebida
export function slugDe(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

// Para cada una de las 14 busca, entre los documentos de categorias sin uid,
// el que tenga ese nombre y tipo:
// - hay uno: le pone global: true si no lo tiene;
// - no hay ninguno: lo crea con id produccion-<slug> y { nombre, tipo, global: true };
// - hay más de uno: no marca ninguno de esos, lista los ids y sale con código 1.
//
// Nunca escribe global en un documento con uid: solo mira documentos sin uid
// y los documentos nuevos no llevan uid.
export async function marcarCategoriasProduccion(db) {
  const instantanea = await db.collection('categorias').get();
  const sinUid = instantanea.docs.filter((documento) => documento.data().uid === undefined);
  const porClave = new Map();
  for (const documento of sinUid) {
    const clave = `${documento.data().tipo}|${documento.data().nombre}`;
    porClave.set(clave, [...(porClave.get(clave) ?? []), documento.id]);
  }

  const resultado = { marcadas: 0, creadas: 0, yaEstaban: 0, duplicadas: [] };
  const limpias = [];
  for (const categoria of CATEGORIAS_PRODUCCION) {
    const ids = porClave.get(`${categoria.tipo}|${categoria.nombre}`) ?? [];
    if (ids.length > 1) {
      resultado.duplicadas.push({ ...categoria, ids });
    } else {
      limpias.push({ categoria, ids });
    }
  }
  if (resultado.duplicadas.length > 0) {
    const detalle = resultado.duplicadas
      .map((duplicada) => `${duplicada.tipo}|${duplicada.nombre}: ${duplicada.ids.join(', ')}`)
      .join(' · ');
    throw new Error(`Categorías duplicadas sin uid, no marco ninguna: ${detalle}`);
  }

  const lote = db.batch();
  for (const { categoria, ids } of limpias) {
    if (ids.length === 0) {
      lote.set(db.collection('categorias').doc(`produccion-${slugDe(categoria.nombre)}`), {
        nombre: categoria.nombre,
        tipo: categoria.tipo,
        global: true,
      });
      resultado.creadas += 1;
    } else {
      const documento = await db.collection('categorias').doc(ids[0]).get();
      if (documento.data().global === true) {
        resultado.yaEstaban += 1;
      } else {
        lote.update(db.collection('categorias').doc(ids[0]), { global: true });
        resultado.marcadas += 1;
      }
    }
  }
  await lote.commit();
  return resultado;
}

async function principal() {
  const banderas = leerBanderas(process.argv.slice(2));
  const { app, db } = abrirFirestoreAdmin(banderas);
  try {
    const resultado = await marcarCategoriasProduccion(db);
    console.log(
      `Marcadas: ${resultado.marcadas} · Creadas: ${resultado.creadas} · Ya estaban: ${resultado.yaEstaban} · Duplicadas: ${resultado.duplicadas.length}`,
    );
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
