import { useLayoutEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import { leerEsquema } from './leerEsquema';

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

function nombreDelEsquema(sistema: ColorSchemeName | null | undefined): NombreDeEsquema {
  return sistema === 'dark' ? 'oscuro' : 'claro';
}

export function usarPaleta() {
  const [esquema, setEsquema] = useState<NombreDeEsquema>('claro');

  useLayoutEffect(() => {
    const aplicar = () => setEsquema(nombreDelEsquema(leerEsquema()));
    aplicar();
    const suscripcion = Appearance.addChangeListener(aplicar);
    return () => suscripcion.remove();
  }, []);

  return { esquema, ...colores[esquema] };
}
