import { ColorSchemeName } from 'react-native';

export function leerEsquema(): ColorSchemeName | null {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}
