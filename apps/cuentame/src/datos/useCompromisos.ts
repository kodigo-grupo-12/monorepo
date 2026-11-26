import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useSesion } from '../sesion/ProveedorSesion';
import { consultaCompromisosPorDuenio } from './consultas';
import { db } from './firebase';
import type { Compromiso } from './compromisos';

export interface CompromisosEstado {
  compromisos: Compromiso[];
  cargando: boolean;
  // Verdadero cuando la última escucha falló (sin conexión).
  error: boolean;
}

function vaciar(): Compromiso[] {
  return [];
}

// Escucha en tiempo real los compromisos de la persona. La consulta no
// ordena (spec #130): el orden por fecha descendente se hace en el aparato.
// Se cancela al cerrar sesión y no deja datos ajenos.
export function useCompromisos(): CompromisosEstado {
  const { usuario } = useSesion();
  const uid = usuario?.uid;
  const [compromisos, setCompromisos] = useState<Compromiso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) {
      setCompromisos(vaciar());
      setCargando(false);
      return;
    }
    setCargando(true);
    const escucha = onSnapshot(
      consultaCompromisosPorDuenio(db, uid),
      (instantanea) => {
        setCompromisos(
          instantanea.docs
            .map((documento) => ({
              id: documento.id,
              ...(documento.data() as Omit<Compromiso, 'id'>),
            }))
            .sort((a, b) => (a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : 0)),
        );
        setError(false);
        setCargando(false);
      },
      (error) => {
        console.error('No se pudieron escuchar los compromisos:', error);
        setCompromisos(vaciar());
        setError(true);
        setCargando(false);
      },
    );
    return () => {
      escucha();
      setCompromisos(vaciar());
    };
  }, [uid]);

  return { compromisos, cargando, error };
}
