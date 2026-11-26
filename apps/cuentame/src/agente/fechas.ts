// Fechas del Agente (T011, #113). Las fechas son texto AAAA-MM-DD y se
// comparan como texto: sin librerías de fecha y sin hora. El Salvador
// vive en UTC-6 todo el año, así que «hoy» se calcula con ese desfase fijo.
// Los períodos los resuelve la app antes de llamar a una herramienta,
// nunca el modelo.

export type Periodo = 'hoy' | 'este_mes' | 'mes_pasado' | 'ultimo_mes' | 'este_anio' | 'todo';

export interface Rango {
  desde: string;
  hasta: string;
}

// now en cualquier instante → la fecha de hoy en El Salvador.
export function hoyEnElSalvador(ahora: Date): string {
  return new Date(ahora.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}

interface Partes {
  anio: number;
  mes: number;
  dia: number;
}

function descomponer(iso: string): Partes {
  return {
    anio: Number(iso.slice(0, 4)),
    mes: Number(iso.slice(5, 7)),
    dia: Number(iso.slice(8, 10)),
  };
}

function componer(anio: number, mes: number, dia: number): string {
  return `${String(anio).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// El rango completo de un mes calendario, año bisiesto incluido.
export function mesCalendario(aaaaMM: string): Rango {
  const anio = Number(aaaaMM.slice(0, 4));
  const mes = Number(aaaaMM.slice(5, 7));
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return { desde: componer(anio, mes, 1), hasta: componer(anio, mes, ultimo) };
}

export function resolverPeriodo(periodo: Periodo, hoy: string): Rango {
  const { anio, mes } = descomponer(hoy);
  switch (periodo) {
    case 'hoy':
      return { desde: hoy, hasta: hoy };
    case 'este_mes':
      return { desde: componer(anio, mes, 1), hasta: hoy };
    case 'mes_pasado':
    case 'ultimo_mes': {
      const anterior = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
      return mesCalendario(componer(anterior.anio, anterior.mes, 1));
    }
    case 'este_anio':
      return { desde: componer(anio, 1, 1), hasta: hoy };
    case 'todo':
      return { desde: '0000-01-01', hasta: hoy };
  }
}

// El período de la misma cantidad de días que termina el día antes de
// desde: la semana pasada de una semana, el mes previo de un tramo suelto.
export function periodoAnterior(rango: Rango): Rango {
  const inicio = descomponer(rango.desde);
  const fin = descomponer(rango.hasta);
  const milisInicio = Date.UTC(inicio.anio, inicio.mes - 1, inicio.dia);
  const milisFin = Date.UTC(fin.anio, fin.mes - 1, fin.dia);
  const dias = Math.round((milisFin - milisInicio) / 86400_000) + 1;
  const finAnterior = milisInicio - 86400_000;
  const inicioAnterior = finAnterior - (dias - 1) * 86400_000;
  const iso = (milis: number) => new Date(milis).toISOString().slice(0, 10);
  return { desde: iso(inicioAnterior), hasta: iso(finAnterior) };
}
