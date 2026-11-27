// Planes de cuotas como funciones puras (spec #130, issue #138). Las cuotas
// nunca se graban: se calculan a partir del plan y de los abonos que ya
// existen. Solo import type: nada de red ni de Firestore, sumas en centavos
// enteros y fechas por partes, sin librerías.
import type { Compromiso, Plan } from '../datos/compromisos';
import type { Transaccion } from '../datos/transacciones';

export interface Cuota {
  numero: number; // 1..n
  vence: string; // AAAA-MM-DD
  esperado: number | null; // null en modo variable
  referencia: number; // fijo: = esperado; variable: monto ÷ n
  pagado: number;
  estado: 'pagada' | 'parcial' | 'pendiente' | 'atrasada';
  diasAtraso: number;
}

const enCentavos = (monto: number): number => Math.round(monto * 100);

function diasEntre(desde: string, hasta: string): number {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

function abonosOrdenados(compromisoId: string, transacciones: Transaccion[]): Transaccion[] {
  return transacciones
    .filter((transaccion) => transaccion.compromiso_id === compromisoId && transaccion.rol === 'abono')
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

// Día `plan.dia` del mes `plan.primera + (k − 1)`. Si el mes no tiene ese
// día, vence el último día del mes; el día original no se pierde: el mes
// siguiente vuelve a él.
export function fechaDeCuota(plan: Plan, k: number): string {
  const [anio, mes] = plan.primera.split('-').map(Number);
  const indice = anio * 12 + (mes - 1) + (k - 1);
  const y = Math.floor(indice / 12);
  const m = (indice % 12) + 1;
  const ultimo = new Date(y, m, 0).getDate();
  const d = Math.min(plan.dia, ultimo);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Monto de cada cuota en modo fijo: `cuota` para 1..n−1 y el resto para la
// última, que tiene que quedar > 0. El modo variable no aplica: lanza.
export function montosDeCuotas(monto: number, plan: Plan): number[] {
  if (plan.modo !== 'fijo') {
    throw new Error('El modo variable no tiene montos de cuota');
  }
  const n = plan.numero_cuotas;
  const ultima = enCentavos(monto) - enCentavos(plan.cuota ?? 0) * (n - 1);
  if (ultima <= 0) {
    throw new Error('La última cuota no puede ser 0 o negativa');
  }
  const montos = Array<number>(n).fill(plan.cuota ?? 0);
  montos[n - 1] = ultima / 100;
  return montos;
}

// Las cuotas del compromiso con su estado. Fijo: el total abonado (abonos
// ordenados por fecha) se aplica a la cuota más vieja sin cubrir, en
// cascada; pagar de más adelanta las siguientes. Variable: cada abono cae en
// la cuota cuya ventana (vence de k−1, vence de k] contiene su fecha; antes
// de la primera, en la 1; después de la última, en la última. Una cuota
// variable está pagada si tiene al menos un abono.
export function cuotasDe(
  compromiso: Compromiso,
  transacciones: Transaccion[],
  hoy: string,
): Cuota[] {
  const plan = compromiso.plan;
  if (!plan) {
    return [];
  }
  const n = plan.numero_cuotas;
  const montos = plan.modo === 'fijo' ? montosDeCuotas(compromiso.monto ?? 0, plan) : null;
  const referencia =
    plan.modo === 'variable' ? Math.round((compromiso.monto / n) * 100) / 100 : (plan.cuota ?? 0);
  const vencimientos = Array.from({ length: n }, (_, i) => fechaDeCuota(plan, i + 1));

  const pagadoPorCuota = Array<number>(n).fill(0);
  const conAbono = Array<boolean>(n).fill(false);

  if (plan.modo === 'fijo') {
    let k = 0;
    for (const abono of abonosOrdenados(compromiso.id ?? '', transacciones)) {
      let restante = enCentavos(abono.monto);
      while (restante > 0 && k < n) {
        const faltante = enCentavos(montos![k]) - pagadoPorCuota[k];
        if (faltante <= 0) {
          k += 1;
          continue;
        }
        const aplicado = Math.min(restante, faltante);
        pagadoPorCuota[k] += aplicado;
        restante -= aplicado;
        if (pagadoPorCuota[k] >= enCentavos(montos![k])) {
          k += 1;
        }
      }
    }
  } else {
    for (const abono of abonosOrdenados(compromiso.id ?? '', transacciones)) {
      let k: number;
      if (abono.fecha <= vencimientos[0]) {
        k = 0;
      } else if (abono.fecha > vencimientos[n - 1]) {
        k = n - 1;
      } else {
        k = vencimientos.findIndex((vence) => abono.fecha <= vence);
        if (k < 0) {
          k = n - 1;
        }
      }
      pagadoPorCuota[k] += enCentavos(abono.monto);
      conAbono[k] = true;
    }
  }

  return vencimientos.map((vence, i) => {
    const esperado = montos ? montos[i] : null;
    const pagado = pagadoPorCuota[i] / 100;
    const cubierta =
      plan.modo === 'fijo' ? pagadoPorCuota[i] >= enCentavos(montos![i]) : conAbono[i];
    const atraso = diasEntre(vence, hoy);
    const estado: Cuota['estado'] = cubierta
      ? 'pagada'
      : atraso > 0
        ? 'atrasada'
        : pagadoPorCuota[i] > 0
          ? 'parcial'
          : 'pendiente';
    return {
      numero: i + 1,
      vence,
      esperado,
      referencia,
      pagado,
      estado,
      diasAtraso: Math.max(0, atraso),
    };
  });
}

// La primera cuota no pagada.
export function proximaCuota(cuotas: Cuota[]): Cuota | undefined {
  return cuotas.find((cuota) => cuota.estado !== 'pagada');
}

// Lo que toca pagar de una cuota: en fijo, lo que falta de su esperado; en
// variable, la referencia (#139).
export function montoDeCuota(cuota: Cuota): number {
  return cuota.esperado === null
    ? cuota.referencia
    : Math.max(0, cuota.esperado - cuota.pagado);
}

// ¿El monto deja la última cuota del plan fijo en 0 o menos? Es la misma
// aritmética en centavos que valida el modal, para que la escritura
// rechace lo mismo que la pantalla (#155). Un plan variable nunca rompe.
export function montoRompeElPlan(plan: Plan, monto: number): boolean {
  if (plan.modo !== 'fijo' || plan.cuota === undefined) {
    return false;
  }
  return enCentavos(monto) - enCentavos(plan.cuota) * (plan.numero_cuotas - 1) <= 0;
}

// El atraso del compromiso con plan es el de su cuota atrasada más vieja.
export function atrasoDePlan(
  compromiso: Compromiso,
  transacciones: Transaccion[],
  hoy: string,
): number {
  const atrasadas = cuotasDe(compromiso, transacciones, hoy).filter(
    (cuota) => cuota.estado === 'atrasada',
  );
  return atrasadas.length ? atrasadas[0].diasAtraso : 0;
}
