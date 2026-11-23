import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CLAVE = 'cuentame-sesion';
const MARCA_PRESENTE = '1';

function enWeb(): boolean {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

async function leerMarca(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return enWeb() ? localStorage.getItem(CLAVE) : null;
  }

  return SecureStore.getItemAsync(CLAVE);
}

async function escribirMarca(): Promise<void> {
  if (Platform.OS === 'web') {
    if (enWeb()) {
      localStorage.setItem(CLAVE, MARCA_PRESENTE);
    }
    return;
  }

  await SecureStore.setItemAsync(CLAVE, MARCA_PRESENTE);
}

export async function leerSesion(): Promise<boolean> {
  return (await leerMarca()) === MARCA_PRESENTE;
}

export async function guardarSesion(): Promise<void> {
  await escribirMarca();
}
