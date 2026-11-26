import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

// La config web del proyecto vive en el .env de apps/cuentame (ver .env.example).
// Metro solo inlina accesos estáticos process.env.EXPO_PUBLIC_*: el bundle web
// estático no tiene proceso, así que process.env[nombre] dinámico queda vacío
// en el navegador. Validamos sobre un objeto con accesos estáticos.
const ENV = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Solo la web local contra los emuladores (pnpm emuladores). Acceso estático
// porque Metro solo inlina process.env.EXPO_PUBLIC_* literales.
const USAR_EMULADORES = process.env.EXPO_PUBLIC_USAR_EMULADORES === '1';

const NOMBRES = Object.keys(ENV) as (keyof typeof ENV)[];
const faltantes = NOMBRES.filter((nombre) => !ENV[nombre]);
if (faltantes.length > 0) {
  throw new Error(
    `Falta la configuración de Firebase en el .env de apps/cuentame: ${faltantes.join(', ')}. Copia .env.example como .env y llena los valores desde Firebase console.`,
  );
}

const config = {
  apiKey: ENV.EXPO_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: USAR_EMULADORES ? 'demo-cuentame' : (ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID as string),
  messagingSenderId: ENV.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: ENV.EXPO_PUBLIC_FIREBASE_APP_ID as string,
};

// Una sola instancia aunque el módulo se importe desde varios lugares.
export const firebase = getApps().length > 0 ? getApp() : initializeApp(config);
export const db = getFirestore(firebase);

// Solo con la variable encendida: apunta al emulador de Firestore, nunca al
// proyecto real. Pages y el CI no definen la variable, así que no llegan aquí.
if (USAR_EMULADORES) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
