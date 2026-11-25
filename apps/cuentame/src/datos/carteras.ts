import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

// Esquema del spec #54 para la colección carteras. El saldo NUNCA vive en el
// documento (ADR-0011): se calcula sumando sus transacciones.
export interface Cartera {
  id?: string;
  nombre: string;
}

export const coleccionCarteras = collection(db, 'carteras');

export async function crearCartera(nombre: string): Promise<string> {
  const referencia = await addDoc(coleccionCarteras, { nombre });
  return referencia.id;
}
