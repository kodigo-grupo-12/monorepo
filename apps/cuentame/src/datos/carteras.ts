import { addDoc, collection } from 'firebase/firestore';

import { uidDeSesion } from '../sesion/auth';
import { COLECCION_CARTERAS, documentoNuevaCartera } from './consultas';
import { db } from './firebase';

// Esquema del spec #54 para la colección carteras. El saldo NUNCA vive en el
// documento (ADR-0011): se calcula sumando sus transacciones. El uid lo pone
// la capa de datos.
export interface Cartera {
  id?: string;
  uid?: string;
  nombre: string;
}

export const coleccionCarteras = collection(db, COLECCION_CARTERAS);

export async function crearCartera(nombre: string): Promise<string> {
  const referencia = await addDoc(coleccionCarteras, documentoNuevaCartera(nombre, uidDeSesion()));
  return referencia.id;
}
