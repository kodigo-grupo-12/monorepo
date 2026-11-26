// Cálculos puros de los compromisos (spec #130, issue #131). Nada de lo que
// es suma se guarda: lo abonado, lo pendiente y el estado se calculan aquí
// con las transacciones que la persona ya escucha (ADR-0019). Todo se suma
// en centavos enteros y se devuelve en dólares.
import type { Compromiso } from '../datos/compromisos';
import type { DatosNuevaTransaccion } from '../datos/consultas';
import type { Transaccion } from '../datos/transacciones';

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
