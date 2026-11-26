import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';

import { uidDeSesion } from '../sesion/auth';
import {
  COLECCION_TRANSACCIONES,
  cambiosTransaccion,
  documentoNuevaTransaccion,
  type DatosNuevaTransaccion,
} from './consultas';
import { db } from './firebase';

export type TipoTransaccion = 'gasto' | 'ingreso';

// Esquema del spec #44 para la colección transacciones. uid lo pone la
// capa de datos. cuenta es legado de solo lectura y ya no se escribe.
export interface Transaccion {
  id?: string;
  uid?: string;
  tipo: TipoTransaccion;
  monto: number;
  nota?: string;
  fecha: string; // YYYY-MM-DD
  cuenta?: string;
  categoria?: string; // legado de las semillas de la T006
  categoria_id?: string; // referencia a «categorias» (T007)
  cartera_id?: string; // referencia a «carteras» (T007)
  imagen?: string; // base64
}

export const coleccionTransacciones = collection(db, COLECCION_TRANSACCIONES);

export async function crearTransaccion(transaccion: DatosNuevaTransaccion): Promise<string> {
  const referencia = await addDoc(
    coleccionTransacciones,
    documentoNuevaTransaccion(transaccion, uidDeSesion()),
  );
  return referencia.id;
}

export async function eliminarTransaccion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLECCION_TRANSACCIONES, id));
}

// Actualiza el documento con el mismo id (ADR-0012). Un opcional que llega
// indefinido (nota vacía, imagen quitada) se borra del documento en vez de
// quedarse con su valor viejo. El uid no se toca.
export async function actualizarTransaccion(
  id: string,
  cambios: DatosNuevaTransaccion,
): Promise<void> {
  const documento: DocumentData = {};
  for (const [clave, valor] of Object.entries(cambiosTransaccion(cambios))) {
    documento[clave] = valor === undefined ? deleteField() : valor;
  }
  await updateDoc(doc(db, COLECCION_TRANSACCIONES, id), documento);
}
