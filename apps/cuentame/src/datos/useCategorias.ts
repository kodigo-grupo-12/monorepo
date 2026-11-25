import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { coleccionCategorias } from './categorias';
import type { Categoria } from './categorias';

export interface CategoriasEstado {
  categorias: Categoria[];
  cargando: boolean;
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

// Escucha en tiempo real, al patrón de useTransacciones. El orden del
// modelo se compone aquí para que pantalla y picker muestren lo mismo.
export function useCategorias(): CategoriasEstado {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const escucha = onSnapshot(
      coleccionCategorias,
      (instantanea) => {
        setCategorias(
          instantanea.docs
            .map((documento) => ({
              id: documento.id,
              ...(documento.data() as Omit<Categoria, 'id'>),
            }))
            .sort((a, b) => claveOrden(a) - claveOrden(b) || a.nombre.localeCompare(b.nombre)),
        );
        setCargando(false);
      },
      (error) => {
        console.error('No se pudieron escuchar las categorías:', error);
        setCargando(false);
      },
    );
    return escucha;
  }, []);

  return { categorias, cargando };
}
