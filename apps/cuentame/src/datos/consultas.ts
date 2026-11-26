import {
  collection,
  orderBy,
  query,
  where,
  type DocumentData,
  type Firestore,
  type Query,
} from 'firebase/firestore';

export const COLECCION_TRANSACCIONES = 'transacciones';
export const COLECCION_CATEGORIAS = 'categorias';
export const COLECCION_CARTERAS = 'carteras';

export type DatosNuevaTransaccion = {
  tipo: 'gasto' | 'ingreso';
  monto: number;
  fecha: string;
  nota?: string;
  categoria?: string;
  categoria_id?: string;
  cartera_id?: string;
  imagen?: string;
};

function sinIndefinidos(valores: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== undefined));
}

// El uid lo pone la capa de datos. Nunca cuenta: 'demo' ni global junto al uid.
export function documentoNuevaTransaccion(
  datos: DatosNuevaTransaccion,
  uid: string,
): DocumentData {
  return sinIndefinidos({
    uid,
    tipo: datos.tipo,
    monto: datos.monto,
    fecha: datos.fecha,
    nota: datos.nota,
    categoria: datos.categoria,
    categoria_id: datos.categoria_id,
    cartera_id: datos.cartera_id,
    imagen: datos.imagen,
  });
}

export function documentoNuevaCategoria(
  nombre: string,
  tipo: 'gasto' | 'ingreso',
  uid: string,
): { uid: string; nombre: string; tipo: 'gasto' | 'ingreso' } {
  return { uid, nombre, tipo };
}

export function documentoNuevaCartera(nombre: string, uid: string): { uid: string; nombre: string } {
  return { uid, nombre };
}

export function cambiosTransaccion(
  cambios: DatosNuevaTransaccion,
): Record<string, unknown> {
  return {
    tipo: cambios.tipo,
    monto: cambios.monto,
    fecha: cambios.fecha,
    nota: cambios.nota,
    categoria: cambios.categoria,
    categoria_id: cambios.categoria_id,
    cartera_id: cambios.cartera_id,
    imagen: cambios.imagen,
  };
}

// Historial completo de la persona, más reciente primero. Sin limit ni período.
export function consultaTransaccionesPorDuenio(db: Firestore, uid: string): Query {
  return query(
    collection(db, COLECCION_TRANSACCIONES),
    where('uid', '==', uid),
    orderBy('fecha', 'desc'),
  );
}

export function consultaCarterasPorDuenio(db: Firestore, uid: string): Query {
  return query(collection(db, COLECCION_CARTERAS), where('uid', '==', uid));
}

export function consultaCategoriasPropias(db: Firestore, uid: string): Query {
  return query(collection(db, COLECCION_CATEGORIAS), where('uid', '==', uid));
}

export function consultaCategoriasGlobales(db: Firestore): Query {
  return query(collection(db, COLECCION_CATEGORIAS), where('global', '==', true));
}
