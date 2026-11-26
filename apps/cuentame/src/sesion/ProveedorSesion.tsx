import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { db } from '../datos/firebase';
import { sembrarPrimeraEntrada } from '../datos/semillasPorPersona';
import { entrarConGoogle, observarAuth, salirDeAuth } from './auth';
import type { UsuarioSesion } from './usuario';

type EstadoDeSesion = {
  cargando: boolean;
  activa: boolean;
  usuario: UsuarioSesion | null;
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<EstadoDeSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);

  useEffect(() => {
    const dejar = observarAuth((siguiente) => {
      setUsuario(siguiente);
      setCargando(false);
      // Primera entrada de la persona: su cartera Efectivo y sus 6 semillas.
      // Falla en silencio (console.error) para no bloquear la sesión.
      if (siguiente) {
        void sembrarPrimeraEntrada(db, siguiente.uid).catch((error) =>
          console.error('No se pudieron crear las semillas:', error),
        );
      }
    });
    return dejar;
  }, []);

  const entrar = async () => {
    const siguiente = await entrarConGoogle();
    setUsuario(siguiente);
  };

  const salir = async () => {
    await salirDeAuth();
    setUsuario(null);
  };

  return (
    <Contexto.Provider
      value={{ cargando, activa: usuario !== null, usuario, entrar, salir }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSesion(): EstadoDeSesion {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useSesion va dentro de ProveedorSesion');
  }
  return valor;
}
