import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'cuentame-sesion';
const VALOR = '1';

export const CORREO_DEMO = 'demo@cuentame.com';
export const CONTRASENA_DEMO = 'demo1234';

function enWeb(): boolean {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

export async function leerSesion(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!enWeb()) {
      return false;
    }
    return localStorage.getItem(CLAVE) === VALOR;
  }

  return (await SecureStore.getItemAsync(CLAVE)) === VALOR;
}

export async function guardarSesion(): Promise<void> {
  if (Platform.OS === 'web') {
    if (enWeb()) {
      localStorage.setItem(CLAVE, VALOR);
    }
    return;
  }

  await SecureStore.setItemAsync(CLAVE, VALOR);
}
