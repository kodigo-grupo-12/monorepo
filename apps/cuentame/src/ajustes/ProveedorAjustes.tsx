import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { guardarAjustes, leerAjustes } from './guardarAjustes';
import type { Ajustes } from './tipoAjustes';

export const AJUSTES_POR_DEFECTO: Ajustes = {
  animaciones: true,
  avisos: true,
};

type EstadoAjustes = {
  ajustes: Ajustes;
  // Verdadero cuando el storage ya respondió; mientras tanto el consumo
  // pinta el valor por defecto y no parpadea.
  listos: boolean;
  cambiar: (cambio: Partial<Ajustes>) => void;
};

const Contexto = createContext<EstadoAjustes | null>(null);

export function ProveedorAjustes({ children }: { children: ReactNode }) {
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO);
  const [listos, setListos] = useState(false);

  useEffect(() => {
    let vivo = true;
    leerAjustes()
      .then((guardados) => {
        if (vivo) {
          setAjustes({ ...AJUSTES_POR_DEFECTO, ...guardados });
        }
      })
      .catch(() => {
        // Sin ajustes guardados se quedan los de fábrica.
      })
      .finally(() => {
        if (vivo) {
          setListos(true);
        }
      });
    return () => {
      vivo = false;
    };
  }, []);

  const estado = useMemo<EstadoAjustes>(
    () => ({
      ajustes,
      listos,
      cambiar: (cambio) => {
        setAjustes((previo) => {
          const nuevos = { ...previo, ...cambio };
          // El guardado va fuera del render: si falla, la pantalla ya
          // quedó como la persona la dejó y el siguiente arranque vuelve
          // al valor anterior.
          void guardarAjustes(nuevos).catch(() => undefined);
          return nuevos;
        });
      },
    }),
    [ajustes, listos],
  );

  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>;
}

export function useAjustes(): EstadoAjustes {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useAjustes va dentro de ProveedorAjustes');
  }
  return valor;
}
