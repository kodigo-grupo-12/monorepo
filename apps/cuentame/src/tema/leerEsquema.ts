import { Appearance, ColorSchemeName } from 'react-native';

export function leerEsquema(): ColorSchemeName | null {
  return Appearance.getColorScheme();
}
