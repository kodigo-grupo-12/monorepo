// Semillas de demo para la colección transacciones (ADR-0010).
// Idempotente: solo escribe si la colección está vacía. Es una herramienta
// de desarrollo: no corre en el arranque de la app.
//
//   node apps/cuentame/scripts/sembrar-demo.mjs
//
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

const nombres = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const deEntorno = Object.fromEntries(nombres.map((nombre) => [nombre, process.env[nombre]]));

// Sin variables en el entorno, las lee del .env que vive junto al proyecto.
if (Object.values(deEntorno).some((valor) => !valor)) {
  const rutaEnv = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  try {
    for (const linea of readFileSync(rutaEnv, 'utf8').split('\n')) {
      const coincidencia = linea.match(/^([A-Z0-9_]+)=(.*)$/);
      if (coincidencia && nombres.includes(coincidencia[1]) && !deEntorno[coincidencia[1]]) {
        deEntorno[coincidencia[1]] = coincidencia[2].trim();
      }
    }
  } catch {
    // El mensaje de abajo lo dice con claridad.
  }
}

const config = {
  apiKey: deEntorno.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: deEntorno.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: deEntorno.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: deEntorno.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: deEntorno.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const faltantes = Object.entries(config)
  .filter(([, valor]) => !valor)
  .map(([nombre]) => nombre);
if (faltantes.length > 0) {
  console.error(
    `Falta la configuración de Firebase (${faltantes.join(', ')}). Copia .env.example como apps/cuentame/.env y llena los valores.`,
  );
  process.exit(1);
}

// Las cinco semillas del spec #44, todas Gasto y con categoría.
const semillas = [
  { fecha: '2026-11-01', nota: 'Pago internet Tigo', monto: 39.99, categoria: 'Servicios Básicos' },
  { fecha: '2026-11-05', nota: 'Pago a CAESS energía eléctrica', monto: 25.0, categoria: 'Servicios Básicos' },
  { fecha: '2026-11-07', nota: 'Pago a Anda Agua Potable', monto: 4.0, categoria: 'Servicios Básicos' },
  { fecha: '2026-11-09', nota: 'Compra de gasolina Moto Honda', monto: 6.0, categoria: 'Transporte' },
  { fecha: '2026-11-12', nota: 'Compra de pupusas', monto: 10.0, categoria: 'Recreación' },
].map((semilla) => ({ ...semilla, tipo: 'gasto', cuenta: 'demo' }));

const app = initializeApp(config);
const db = getFirestore(app);
const referencia = collection(db, 'transacciones');

const existentes = await getDocs(referencia);
if (existentes.size > 0) {
  console.log(`La colección ya tiene ${existentes.size} transacciones; nada que sembrar.`);
  process.exit(0);
}

const lote = writeBatch(db);
for (const semilla of semillas) {
  lote.set(doc(referencia), semilla);
}
await lote.commit();
console.log(`Sembradas ${semillas.length} transacciones de demo.`);
