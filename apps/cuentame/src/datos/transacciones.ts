import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export type TipoTransaccion = 'gasto' | 'ingreso';

// Esquema del spec #44 para la colección transacciones.
export interface Transaccion {
  id?: string;
  tipo: TipoTransaccion;
  monto: number;
  nota?: string;
  fecha: string; // YYYY-MM-DD
  cuenta: string;
  categoria?: string; // legado de las semillas de la T006
  categoria_id?: string; // referencia a «categorias» (T007)
  cartera_id?: string; // referencia a «carteras» (T007)
  imagen?: string; // base64
}

export const coleccionTransacciones = collection(db, 'transacciones');

// La cuenta del MVP es siempre la demo.
export async function crearTransaccion(transaccion: Omit<Transaccion, 'id' | 'cuenta'>): Promise<string> {
  const entradas = Object.entries({ ...transaccion, cuenta: 'demo' }).filter(
    ([, valor]) => valor !== undefined,
  );
  const documento = Object.fromEntries(entradas);
  const referencia = await addDoc(coleccionTransacciones, documento);
  return referencia.id;
}

// Elimina el documento entero; la foto adjunta se va con él, porque la imagen
// vive en base64 dentro del documento (ADR-0009). Sin deshacer: el listener
// refresca la lista y los saldos calculados al instante.
export async function eliminarTransaccion(id: string): Promise<void> {
  await deleteDoc(doc(coleccionTransacciones, id));
}