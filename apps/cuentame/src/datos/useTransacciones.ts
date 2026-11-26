import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

import { useSesion } from '../sesion/ProveedorSesion';
import { consultaTransaccionesPorDuenio } from './consultas';
import { db } from './firebase';
import type { Transaccion } from './transacciones';

export interface TransaccionesEstado {
  transacciones: Transaccion[];
  cargando: boolean;
  // Verdadero cuando la última escucha falló (sin conexión): el banner de
  // sincronización de la T013 lo lee.
  error: boolean;
}

function vaciar(): Transaccion[] {
  return [];
}

// Escucha en tiempo real el historial completo de la persona, ordenado por
// fecha y sin límite. Se cancela al cerrar sesión y no deja datos ajenos.
export function useTransacciones(): TransaccionesEstado {
  const { usuario } = useSesion();
  const uid = usuario?.uid;
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!uid) {
      setTransacciones(vaciar());
      setCargando(false);
      return;
    }
    setCargando(true);
    const escucha = onSnapshot(
      consultaTransaccionesPorDuenio(db, uid),
      (instantanea) => {
        setTransacciones(
          instantanea.docs.map((documento) => ({
            id: documento.id,
            ...(documento.data() as Omit<Transaccion, 'id'>),
          })),
        );
        setError(false);
        setCargando(false);
      },
      (error) => {
        console.error('No se pudieron escuchar las transacciones:', error);
        setTransacciones(vaciar());
        setError(true);
        setCargando(false);
      },
    );
    return () => {
      escucha();
      setTransacciones(vaciar());
    };
  }, [uid]);

  return { transacciones, cargando, error };
}
