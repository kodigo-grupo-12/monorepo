import { useLayoutEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export const colores = {
  claro: {
    fondo: '#DDE2DE',
    texto: '#1A1A1A',
    credito: '#3D4A42',
  },
  oscuro: {
    fondo: '#121417',
    texto: '#F4F7F5',
    credito: '#C5CDC8',
  },
} as const;

export type NombreDeEsquema = keyof typeof colores;

function aNombre(sistema: ColorSchemeName | null | undefined): NombreDeEsquema {
  return sistema === 'dark' ? 'oscuro' : 'claro';
}

function esquemaDeLaVentana(): NombreDeEsquema | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function usarPaleta() {
  const [esquema, setEsquema] = useState<NombreDeEsquema>('claro');

  useLayoutEffect(() => {
    setEsquema(esquemaDeLaVentana() ?? aNombre(Appearance.getColorScheme()));
    const suscripcion = Appearance.addChangeListener(({ colorScheme }) => {
      setEsquema(esquemaDeLaVentana() ?? aNombre(colorScheme));
    });
    return () => suscripcion.remove();
  }, []);

  return { esquema, ...colores[esquema] };
}
