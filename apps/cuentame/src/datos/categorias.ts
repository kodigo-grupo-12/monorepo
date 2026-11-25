import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export type TipoCategoria = 'gasto' | 'ingreso';

// Esquema del spec #54 para la colección categorias.
export interface Categoria {
  id?: string;
  nombre: string;
  tipo: TipoCategoria;
}

export const coleccionCategorias = collection(db, 'categorias');

export async function crearCategoria(nombre: string, tipo: TipoCategoria): Promise<string> {
  const referencia = await addDoc(coleccionCategorias, { nombre, tipo });
  return referencia.id;
}
