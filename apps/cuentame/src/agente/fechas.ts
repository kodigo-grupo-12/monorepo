// Fechas del Agente: fechas como texto AAAA-MM-DD comparadas como texto y
// «hoy» con UTC-6 fijo de El Salvador, sin librerías de fechas (spec #107).

export type Periodo = 'hoy' | 'este_mes' | 'mes_pasado' | 'ultimo_mes' | 'este_anio' | 'todo';

export interface Rango {
  desde: string;
  hasta: string;
}

// El reloj del aparato menos 6 horas, como texto AAAA-MM-DD.
export function hoyEnElSalvador(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}

function partes(fecha: string): [number, number, number] {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return [anio, mes, dia];
}

function fechaUTC(fecha: string): number {
  const [anio, mes, dia] = partes(fecha);
  return Date.UTC(anio, mes - 1, dia);
}

function textoUTC(momento: number): string {
  return new Date(momento).toISOString().slice(0, 10);
}

export function mesCalendario(mes: string): Rango {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new Error(`Mes inválido: se espera AAAA-MM y llegó «${mes}».`);
  }
  const [anio, numero] = mes.split('-').map(Number);
  // El día 0 del mes siguiente es el último día del mes pedido.
  return { desde: `${mes}-01`, hasta: textoUTC(Date.UTC(anio, numero, 0)) };
}

export function resolverPeriodo(periodo: Periodo, hoy: string): Rango {
  switch (periodo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case 'este_mes': {
      const [anio, mes] = partes(hoy);
      return { desde: `${anio}-${String(mes).padStart(2, '0')}-01`, hasta: hoy };
    }
    case 'mes_pasado':
    case 'ultimo_mes': {
      const [anio, mes] = partes(hoy);
      const mesAnterior = mes === 1 ? 12 : mes - 1;
      const anioAnterior = mes === 1 ? anio - 1 : anio;
      return mesCalendario(`${anioAnterior}-${String(mesAnterior).padStart(2, '0')}`);
    }
    case 'este_anio': {
      const [anio] = partes(hoy);
      return { desde: `${anio}-01-01`, hasta: hoy };
    }
    case 'todo':
      return { desde: '0000-01-01', hasta: hoy };
    default:
      throw new Error(`Periodo desconocido: ${String(periodo)}.`);
  }
}

// El período de la misma cantidad de días que termina el día antes de desde.
export function periodoAnterior(rango: Rango): Rango {
  const largoDias = Math.round((fechaUTC(rango.hasta) - fechaUTC(rango.desde)) / 86_400_000) + 1;
  const fin = fechaUTC(rango.desde) - 86_400_000;
  return { desde: textoUTC(fin - (largoDias - 1) * 86_400_000), hasta: textoUTC(fin) };
}
