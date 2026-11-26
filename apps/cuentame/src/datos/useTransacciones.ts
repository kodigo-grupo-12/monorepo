import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { coleccionTransacciones } from './transacciones';
import type { Transaccion } from './transacciones';

export interface TransaccionesEstado {
  transacciones: Transaccion[];
  cargando: boolean;
  // Verdadero cuando la última escucha falló (sin conexión): el banner de
  // sincronización de la T013 lo lee.
  error: boolean;
}

// Escucha en tiempo real: lo guardado aparece en todos lados sin recargar.
export function useTransacciones(): TransaccionesEstado {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const escucha = onSnapshot(
      query(coleccionTransacciones, orderBy('fecha', 'desc')),
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
        setError(true);
        setCargando(false);
      },
    );
    return escucha;
  }, []);

  return { transacciones, cargando, error };
}
