// Generador puro del historial de ejemplo salvadoreño (spec #143, issue #144).
// Adaptado del generador del sembrador de línea de comandos
// (scripts/firestore/historial.mjs, issue #112): 173 transacciones y 3
// carteras (Efectivo, Banco, Tarjeta) con fechas relativas al `hoy` del
// primer ingreso. Nada aquí toca Firestore ni usa Math.random ni la hora:
// con el mismo uid y el mismo hoy devuelve exactamente lo mismo.
//
//   generarHistorialEjemplo({ uid, hoy, categorias })
//
// categorias es [{ id, nombre, tipo }] con las 14 de producción: lanza un
// error ruidoso si falta alguna.

// PRNG determinista mulberry32.
function mulberry32(semilla: number) {
  let a = semilla | 0;
  return function siguiente() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// La semilla nace del uid: la misma cuenta siempre ve el mismo historial y
// cuentas distintas ven historiales distintos, sin guardar nada.
function semillaDesdeUid(uid: string): number {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i += 1) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Montos por categoría en centavos, con mínimo y máximo inclusivos.
const TOPES_GASTO: Record<string, [number, number]> = {
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

// El día pico no debe tener competencia: ningún otro día llega a 400.00
// (el pico suma 541.75). Al colocar cada gasto aleatorio se re-dibuja la
// fecha mientras su día llegue al tope.
const TOPE_DIA = 40000;

// La cartera de efectivo solo carga compras pequeñas de contado: un gasto
// mayor a $60.00 ya no es de efectivo y va a Banco o Tarjeta (hallazgo del
// recorrido del PR #148, donde Efectivo terminó en -$2,588.42).
const TOPE_EFECTIVO = 6000;

// Los 3 movimientos del día pico (Comida y bebida, hace 3 meses, día 15,
// todos en Tarjeta): PriceSmart 512.90 + Campero 21.40 + pupusas 7.45
// = 541.75, para que las preguntas de la demo tengan respuesta clara.
const DIA_PICO: [string, number][] = [
  ['Ejemplo: PriceSmart', 51290],
  ['Ejemplo: Campero', 2140],
  ['Ejemplo: pupusas', 745],
];

const GASTOS_AL_AZAR = 152;

export interface SemillaCartera {
  id: string;
  uid: string;
  nombre: string;
}

export interface SemillaTransaccion {
  id: string;
  uid: string;
  tipo: 'gasto' | 'ingreso';
  monto: number;
  fecha: string;
  nota: string;
  categoria_id: string;
  cartera_id: string;
}

export interface CategoriaReferencia {
  id: string;
  nombre: string;
  tipo?: string;
}

// La fecha de hoy en El Salvador, UTC-6 fijo (ADR del Agente).
export function hoyEnElSalvador(): string {
  return new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10);
}

// La elección que la pantalla de bienvenida (issue #145) le pide a la
// persona: cargar el historial de ejemplo o empezar de cero.
export type OpcionArranque = 'ejemplo' | 'cero';

// La pantalla de bienvenida (spec #143) solo aparece cuando la cuenta está
// totalmente vacía: sin carteras y sin transacciones. Con cualquiera de las
// dos ya no se pregunta, así el reingreso con la misma cuenta no repregunta.
export function necesitaArranque(
  cantidadCarteras: number,
  cantidadTransacciones: number,
): boolean {
  return cantidadCarteras === 0 && cantidadTransacciones === 0;
}

function rangoDeFechas(hoy: string): string[] {
  const [anho, mes, dia] = hoy.split('-').map(Number);
  // 11 meses antes del mes de hoy, día 1: los últimos 12 meses.
  const inicio = new Date(Date.UTC(anho, mes - 1 - 11, 1));
  const fin = new Date(Date.UTC(anho, mes - 1, dia));
  const fechas: string[] = [];
  for (let t = inicio.getTime(); t <= fin.getTime(); t += 86400_000) {
    fechas.push(new Date(t).toISOString().slice(0, 10));
  }
  return fechas;
}

function diaPico(hoy: string): string {
  const [anho, mes] = hoy.split('-').map(Number);
  return new Date(Date.UTC(anho, mes - 1 - 3, 15)).toISOString().slice(0, 10);
}

function numeroEntre(siguiente: () => number, minimo: number, maximo: number): number {
  return minimo + Math.floor(siguiente() * (maximo - minimo + 1));
}

export function generarHistorialEjemplo({
  uid,
  hoy,
  categorias,
}: {
  uid: string;
  hoy: string;
  categorias: CategoriaReferencia[];
}): { carteras: SemillaCartera[]; transacciones: SemillaTransaccion[] } {
  const nombresNecesarios = [
    ...Object.keys(TOPES_GASTO),
    'Salario',
    'Otros ingresos',
    'Transferencia entrante',
    'Recolectar intereses',
  ];
  const porNombre = new Map(categorias.map((categoria) => [categoria.nombre, categoria]));
  const faltantes = nombresNecesarios.filter((nombre) => !porNombre.has(nombre));
  if (faltantes.length > 0) {
    throw new Error(`Faltan categorías de producción para el historial de ejemplo: ${faltantes.join(', ')}`);
  }
  const idDe = (nombre: string): CategoriaReferencia => {
    const categoria = porNombre.get(nombre);
    if (!categoria) {
      throw new Error(`No hay categoría de producción llamada ${nombre}`);
    }
    return categoria;
  };

  const siguiente = mulberry32(semillaDesdeUid(uid));
  const fechas = rangoDeFechas(hoy);
  const pico = diaPico(hoy);
  const fechasAlAzar = fechas.filter((fecha) => fecha !== pico);

  const carteras: SemillaCartera[] = [
    { id: `efectivo-${uid}`, uid, nombre: 'Efectivo' },
    { id: `banco-${uid}`, uid, nombre: 'Banco' },
    { id: `tarjeta-${uid}`, uid, nombre: 'Tarjeta' },
  ];
  const transacciones: SemillaTransaccion[] = [];
  let consecutivo = 0;
  const agregada = (
    tipo: 'gasto' | 'ingreso',
    monto: number,
    fecha: string,
    categoria: CategoriaReferencia,
    carteraId: string,
    nota: string = `Ejemplo: ${categoria.nombre}`,
  ) => {
    consecutivo += 1;
    transacciones.push({
      id: `semilla-${uid}-${String(consecutivo).padStart(3, '0')}`,
      uid,
      tipo,
      monto: monto / 100,
      fecha,
      nota,
      categoria_id: categoria.id,
      cartera_id: carteraId,
    });
  };

  // 12 salarios: el día 1 de cada mes del rango, en Banco.
  const meses = [...new Set(fechas.map((fecha) => fecha.slice(0, 7)))];
  for (const mes of meses) {
    agregada('ingreso', 75000, `${mes}-01`, idDe('Salario'), `banco-${uid}`);
  }

  // 6 otros ingresos en meses distintos al azar: categoría al azar entre las
  // tres de ingreso que no son Salario, monto 15.00–250.00, Banco o Efectivo.
  const otrosNombres = ['Otros ingresos', 'Transferencia entrante', 'Recolectar intereses'];
  const mesesElegidos = new Set<string>();
  while (mesesElegidos.size < 6) {
    mesesElegidos.add(meses[numeroEntre(siguiente, 0, meses.length - 1)]);
  }
  for (const mes of mesesElegidos) {
    const diasDelMes = fechas.filter((fecha) => fecha.slice(0, 7) === mes);
    const fecha = diasDelMes[numeroEntre(siguiente, 0, diasDelMes.length - 1)];
    const categoria = idDe(otrosNombres[numeroEntre(siguiente, 0, otrosNombres.length - 1)]);
    // Dos de cada tres van a Efectivo: es casi su única entrada de dinero
    // (el salario llega a Banco). El saldo de efectivo sale del cierre.
    const carteraId = siguiente() < 2 / 3 ? `efectivo-${uid}` : `banco-${uid}`;
    agregada('ingreso', numeroEntre(siguiente, 1500, 25000), fecha, categoria, carteraId);
  }

  // 152 gastos al azar más los 3 del día pico (Comida y bebida).
  const nombresGasto = Object.keys(TOPES_GASTO);
  const sumaPorDia = new Map<string, number>();
  const elegirFecha = (monto: number): string => {
    for (let intento = 0; intento < 64; intento += 1) {
      const fecha = fechasAlAzar[numeroEntre(siguiente, 0, fechasAlAzar.length - 1)];
      if ((sumaPorDia.get(fecha) ?? 0) + monto < TOPE_DIA) {
        return fecha;
      }
    }
    // Sin fecha que quepa al azar: la primera del recorrido que sí quepa.
    return fechasAlAzar.find((fecha) => (sumaPorDia.get(fecha) ?? 0) + monto < TOPE_DIA) ?? fechasAlAzar[0];
  };
  for (let i = 0; i < GASTOS_AL_AZAR; i += 1) {
    const nombre = nombresGasto[numeroEntre(siguiente, 0, nombresGasto.length - 1)];
    const categoria = idDe(nombre);
    const [minimo, maximo] = TOPES_GASTO[nombre];
    const monto = numeroEntre(siguiente, minimo, maximo);
    const fecha = elegirFecha(monto);
    sumaPorDia.set(fecha, (sumaPorDia.get(fecha) ?? 0) + monto);
    // Gasto pequeño puede caer en Efectivo; grande solo en Banco o Tarjeta.
    const tiro = siguiente();
    const carteraId =
      monto <= TOPE_EFECTIVO
        ? tiro < 1 / 3
          ? `efectivo-${uid}`
          : tiro < 2 / 3
            ? `banco-${uid}`
            : `tarjeta-${uid}`
        : tiro < 0.5
          ? `banco-${uid}`
          : `tarjeta-${uid}`;
    agregada('gasto', monto, fecha, categoria, carteraId);
  }
  for (const [nota, monto] of DIA_PICO) {
    agregada('gasto', monto, pico, idDe('Comida y bebida'), `tarjeta-${uid}`, nota);
    sumaPorDia.set(pico, (sumaPorDia.get(pico) ?? 0) + monto);
  }

  // Cierre del hallazgo del PR #148: la cartera de efectivo no queda en
  // negativo. Si el azar de un uid la deja en rojo, se mueven sus gastos
  // mayores a Banco (pagos con débito), siempre el mayor primero: el
  // generador sigue determinista.
  const enCentavos = (monto: number) => Math.round(monto * 100);
  const saldoEfectivo = transacciones.reduce(
    (saldo, transaccion) =>
      transaccion.cartera_id === `efectivo-${uid}`
        ? saldo +
          (transaccion.tipo === 'ingreso'
            ? enCentavos(transaccion.monto)
            : -enCentavos(transaccion.monto))
        : saldo,
    0,
  );
  let saldo = saldoEfectivo;
  while (saldo < 0) {
    let mayor: SemillaTransaccion | undefined;
    for (const transaccion of transacciones) {
      if (
        transaccion.cartera_id === `efectivo-${uid}` &&
        transaccion.tipo === 'gasto' &&
        (!mayor || transaccion.monto > mayor.monto)
      ) {
        mayor = transaccion;
      }
    }
    if (!mayor) {
      break;
    }
    mayor.cartera_id = `banco-${uid}`;
    saldo += enCentavos(mayor.monto);
  }

  return { carteras, transacciones };
}
