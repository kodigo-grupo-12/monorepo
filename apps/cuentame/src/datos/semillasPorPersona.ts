import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
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

// Las 6 semillas que recibe cada persona al entrar por primera vez, las mismas
// del sembrador que hubo hasta hoy (ADR-0010). El saldo de Efectivo queda en
// $515.01: 600.00 de Salario menos los 5 gastos.
export const SEMILLAS_POR_PERSONA: readonly {
  fecha: string;
  nota: string;
  monto: number;
  tipo: 'gasto' | 'ingreso';
  categoria: string;
}[] = [
  { fecha: '2026-11-01', nota: 'Pago internet Tigo', monto: 39.99, tipo: 'gasto', categoria: 'Facturas y servicios' },
  { fecha: '2026-11-05', nota: 'Pago a CAESS energía eléctrica', monto: 25.0, tipo: 'gasto', categoria: 'Facturas y servicios' },
  { fecha: '2026-11-07', nota: 'Pago a Anda Agua Potable', monto: 4.0, tipo: 'gasto', categoria: 'Facturas y servicios' },
  { fecha: '2026-11-09', nota: 'Compra de gasolina Moto Honda', monto: 6.0, tipo: 'gasto', categoria: 'Transporte' },
  { fecha: '2026-11-12', nota: 'Compra de pupusas', monto: 10.0, tipo: 'gasto', categoria: 'Comida y bebida' },
  { fecha: '2026-11-01', nota: 'Salario', monto: 600.0, tipo: 'ingreso', categoria: 'Salario' },
];

// La primera vez que una persona entra le crea su cartera Efectivo y sus 6
// semillas, con ids deterministas (`efectivo-<uid>`, `semilla-<uid>-1..6`) y
// todas con su uid. Idempotente: si ya tiene una cartera o una transacción,
// no escribe nada.
//
// Nunca hace getDoc de un id propio que quizá no existe: las reglas lo niegan
// cuando el documento falta (resource queda null). Se consulta por uid.
export async function sembrarPrimeraEntrada(
  db: Firestore,
  uid: string,
): Promise<'sembrada' | 'ya-tenia-datos'> {
  const carteras = await getDocs(consultaCarterasPorDuenio(db, uid));
  if (!carteras.empty) {
    return 'ya-tenia-datos';
  }
  const transacciones = await getDocs(
    query(collection(db, COLECCION_TRANSACCIONES), where('uid', '==', uid), limit(1)),
  );
  if (!transacciones.empty) {
    return 'ya-tenia-datos';
  }

  // Las categorías de producción existen con global: true (el marcado se hizo
  // en producción el 2026-11-26 y el script lo siembra en el emulador). Si una
  // no está, la transacción va sin categoria_id.
  const globales = await getDocs(consultaCategoriasGlobales(db));
  const idPorNombre = new Map(
    globales.docs.map((documento) => [documento.data().nombre as string, documento.id]),
  );

  const carteraId = `efectivo-${uid}`;
  const lote = writeBatch(db);
  lote.set(doc(db, COLECCION_CARTERAS, carteraId), { uid, nombre: 'Efectivo' });
  SEMILLAS_POR_PERSONA.forEach((semilla, indice) => {
    const categoriaId = idPorNombre.get(semilla.categoria);
    lote.set(doc(db, COLECCION_TRANSACCIONES, `semilla-${uid}-${indice + 1}`), {
      uid,
      tipo: semilla.tipo,
      monto: semilla.monto,
      fecha: semilla.fecha,
      nota: semilla.nota,
      ...(categoriaId ? { categoria_id: categoriaId } : {}),
      cartera_id: carteraId,
    });
  });
  await lote.commit();
  return 'sembrada';
}
