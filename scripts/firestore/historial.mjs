// Generador puro del historial sembrado (issue #112). Nada aquí toca Firestore
// ni usa Math.random ni la hora: con la misma semilla y el mismo hoy devuelve
// exactamente lo mismo, para que la siembra sea reproducible.
//
//   generarHistorial({ uid, semilla, hoy, categorias })
//
// categorias es [{ id, nombre, tipo }] con las 14 de producción: lanza si
// falta alguna.

// PRNG determinista mulberry32.
export function mulberry32(semilla) {
  let a = semilla | 0;
  return function siguiente() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Montos por categoría en centavos, con mínimo y máximo inclusivos.
const TOPES_GASTO = {
  'Comida y bebida': [300, 2500],
  Transporte: [200, 4000],
  Compras: [1000, 12000],
  Educación: [2000, 15000],
  Entretenimiento: [500, 6000],
  'Facturas y servicios': [1500, 9000],
  Familia: [1000, 10000],
  Salud: [800, 8000],
  Invertir: [5000, 20000],
  'Otros gastos': [200, 5000],
};

// El día pico no debe tener competencia: ningún otro día suma 400.00 o más
// (el pico suma 660.00, y 660 ≥ 1.5 × 400). Al colocar cada gasto aleatorio
// se re-dibuja la fecha mientras su día llegue al tope.
const TOPE_DIA = 40000;

export function hoyEnElSalvador() {
  return new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10);
}

function rangoDeFechas(hoy) {
  const [anho, mes, dia] = hoy.split('-').map(Number);
  // 11 meses antes del mes de hoy, día 1.
  const inicio = new Date(Date.UTC(anho, mes - 1 - 11, 1));
  const fin = new Date(Date.UTC(anho, mes - 1, dia));
  const fechas = [];
  for (let t = inicio.getTime(); t <= fin.getTime(); t += 86400_000) {
    fechas.push(new Date(t).toISOString().slice(0, 10));
  }
  return fechas;
}

function diaPico(hoy) {
  const [anho, mes] = hoy.split('-').map(Number);
  return new Date(Date.UTC(anho, mes - 1 - 2, 15)).toISOString().slice(0, 10);
}

function numeroEntre(siguiente, minimo, maximo) {
  return minimo + Math.floor(siguiente() * (maximo - minimo + 1));
}

export function generarHistorial({ uid, semilla = 12, hoy = hoyEnElSalvador(), categorias }) {
  const nombresNecesarios = [...Object.keys(TOPES_GASTO), 'Salario', 'Otros ingresos', 'Transferencia entrante', 'Recolectar intereses'];
  const porNombre = new Map(categorias.map((categoria) => [categoria.nombre, categoria]));
  const faltantes = nombresNecesarios.filter((nombre) => !porNombre.has(nombre));
  if (faltantes.length > 0) {
    throw new Error(`Faltan categorías de producción para el historial: ${faltantes.join(', ')}`);
  }

  const siguiente = mulberry32(semilla);
  const fechas = rangoDeFechas(hoy);
  const pico = diaPico(hoy);
  const fechasAlAzar = fechas.filter((fecha) => fecha !== pico);

  const carteras = [
    { id: `efectivo-${uid}`, uid, nombre: 'Efectivo' },
    { id: `banco-${uid}`, uid, nombre: 'Banco' },
    { id: `tarjeta-${uid}`, uid, nombre: 'Tarjeta' },
  ];
  const transacciones = [];
  let consecutivo = 0;
  const agregada = (tipo, monto, fecha, categoria, carteraId) => {
    consecutivo += 1;
    transacciones.push({
      id: `hist-${uid}-${String(consecutivo).padStart(3, '0')}`,
      uid,
      tipo,
      monto: monto / 100,
      fecha,
      nota: `Ejemplo: ${categoria.nombre}`,
      categoria_id: categoria.id,
      cartera_id: carteraId,
    });
  };

  const idDe = (nombre) => porNombre.get(nombre);

  // 12 salarios: el día 1 de cada mes del rango, en Banco.
  const meses = [...new Set(fechas.map((fecha) => fecha.slice(0, 7)))];
  for (const mes of meses) {
    agregada('ingreso', 75000, `${mes}-01`, idDe('Salario'), `banco-${uid}`);
  }

  // 6 otros ingresos en meses distintos al azar: categoría al azar entre las
  // tres de ingreso que no son Salario, monto 15.00–250.00, Banco o Efectivo.
  const otrosNombres = ['Otros ingresos', 'Transferencia entrante', 'Recolectar intereses'];
  const mesesElegidos = new Set();
  while (mesesElegidos.size < 6) {
    mesesElegidos.add(meses[numeroEntre(siguiente, 0, meses.length - 1)]);
  }
  for (const mes of mesesElegidos) {
    const diasDelMes = fechas.filter((fecha) => fecha.slice(0, 7) === mes);
    const fecha = diasDelMes[numeroEntre(siguiente, 0, diasDelMes.length - 1)];
    const categoria = idDe(otrosNombres[numeroEntre(siguiente, 0, otrosNombres.length - 1)]);
    const carteraId = siguiente() < 0.5 ? `banco-${uid}` : `efectivo-${uid}`;
    agregada('ingreso', numeroEntre(siguiente, 1500, 25000), fecha, categoria, carteraId);
  }

  // 80 gastos: 77 al azar y los 3 del día pico (Compras: 180.00, 220.00,
  // 260.00, el 15 de hace dos meses).
  const nombresGasto = Object.keys(TOPES_GASTO);
  const sumaPorDia = new Map();
  const elegirFecha = (monto) => {
    for (let intento = 0; intento < 64; intento += 1) {
      const fecha = fechasAlAzar[numeroEntre(siguiente, 0, fechasAlAzar.length - 1)];
      if ((sumaPorDia.get(fecha) ?? 0) + monto < TOPE_DIA) {
        return fecha;
      }
    }
    // Sin fecha que quepa al azar: la primera del recorrido que sí quepa.
    return fechasAlAzar.find((fecha) => (sumaPorDia.get(fecha) ?? 0) + monto < TOPE_DIA) ?? fechasAlAzar[0];
  };
  for (let i = 0; i < 77; i += 1) {
    const nombre = nombresGasto[numeroEntre(siguiente, 0, nombresGasto.length - 1)];
    const categoria = idDe(nombre);
    const [minimo, maximo] = TOPES_GASTO[nombre];
    const monto = numeroEntre(siguiente, minimo, maximo);
    const fecha = elegirFecha(monto);
    sumaPorDia.set(fecha, (sumaPorDia.get(fecha) ?? 0) + monto);
    const carteraId = `${['efectivo', 'banco', 'tarjeta'][numeroEntre(siguiente, 0, 2)]}-${uid}`;
    agregada('gasto', monto, fecha, categoria, carteraId);
  }
  for (const monto of [18000, 22000, 26000]) {
    agregada('gasto', monto, pico, idDe('Compras'), `tarjeta-${uid}`);
    sumaPorDia.set(pico, (sumaPorDia.get(pico) ?? 0) + monto);
  }

  return { carteras, transacciones };
}
