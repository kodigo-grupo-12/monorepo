import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { borrarSesion, guardarSesion, leerSesion } from './guardarSesion';

type EstadoDeSesion = {
  cargando: boolean;
  activa: boolean;
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<EstadoDeSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [activa, setActiva] = useState(false);

  useEffect(() => {
    let vivo = true;
    leerSesion()
      .then((hay) => {
        if (vivo) {
          setActiva(hay);
        }
      })
      .catch(() => {
        if (vivo) {
          setActiva(false);
        }
      })
      .finally(() => {
        if (vivo) {
          setCargando(false);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  const entrar = async () => {
    await guardarSesion();
    setActiva(true);
  };

  const salir = async () => {
    await borrarSesion();
    setActiva(false);
  };

  return <Contexto.Provider value={{ cargando, activa, entrar, salir }}>{children}</Contexto.Provider>;
}

export function useSesion(): EstadoDeSesion {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useSesion va dentro de ProveedorSesion');
  }
  return valor;
}
