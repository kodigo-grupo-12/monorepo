import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { coleccionCarteras } from './carteras';
import type { Cartera } from './carteras';

export interface CarterasEstado {
  carteras: Cartera[];
  cargando: boolean;
}

// Escucha en tiempo real, al patrón de useTransacciones.
export function useCarteras(): CarterasEstado {
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const escucha = onSnapshot(
      coleccionCarteras,
      (instantanea) => {
        setCarteras(
          instantanea.docs
            .map((documento) => ({
              id: documento.id,
              ...(documento.data() as Omit<Cartera, 'id'>),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        );
        setCargando(false);
      },
      (error) => {
        console.error('No se pudieron escuchar las carteras:', error);
        setCargando(false);
      },
    );
    return escucha;
  }, []);

  return { carteras, cargando };
}
