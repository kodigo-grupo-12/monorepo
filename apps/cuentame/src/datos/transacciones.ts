import { addDoc, collection } from 'firebase/firestore';
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
  categoria?: string;
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
