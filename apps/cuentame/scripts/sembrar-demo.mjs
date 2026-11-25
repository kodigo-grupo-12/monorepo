// Semillas de demo reconciliadas (ADR-0010, spec #54, issue #59).
// Idempotente: correrlo dos veces deja el mismo estado. Es una herramienta
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
const {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  doc,
  updateDoc,
} = require('firebase/firestore');

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

// Lista de producción congelada del issue #50 (el agente no inventa nombres).
const categoriasProduccion = [
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

// Mapeo por nota de las semillas de la T006 hacia categorías de producción.
const porNota = {
  'Pago internet Tigo': 'Facturas y servicios',
  'Pago a CAESS energía eléctrica': 'Facturas y servicios',
  'Pago a Anda Agua Potable': 'Facturas y servicios',
  'Compra de gasolina Moto Honda': 'Transporte',
  'Compra de pupusas': 'Comida y bebida',
};

// Las categorías de la T006 eran ejemplos; se reconcilian por estas.
const legadas = {
  'Servicios Básicos': 'Facturas y servicios',
  Transporte: 'Transporte',
  Recreación: 'Comida y bebida',
};

const app = initializeApp(config);
const db = getFirestore(app);

async function leer(coleccion) {
  const instantanea = await getDocs(collection(db, coleccion));
  return instantanea.docs.map((documento) => ({ id: documento.id, ...documento.data() }));
}

// 1) Categorías de producción, sin duplicar por (tipo, nombre).
const categoriasExistentes = await leer('categorias');
const claveDe = (categoria) => `${categoria.tipo}|${categoria.nombre}`;
const idsCategorias = new Map(
  categoriasExistentes.map((categoria) => [claveDe(categoria), categoria.id]),
);
const faltantesCategorias = categoriasProduccion.filter((c) => !idsCategorias.has(claveDe(c)));
if (faltantesCategorias.length > 0) {
  const lote = writeBatch(db);
  for (const categoria of faltantesCategorias) {
    lote.set(doc(collection(db, 'categorias')), { nombre: categoria.nombre, tipo: categoria.tipo });
  }
  await lote.commit();
  console.log(`Sembradas ${faltantesCategorias.length} categorías de producción.`);
}
for (const categoria of categoriasProduccion) {
  if (!idsCategorias.has(claveDe(categoria))) {
    const encontrada = (await leer('categorias')).find((c) => claveDe(c) === claveDe(categoria));
    if (encontrada) {
      idsCategorias.set(claveDe(categoria), encontrada.id);
    }
  }
}

// 2) Cartera Efectivo, sin duplicar por nombre.
const carterasExistentes = await leer('carteras');
let idEfectivo = carterasExistentes.find((cartera) => cartera.nombre === 'Efectivo')?.id;
if (!idEfectivo) {
  const lote = writeBatch(db);
  lote.set(doc(collection(db, 'carteras')), { nombre: 'Efectivo' });
  await lote.commit();
  idEfectivo = (await leer('carteras')).find((cartera) => cartera.nombre === 'Efectivo')?.id;
  console.log('Sembrada la cartera Efectivo.');
}

function idDeCategoria(nombre) {
  if (!nombre) {
    return undefined;
  }
  return idsCategorias.get(`gasto|${nombre}`) ?? idsCategorias.get(`ingreso|${nombre}`);
}

// 3) Transacciones de la demo, todas en Efectivo y con categoria_id resuelto.
const transaccionesExistentes = await leer('transacciones');
const demo = transaccionesExistentes.filter((transaccion) => transaccion.cuenta === 'demo');
const semillas = [
  { fecha: '2026-11-01', nota: 'Pago internet Tigo', monto: 39.99, tipo: 'gasto' },
  { fecha: '2026-11-05', nota: 'Pago a CAESS energía eléctrica', monto: 25.0, tipo: 'gasto' },
  { fecha: '2026-11-07', nota: 'Pago a Anda Agua Potable', monto: 4.0, tipo: 'gasto' },
  { fecha: '2026-11-09', nota: 'Compra de gasolina Moto Honda', monto: 6.0, tipo: 'gasto' },
  { fecha: '2026-11-12', nota: 'Compra de pupusas', monto: 10.0, tipo: 'gasto' },
  {
    fecha: '2026-11-01',
    nota: 'Salario',
    monto: 600.0,
    tipo: 'ingreso',
    categoria_id: idDeCategoria('Salario'),
  },
].map((semilla) => ({ ...semilla, cuenta: 'demo', cartera_id: idEfectivo }));

let insertadas = 0;
if (transaccionesExistentes.length === 0) {
  const lote = writeBatch(db);
  for (const semilla of semillas) {
    lote.set(doc(collection(db, 'transacciones')), semilla);
  }
  await lote.commit();
  console.log(`Sembradas ${semillas.length} transacciones de demo.`);
} else {
  // La colección ya tiene datos: se reconcilia, no se duplica. Cada documento
  // demo sin ids recibe el cartera_id de Efectivo y el categoria_id de
  // producción por nota exacta o, si era un ejemplo de la T006, por su
  // categoría legada.
  const notasSembradas = new Set(semillas.map((semilla) => semilla.nota));
  let reconciliadas = 0;
  for (const transaccion of demo) {
    const cambios = {};
    if (!transaccion.cartera_id) {
      cambios.cartera_id = idEfectivo;
    }
    if (!transaccion.categoria_id) {
      const nombre = porNota[transaccion.nota] ?? legadas[transaccion.categoria];
      const id = idDeCategoria(nombre);
      if (id) {
        cambios.categoria_id = id;
      }
    }
    if (transaccion.tipo === 'ingreso' && transaccion.monto === 600) {
      // El Salario del issue #59 ya está: no se vuelve a insertar.
      continue;
    }
    if (Object.keys(cambios).length > 0) {
      await updateDoc(doc(db, 'transacciones', transaccion.id), cambios);
      reconciliadas += 1;
    }
  }
  if (reconciliadas > 0) {
    console.log(`Reconciliadas ${reconciliadas} transacciones existentes con categoria_id y cartera_id.`);
  }
  const salarioYaEsta = demo.some(
    (transaccion) => transaccion.tipo === 'ingreso' && transaccion.monto === 600,
  );
  if (!salarioYaEsta) {
    const lote = writeBatch(db);
    for (const semilla of semillas.filter(
      (semilla) => semilla.tipo === 'ingreso' || !notasSembradas.has(semilla.nota),
    )) {
      lote.set(doc(collection(db, 'transacciones')), semilla);
    }
    await lote.commit();
    console.log('Sembrado el Salario de $600.00 en Efectivo.');
  }
}

// 4) Comprobación del saldo en vivo: $600.00 − $84.99 = $515.01.
const finales = await leer('transacciones');
const enEfectivo = finales.filter((transaccion) => transaccion.cartera_id === idEfectivo);
const saldo = enEfectivo.reduce(
  (total, transaccion) =>
    transaccion.tipo === 'ingreso' ? total + transaccion.monto : total - transaccion.monto,
  0,
);
console.log(`Saldo Efectivo en vivo: $${saldo.toFixed(2)} (${enEfectivo.length} transacciones).`);
