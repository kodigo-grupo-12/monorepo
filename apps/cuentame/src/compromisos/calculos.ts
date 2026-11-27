// Cálculos puros de los compromisos (spec #130, issue #131). Nada de lo que
// es suma se guarda: lo abonado, lo pendiente y el estado se calculan aquí
// con las transacciones que la persona ya escucha (ADR-0019). Todo se suma
// en centavos enteros y se devuelve en dólares.
import type { Compromiso } from '../datos/compromisos';
import type { DatosNuevaTransaccion } from '../datos/consultas';
import type { Transaccion } from '../datos/transacciones';
import { cuotasDe, type Cuota } from './cuotas';

export function notaDeOrigen(compromiso: Pick<Compromiso, 'direccion' | 'contraparte'>): string {
  return compromiso.direccion === 'me_deben'
    ? `Préstamo a ${compromiso.contraparte}`
    : `Préstamo de ${compromiso.contraparte}`;
}

export function notaDeAbono(compromiso: Pick<Compromiso, 'direccion' | 'contraparte'>): string {
  return compromiso.direccion === 'me_deben'
    ? `Cobro de ${compromiso.contraparte}`
    : `Pago a ${compromiso.contraparte}`;
}

export type EstadoCompromiso = 'activo' | 'vencido' | 'cerrado' | 'perdonado' | 'cancelado';

const enCentavos = (monto: number): number => Math.round(monto * 100);

// Es la única función que decide qué cuenta como gasto o ingreso
// (ADR-0019): un movimiento neutral sale del análisis, pero no del saldo.
export function esMovimientoReal(transaccion: Transaccion): boolean {
  return transaccion.neutral !== true;
}

export function abonosDe(compromisoId: string, transacciones: Transaccion[]): Transaccion[] {
  return transacciones
    .filter((transaccion) => transaccion.compromiso_id === compromisoId && transaccion.rol === 'abono')
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

function abonadoEnCentavos(compromisoId: string, transacciones: Transaccion[]): number {
  return abonosDe(compromisoId, transacciones).reduce((suma, abono) => suma + enCentavos(abono.monto), 0);
}

export function abonadoDe(compromisoId: string, transacciones: Transaccion[]): number {
  return abonadoEnCentavos(compromisoId, transacciones) / 100;
}

// El monto que representa el compromiso: para la compra es su precio de
// contado (#137); para el dinero, su monto. Con plan el monto es el total
// financiado y manda (#138): el pendiente total sigue siendo monto − abonado.
export function montoBaseDe(compromiso: Compromiso): number {
  if (compromiso.plan) {
    return compromiso.monto ?? 0;
  }
  return compromiso.naturaleza === 'compra' ? compromiso.precio_contado ?? 0 : compromiso.monto ?? 0;
}

export function pendienteDe(compromiso: Compromiso, transacciones: Transaccion[]): number {
  const abonado = abonadoEnCentavos(compromiso.id ?? '', transacciones);
  const base = enCentavos(montoBaseDe(compromiso));
  return Math.max(0, base - abonado) / 100;
}

export function estadoDe(
  compromiso: Compromiso,
  transacciones: Transaccion[],
  hoy: string,
): EstadoCompromiso {
  // El cierre manda: un compromiso perdonado o cancelado ya no cambia.
  if (compromiso.cierre) {
    return compromiso.cierre;
  }
  if (pendienteDe(compromiso, transacciones) === 0) {
    return 'cerrado';
  }
  if (compromiso.plan) {
    // Con plan el vencido lo manda la cuota atrasada más vieja (#138).
    if (cuotasDe(compromiso, transacciones, hoy).some((cuota) => cuota.estado === 'atrasada')) {
      return 'vencido';
    }
    return 'activo';
  }
  if (compromiso.vence && hoy > compromiso.vence) {
    return 'vencido';
  }
  return 'activo';
}

// Días sumados por partes, sin librerías: cruza meses y años y respeta
// los bisiestos (2028-02-27 + 2 da 2028-02-29).
export function sumarDias(iso: string, n: number): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia + n);
  const mesTexto = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const diaTexto = `${fecha.getDate()}`.padStart(2, '0');
  return `${fecha.getFullYear()}-${mesTexto}-${diaTexto}`;
}

export interface Vencimiento {
  compromiso: Compromiso;
  fecha: string;
  pendiente: number;
  situacion: 'atrasado' | 'hoy' | 'proximo';
  diasAtraso: number;
  numero?: number; // número de la cuota cuando el compromiso tiene plan (#138)
  totalCuotas?: number; // n del plan: la fila lee «Cuota k de n»
}

// Lo que vence hoy o en los próximos dias días (#137), atrasados primero por
// fecha. Sin plan entra el compromiso con su vence; con plan (#138) entran
// cada cuota atrasada y la próxima cuota si vence dentro de la ventana, con
// el pendiente de la cuota (esperado − pagado, o referencia − pagado).
function pendienteDeCuota(cuota: Cuota): number {
  const esperado = cuota.esperado ?? cuota.referencia;
  return Math.max(0, enCentavos(esperado) - enCentavos(cuota.pagado)) / 100;
}

export function proximosVencimientos(
  compromisos: Compromiso[],
  transacciones: Transaccion[],
  hoy: string,
  dias = 7,
): Vencimiento[] {
  const limite = sumarDias(hoy, dias);
  const resultados: Vencimiento[] = [];
  for (const c of compromisos) {
    if (!estaAbierto(estadoDe(c, transacciones, hoy))) {
      continue;
    }
    if (c.plan) {
      for (const cuota of cuotasDe(c, transacciones, hoy)) {
        const falta = pendienteDeCuota(cuota);
        if (cuota.estado === 'pagada' || falta <= 0) {
          continue;
        }
        if (cuota.estado !== 'atrasada' && cuota.vence > limite) {
          continue;
        }
        resultados.push({
          compromiso: c,
          fecha: cuota.vence,
          pendiente: falta,
          situacion:
            cuota.estado === 'atrasada' ? 'atrasado' : cuota.vence === hoy ? 'hoy' : 'proximo',
          diasAtraso: cuota.diasAtraso,
          numero: cuota.numero,
          totalCuotas: c.plan.numero_cuotas,
        });
      }
      continue;
    }
    if (c.vence !== undefined && c.vence <= limite && pendienteDe(c, transacciones) > 0) {
      const atraso = diasDeAtraso(c.vence, hoy);
      resultados.push({
        compromiso: c,
        fecha: c.vence,
        pendiente: pendienteDe(c, transacciones),
        situacion: atraso > 0 ? 'atrasado' : c.vence === hoy ? 'hoy' : 'proximo',
        diasAtraso: atraso,
      });
    }
  }
  return resultados.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

// Días enteros entre dos fechas AAAA-MM-DD, 0 si hoy no es mayor que desde.
export function diasDeAtraso(desde: string, hoy: string): number {
  if (hoy <= desde) {
    return 0;
  }
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hoy.split('-').map(Number);
  const diferencia = Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1);
  return Math.round(diferencia / 86_400_000);
}

export function estaAbierto(estado: EstadoCompromiso): boolean {
  return estado === 'activo' || estado === 'vencido';
}

// 0: ya venció, 1: tiene fecha futura, 2: sin fecha. Con esto la lista va
// vencidos primero, luego por vence ascendente y al final los sin fecha.
function grupoDeVencimiento(compromiso: Compromiso, hoy: string): number {
  if (!compromiso.vence) {
    return 2;
  }
  return compromiso.vence <= hoy ? 0 : 1;
}

export function ordenarParaLista(
  compromisos: Compromiso[],
  transacciones: Transaccion[],
  hoy: string,
): Compromiso[] {
  return compromisos
    .filter((c) => estaAbierto(estadoDe(c, transacciones, hoy)))
    .slice()
    .sort((a, b) => {
      const grupoA = grupoDeVencimiento(a, hoy);
      const grupoB = grupoDeVencimiento(b, hoy);
      if (grupoA !== grupoB) {
        return grupoA - grupoB;
      }
      if (grupoA < 2 && a.vence !== b.vence) {
        return a.vence! < b.vence! ? -1 : 1;
      }
      return a.fecha > b.fecha ? -1 : a.fecha < b.fecha ? 1 : 0;
    });
}

export interface DatosAbono {
  monto: number;
  fecha: string;
  cartera_id: string;
  categoria_id?: string;
  nota?: string;
}

// Arma la transacción de un abono (#134): la de dinero mueve la cartera sin
// contar como gasto ni ingreso (neutral) y la de compra sí cuenta, con su
// categoría obligatoria (la del abono o la del compromiso).
export function datosDeAbono(compromiso: Compromiso, abono: DatosAbono): DatosNuevaTransaccion {
  const compra = compromiso.naturaleza === 'compra';
  if (compra && !abono.categoria_id && !compromiso.categoria_id) {
    throw new Error('Falta la categoría');
  }
  return {
    compromiso_id: compromiso.id,
    rol: 'abono',
    monto: abono.monto,
    fecha: abono.fecha,
    cartera_id: abono.cartera_id,
    nota: abono.nota || notaDeAbono(compromiso),
    ...(compra
      ? {
          categoria_id: abono.categoria_id ?? compromiso.categoria_id,
          tipo: (compromiso.direccion === 'debo' ? 'gasto' : 'ingreso') as DatosNuevaTransaccion['tipo'],
        }
      : {
          tipo: (compromiso.direccion === 'me_deben' ? 'ingreso' : 'gasto') as DatosNuevaTransaccion['tipo'],
          neutral: true,
        }),
  };
}

// El abono no puede pasar del pendiente ni ser cero, comparado en centavos.
export function validarAbono(monto: number, pendiente: number): 'ok' | 'cero' | 'excede' {
  const centavos = Math.round(monto * 100);
  const centavosPendiente = Math.round(pendiente * 100);
  if (centavos <= 0) {
    return 'cero';
  }
  if (centavos > centavosPendiente) {
    return 'excede';
  }
  return 'ok';
}

// Todas las transacciones amarradas a un compromiso: el origen y sus abonos.
export function amarradasA(compromisoId: string, transacciones: Transaccion[]): Transaccion[] {
  return transacciones.filter((t) => t.compromiso_id === compromisoId);
}

// El monto corregido no puede quedar por debajo de lo ya abonado.
export function validarNuevoMonto(monto: number, abonado: number): 'ok' | 'menor_que_abonado' {
  return Math.round(monto * 100) < Math.round(abonado * 100) ? 'menor_que_abonado' : 'ok';
}

// El aviso del diálogo de borrar (#136): para una transacción amarrada le
// dice qué pasa con el compromiso si se la borra; para una suelta, nada.
export function avisoAlBorrar(
  transaccion: Transaccion,
  compromisos: Compromiso[],
): string | undefined {
  const compromiso = compromisos.find((c) => c.id === transaccion.compromiso_id);
  if (!compromiso) {
    return undefined;
  }
  if (transaccion.rol === 'origen') {
    return compromiso.direccion === 'me_deben'
      ? `Es la salida del préstamo a ${compromiso.contraparte}. El préstamo sigue en «Deudas y préstamos», sin esta transacción.`
      : `Es la entrada del préstamo de ${compromiso.contraparte}. El préstamo sigue en «Deudas y préstamos», sin esta transacción.`;
  }
  if (transaccion.rol === 'abono') {
    return `Es un abono a ${compromiso.contraparte}: lo pendiente sube $${transaccion.monto.toFixed(2)}.`;
  }
  return undefined;
}

export function resumenCompromisos(
  compromisos: Compromiso[],
  transacciones: Transaccion[],
  hoy: string,
): { meDeben: number; debo: number; vencidos: number } {
  let meDeben = 0;
  let debo = 0;
  let vencidos = 0;
  for (const compromiso of compromisos) {
    const estado = estadoDe(compromiso, transacciones, hoy);
    if (estaAbierto(estado)) {
      const pendiente = enCentavos(pendienteDe(compromiso, transacciones));
      if (compromiso.direccion === 'me_deben') {
        meDeben += pendiente;
      } else {
        debo += pendiente;
      }
    }
    if (estado === 'vencido') {
      vencidos += 1;
    }
  }
  return { meDeben: meDeben / 100, debo: debo / 100, vencidos };
}
