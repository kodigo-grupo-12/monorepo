import { createContext, useContext, type ReactNode } from 'react';

const Contexto = createContext(false);

type Propiedades = {
  activo: boolean;
  children: ReactNode;
};

export function ProveedorSplash({ activo, children }: Propiedades) {
  return <Contexto.Provider value={activo}>{children}</Contexto.Provider>;
}

export function useSplashActivo() {
  return useContext(Contexto);
}
