// Cálculos puros de los compromisos (spec #130, issue #131). Nada de lo que
// es suma se guarda: lo abonado, lo pendiente y el estado se calculan aquí
// con las transacciones que la persona ya escucha (ADR-0019). Todo se suma
// en centavos enteros y se devuelve en dólares.
import type { Compromiso } from '../datos/compromisos';
import type { Transaccion } from '../datos/transacciones';

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

export function pendienteDe(compromiso: Compromiso, transacciones: Transaccion[]): number {
  const abonado = abonadoEnCentavos(compromiso.id ?? '', transacciones);
  return Math.max(0, enCentavos(compromiso.monto) - abonado) / 100;
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
  if (compromiso.vence && hoy > compromiso.vence) {
    return 'vencido';
  }
  return 'activo';
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
