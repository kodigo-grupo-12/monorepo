import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Ajustes } from './tipoAjustes';

const CLAVE = 'cuentame-ajustes';

// Persistencia local de los ajustes, sin tocar Firestore: en web
// localStorage y en el dispositivo SecureStore, el mismo patrón de la
// sesión. Nada de librerías nuevas.
function enWeb(): boolean {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

export async function leerAjustes(): Promise<Partial<Ajustes>> {
  const texto = Platform.OS === 'web'
    ? enWeb() ? localStorage.getItem(CLAVE) : null
    : await SecureStore.getItemAsync(CLAVE);

  if (!texto) {
    return {};
  }

  try {
    const datos = JSON.parse(texto) as Record<string, unknown>;
    const ajustes: Partial<Ajustes> = {};
    if (typeof datos.animaciones === 'boolean') {
      ajustes.animaciones = datos.animaciones;
    }
    if (typeof datos.avisos === 'boolean') {
      ajustes.avisos = datos.avisos;
    }
    return ajustes;
  } catch {
    return {};
  }
}

export async function guardarAjustes(ajustes: Ajustes): Promise<void> {
  const texto = JSON.stringify(ajustes);
  if (Platform.OS === 'web') {
    if (enWeb()) {
      localStorage.setItem(CLAVE, texto);
    }
    return;
  }

  await SecureStore.setItemAsync(CLAVE, texto);
}
