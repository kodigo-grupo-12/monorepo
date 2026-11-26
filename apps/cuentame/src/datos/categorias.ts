import { addDoc, collection } from 'firebase/firestore';

import { uidDeSesion } from '../sesion/auth';
import { COLECCION_CATEGORIAS, documentoNuevaCategoria } from './consultas';
import { db } from './firebase';

export type TipoCategoria = 'gasto' | 'ingreso';

// Esquema del spec #54. Las de producción: global: true y sin uid.
// Las que crea la persona: uid de la sesión y sin global.
export interface Categoria {
  id?: string;
  uid?: string;
  global?: boolean;
  nombre: string;
  tipo: TipoCategoria;
}

export const coleccionCategorias = collection(db, COLECCION_CATEGORIAS);

export async function crearCategoria(nombre: string, tipo: TipoCategoria): Promise<string> {
  const referencia = await addDoc(
    coleccionCategorias,
    documentoNuevaCategoria(nombre, tipo, uidDeSesion()),
  );
  return referencia.id;
}
