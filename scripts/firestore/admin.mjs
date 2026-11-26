// Helpers compartidos por los scripts de administración de Firestore.
// Todos usan firebase-admin y se niegan a correr contra producción sin
// --produccion: producción se toca solo con la orden explícita de Roberto,
// desde su máquina y con credenciales de administración.
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Las 14 categorías de producción, en el orden de ORDEN_GASTO y
// ORDEN_INGRESO de apps/cuentame/src/datos/useCategorias.ts. Lista congelada
// (issue #50): el script no inventa, renombra ni agrega.
export const CATEGORIAS_PRODUCCION = [
  { nombre: 'Comida y bebida', tipo: 'gasto' },
  { nombre: 'Transporte', tipo: 'gasto' },
  { nombre: 'Compras', tipo: 'gasto' },
  { nombre: 'Educación', tipo: 'gasto' },
  { nombre: 'Entretenimiento', tipo: 'gasto' },
  { nombre: 'Facturas y servicios', tipo: 'gasto' },
  { nombre: 'Familia', tipo: 'gasto' },
  { nombre: 'Salud', tipo: 'gasto' },
  { nombre: 'Invertir', tipo: 'gasto' },
  { nombre: 'Otros gastos', tipo: 'gasto' },
  { nombre: 'Salario', tipo: 'ingreso' },
  { nombre: 'Otros ingresos', tipo: 'ingreso' },
  { nombre: 'Transferencia entrante', tipo: 'ingreso' },
  { nombre: 'Recolectar intereses', tipo: 'ingreso' },
];

// Lee --produccion y --confirmar de la línea de comandos.
export function leerBanderas(argv) {
  return {
    produccion: argv.includes('--produccion'),
    confirmar: argv.includes('--confirmar'),
  };
}

// Abre Firestore con firebase-admin.
//
// | Llamada                                  | Resultado                          |
// | ---------------------------------------- | ---------------------------------- |
// | sin --produccion y sin emulador          | Error: solo el emulador            |
// | --produccion y con FIRESTORE_EMULATOR_HOST | Error: ambiguo, quita uno        |
// | --produccion, sin emulador               | kodigo-grupo12 con applicationDefault |
// | contra el emulador                       | projectId del entorno (demo-cuentame) |
//
// Devuelve { app, db }; el que llama cierra con app.delete().
export function abrirFirestoreAdmin({ produccion }) {
  const emulador = process.env.FIRESTORE_EMULATOR_HOST;
  if (!produccion && !emulador) {
    throw new Error('Sin --produccion este script solo corre contra el emulador.');
  }
  if (produccion && emulador) {
    throw new Error(
      'Ambiguo: FIRESTORE_EMULATOR_HOST y --produccion a la vez. Quita uno de los dos.',
    );
  }
  if (produccion) {
    const app = initializeApp({ credential: applicationDefault(), projectId: 'kodigo-grupo12' });
    return { app, db: getFirestore(app) };
  }
  const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-cuentame' });
  return { app, db: getFirestore(app) };
}
