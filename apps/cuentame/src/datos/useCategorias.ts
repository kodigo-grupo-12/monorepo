import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useSesion } from '../sesion/ProveedorSesion';
import { consultaCategoriasGlobales, consultaCategoriasPropias } from './consultas';
import { db } from './firebase';
import type { Categoria } from './categorias';

export interface CategoriasEstado {
  categorias: Categoria[];
  cargando: boolean;
}

function vaciar(): Categoria[] {
  return [];
}

// Orden del modelo de Categorías: la lista de producción en su orden fijo y
// las que crea la persona después, por nombre.
const ORDEN_GASTO = [
  'Comida y bebida',
  'Transporte',
  'Compras',
  'Educación',
  'Entretenimiento',
  'Facturas y servicios',
  'Familia',
  'Salud',
  'Invertir',
  'Otros gastos',
];
const ORDEN_INGRESO = ['Salario', 'Otros ingresos', 'Transferencia entrante', 'Recolectar intereses'];

function claveOrden(categoria: Categoria): number {
  const lista = categoria.tipo === 'gasto' ? ORDEN_GASTO : ORDEN_INGRESO;
  const indice = lista.indexOf(categoria.nombre);
  return indice === -1 ? lista.length : indice;
}

export function ordenarCategorias(categorias: Categoria[]): Categoria[] {
  return [...categorias].sort(
    (a, b) => claveOrden(a) - claveOrden(b) || a.nombre.localeCompare(b.nombre),
  );
}

// Une las categorías de producción (global: true) con las de la persona.
// Las dos consultas son las que permiten las reglas; se cancelan al salir.
export function useCategorias(): CategoriasEstado {
  const { usuario } = useSesion();
  const uid = usuario?.uid;
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCategorias(vaciar());
      setCargando(false);
      return;
    }

    setCargando(true);
    let propias: Categoria[] = [];
    let globales: Categoria[] = [];
    let propiasListas = false;
    let globalesListas = false;

    const publicar = () => {
      if (!propiasListas || !globalesListas) {
        return;
      }
      setCategorias(ordenarCategorias([...globales, ...propias]));
      setCargando(false);
    };

    const deDocumento = (id: string, datos: Omit<Categoria, 'id'>): Categoria => ({
      id,
      ...datos,
    });

    const dejarPropias = onSnapshot(
      consultaCategoriasPropias(db, uid),
      (instantanea) => {
        propias = instantanea.docs.map((documento) =>
          deDocumento(documento.id, documento.data() as Omit<Categoria, 'id'>),
        );
        propiasListas = true;
        publicar();
      },
      (error) => {
        console.error('No se pudieron escuchar las categorías propias:', error);
        propias = [];
        propiasListas = true;
        publicar();
      },
    );

    const dejarGlobales = onSnapshot(
      consultaCategoriasGlobales(db),
      (instantanea) => {
        globales = instantanea.docs.map((documento) =>
          deDocumento(documento.id, documento.data() as Omit<Categoria, 'id'>),
        );
        globalesListas = true;
        publicar();
      },
      (error) => {
        console.error('No se pudieron escuchar las categorías de producción:', error);
        globales = [];
        globalesListas = true;
        publicar();
      },
    );

    return () => {
      dejarPropias();
      dejarGlobales();
      setCategorias(vaciar());
    };
  }, [uid]);

  return { categorias, cargando };
}
