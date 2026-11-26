import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import {
  COLECCION_CARTERAS,
  COLECCION_TRANSACCIONES,
  consultaCarterasPorDuenio,
  consultaCategoriasGlobales,
} from './consultas';
import {
  generarHistorialEjemplo,
  hoyEnElSalvador,
  necesitaArranque,
  type OpcionArranque,
} from './historialEjemplo';

export type { OpcionArranque } from './historialEjemplo';

// El arranque elegible de cuenta nueva (spec #143, issue #146): la persona
// elige entre el historial de ejemplo salvadoreño (3 carteras y 173
// transacciones) y empezar de cero (solo su cartera Efectivo vacía).
// Idempotente con la misma guardia del sembrador anterior: si ya tiene una
// cartera o una transacción, no escribe nada.
//
// Nunca hace getDoc de un id propio que quizá no existe: las reglas lo
// niegan cuando el documento falta (resource queda null). Se consulta por uid.
async function estaVacia(db: Firestore, uid: string): Promise<boolean> {
  const carteras = await getDocs(consultaCarterasPorDuenio(db, uid));
  const transacciones = await getDocs(
    query(collection(db, COLECCION_TRANSACCIONES), where('uid', '==', uid), limit(1)),
  );
  return necesitaArranque(carteras.size, transacciones.size);
}

export async function sembrarArranque(
  db: Firestore,
  uid: string,
  opcion: OpcionArranque,
): Promise<'sembrada' | 'ya-tenia-datos'> {
  if (!(await estaVacia(db, uid))) {
    return 'ya-tenia-datos';
  }

  // Las categorías de producción existen con global: true (el marcado se
  // hizo en producción el 2026-11-26 y el script lo siembra en el emulador).
  // El generador referencia por nombre y falla ruidoso si falta alguna.
  const globales = await getDocs(consultaCategoriasGlobales(db));
  const categorias = globales.docs.map((documento) => ({
    id: documento.id,
    nombre: documento.data().nombre as string,
    tipo: documento.data().tipo as string | undefined,
  }));

  const lote = writeBatch(db);
  if (opcion === 'cero') {
    lote.set(doc(db, COLECCION_CARTERAS, `efectivo-${uid}`), { uid, nombre: 'Efectivo' });
  } else {
    const { carteras, transacciones } = generarHistorialEjemplo({
      uid,
      hoy: hoyEnElSalvador(),
      categorias,
    });
    for (const cartera of carteras) {
      lote.set(doc(db, COLECCION_CARTERAS, cartera.id), {
        uid: cartera.uid,
        nombre: cartera.nombre,
      });
    }
    for (const transaccion of transacciones) {
      lote.set(doc(db, COLECCION_TRANSACCIONES, transaccion.id), {
        uid: transaccion.uid,
        tipo: transaccion.tipo,
        monto: transaccion.monto,
        fecha: transaccion.fecha,
        nota: transaccion.nota,
        categoria_id: transaccion.categoria_id,
        cartera_id: transaccion.cartera_id,
      });
    }
  }
  await lote.commit();
  return 'sembrada';
}

// El reset de Configuración (issue #147): borra las carteras y las
// transacciones del uid. Las categorías (globales y propias) quedan intactas.
// En lotes de a 400, por el tope de 500 escrituras por lote.
export async function borrarContenidoDeDuenio(db: Firestore, uid: string): Promise<void> {
  const [carteras, transacciones] = await Promise.all([
    getDocs(consultaCarterasPorDuenio(db, uid)),
    getDocs(query(collection(db, COLECCION_TRANSACCIONES), where('uid', '==', uid))),
  ]);
  const documentos = [...carteras.docs, ...transacciones.docs];
  for (let inicio = 0; inicio < documentos.length; inicio += 400) {
    const lote = writeBatch(db);
    for (const documento of documentos.slice(inicio, inicio + 400)) {
      lote.delete(documento.ref);
    }
    await lote.commit();
  }
}
