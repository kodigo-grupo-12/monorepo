import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useSesion } from '../sesion/ProveedorSesion';
import { consultaCarterasPorDuenio } from './consultas';
import { db } from './firebase';
import type { Cartera } from './carteras';

export interface CarterasEstado {
  carteras: Cartera[];
  cargando: boolean;
}

function vaciar(): Cartera[] {
  return [];
}

// Escucha en tiempo real las carteras de la persona. Se cancela al cerrar
// sesión y no deja datos de la cuenta anterior.
export function useCarteras(): CarterasEstado {
  const { usuario } = useSesion();
  const uid = usuario?.uid;
  const [carteras, setCarteras] = useState<Cartera[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!uid) {
      setCarteras(vaciar());
      setCargando(false);
      return;
    }
    setCargando(true);
    const escucha = onSnapshot(
      consultaCarterasPorDuenio(db, uid),
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
        setCarteras(vaciar());
        setCargando(false);
      },
    );
    return () => {
      escucha();
      setCarteras(vaciar());
    };
  }, [uid]);

  return { carteras, cargando };
}
