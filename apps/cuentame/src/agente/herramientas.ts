import type { Transaccion } from '../datos/transacciones';
import type { Categoria } from '../datos/categorias';
import { mesCalendario, periodoAnterior, resolverPeriodo } from './fechas';

// Herramientas del Agente (T011, #113): funciones puras de (datos,
// argumentos) fuera de las pantallas, para poder probarlas sin red ni
// emulador. Ninguna devuelve notas, adjuntos ni la lista cruda de
// transacciones: montos redondeados a 2 decimales, el rango efectivo y la
// cobertura. Los montos se suman en centavos enteros para que la
// aritmética no flotee (0.1 + 0.2 + 0.3 = 0.60).

export interface DatosAgente {
  transacciones: Transaccion[];
  categorias: Categoria[];
  hoy: string;
}

// Cuánto de la vida de la persona entró al cálculo, en palabras que el
// modelo puede repetir sin inventar nada.
export interface Cobertura {
  consideradas: number;
  primeraFecha: string | null;
  sinCategoria: number;
  antesDeLaPrimera: boolean;
}

export interface RangoDevuelto {
  desde: string;
  hasta: string;
}

export interface CategoriaResuelta {
  id: string;
  nombre: string;
  tipo: 'gasto' | 'ingreso';
}

export type ResolucionCategoria =
  | { estado: 'una'; categoria: CategoriaResuelta }
  | { estado: 'varias'; candidatas: CategoriaResuelta[] }
  | { estado: 'ninguna' };

const enCentavos = (monto: number): number => Math.round(monto * 100);
const deCentavos = (centavos: number): number => centavos / 100;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// resolverCategoria: exacta, prefijo y contiene, en ese orden. El primer
// nivel que encuentre algo gana; con varias coincidencias del mismo nivel
// se le pregunta a la persona cuál quiso decir.
export function resolverCategoria(
  datos: DatosAgente,
  argumentos: { texto: string; tipo?: 'gasto' | 'ingreso' },
): ResolucionCategoria {
  const buscado = normalizar(argumentos.texto);
  if (buscado === '') return { estado: 'ninguna' };
  const candidatas: CategoriaResuelta[] = datos.categorias
    .filter((categoria) => typeof categoria.id === 'string')
    .map((categoria) => ({ id: categoria.id as string, nombre: categoria.nombre, tipo: categoria.tipo }))
    .filter((categoria) => argumentos.tipo === undefined || categoria.tipo === argumentos.tipo);
  for (const nivel of ['exacta', 'prefijo', 'contiene'] as const) {
    const halladas = candidatas.filter((categoria) => {
      const nombre = normalizar(categoria.nombre);
      if (nivel === 'exacta') return nombre === buscado;
      if (nivel === 'prefijo') return nombre.startsWith(buscado);
      return nombre.includes(buscado);
    });
    if (halladas.length === 1) return { estado: 'una', categoria: halladas[0] };
    if (halladas.length > 1) return { estado: 'varias', candidatas: halladas };
  }
  return { estado: 'ninguna' };
}

interface Corte {
  rango: RangoDevuelto;
  dentro: Transaccion[];
}

// El rango efectivo y el conjunto base (gastos o ingresos del rango) que
// todas las herramientas comparten.
function cortar(
  datos: DatosAgente,
  desde: string | undefined,
  hasta: string | undefined,
  tipo: 'gasto' | 'ingreso',
): Corte {
  const rango: RangoDevuelto = { desde: desde ?? '0000-01-01', hasta: hasta ?? datos.hoy };
  const dentro = datos.transacciones.filter(
    (t) => t.tipo === tipo && t.fecha >= rango.desde && t.fecha <= rango.hasta,
  );
  return { rango, dentro };
}

function coberturaDe(datos: DatosAgente, rango: RangoDevuelto, base: Transaccion[], consideradas: number): Cobertura {
  let primeraFecha: string | null = null;
  for (const t of datos.transacciones) {
    if (primeraFecha === null || t.fecha < primeraFecha) primeraFecha = t.fecha;
  }
  const ids = new Set(datos.categorias.map((categoria) => categoria.id));
  const sinCategoria = base.filter((t) => t.categoria_id === undefined || !ids.has(t.categoria_id)).length;
  return {
    consideradas,
    primeraFecha,
    sinCategoria,
    antesDeLaPrimera: primeraFecha !== null && rango.desde < primeraFecha,
  };
}

function nombreCategoria(datos: DatosAgente, t: Transaccion): string {
  if (t.categoria_id === undefined) return 'Sin categoría';
  const hallada = datos.categorias.find((categoria) => categoria.id === t.categoria_id);
  return hallada === undefined ? 'Sin categoría' : hallada.nombre;
}

export function totalPorCategoria(
  datos: DatosAgente,
  argumentos: { categoriaId: string; desde?: string; hasta?: string },
): { total: number; cantidad: number; rango: RangoDevuelto; cobertura: Cobertura } {
  const { rango, dentro } = cortar(datos, argumentos.desde, argumentos.hasta, 'gasto');
  const deLaCategoria = dentro.filter((t) => t.categoria_id === argumentos.categoriaId);
  const centavos = deLaCategoria.reduce((suma, t) => suma + enCentavos(t.monto), 0);
  return {
    total: deCentavos(centavos),
    cantidad: deLaCategoria.length,
    rango,
    cobertura: coberturaDe(datos, rango, dentro, deLaCategoria.length),
  };
}

export function diaConMasGasto(
  datos: DatosAgente,
  argumentos: { categoriaId?: string; desde?: string; hasta?: string },
): { dias: { fecha: string; total: number }[]; mayores: { monto: number; categoria: string }[]; rango: RangoDevuelto; cobertura: Cobertura } {
  const { rango, dentro } = cortar(datos, argumentos.desde, argumentos.hasta, 'gasto');
  const filtrados = argumentos.categoriaId === undefined ? dentro : dentro.filter((t) => t.categoria_id === argumentos.categoriaId);
  const porDia = new Map<string, number>();
  for (const t of filtrados) porDia.set(t.fecha, (porDia.get(t.fecha) ?? 0) + enCentavos(t.monto));
  const ordenados = [...porDia.entries()]
    .map(([fecha, centavos]) => ({ fecha, total: deCentavos(centavos) }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const maximo = ordenados.length === 0 ? null : Math.max(...ordenados.map((dia) => dia.total));
  const dias = maximo === null ? [] : ordenados.filter((dia) => dia.total === maximo);
  const mayores =
    dias.length === 0
      ? []
      : [...filtrados]
          .filter((t) => t.fecha === dias[0].fecha)
          .sort((a, b) => enCentavos(b.monto) - enCentavos(a.monto))
          .slice(0, 3)
          .map((t) => ({ monto: t.monto, categoria: nombreCategoria(datos, t) }));
  return { dias, mayores, rango, cobertura: coberturaDe(datos, rango, dentro, filtrados.length) };
}

export function gastoDelMes(
  datos: DatosAgente,
  argumentos: { mes?: string; categoriaId?: string },
): { total: number; cantidad: number; porCategoria: { categoria: string; total: number }[]; rango: RangoDevuelto; cobertura: Cobertura } {
  const aaaaMM = argumentos.mes ?? datos.hoy.slice(0, 7);
  const completo = mesCalendario(aaaaMM);
  const rango: RangoDevuelto = { desde: completo.desde, hasta: completo.hasta <= datos.hoy ? completo.hasta : datos.hoy };
  const base = datos.transacciones.filter((t) => t.tipo === 'gasto' && t.fecha >= rango.desde && t.fecha <= rango.hasta);
  const filtrados = argumentos.categoriaId === undefined ? base : base.filter((t) => t.categoria_id === argumentos.categoriaId);
  const porCategoria = new Map<string, number>();
  for (const t of filtrados) {
    const nombre = nombreCategoria(datos, t);
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + enCentavos(t.monto));
  }
  const desglose = [...porCategoria.entries()]
    .map(([categoria, centavos]) => ({ categoria, total: deCentavos(centavos) }))
    .sort((a, b) => b.total - a.total);
  const centavos = filtrados.reduce((suma, t) => suma + enCentavos(t.monto), 0);
  return {
    total: deCentavos(centavos),
    cantidad: filtrados.length,
    porCategoria: desglose,
    rango,
    cobertura: coberturaDe(datos, rango, base, filtrados.length),
  };
}

export function resumenIngresos(
  datos: DatosAgente,
  argumentos: { desde?: string; hasta?: string },
): {
  total: number;
  cantidad: number;
  porCategoria: { categoria: string; total: number }[];
  mayor: { monto: number; categoria: string; fecha: string } | null;
  anterior: { rango: RangoDevuelto; total: number };
  rango: RangoDevuelto;
  cobertura: Cobertura;
} {
  const rango: RangoDevuelto =
    argumentos.desde !== undefined || argumentos.hasta !== undefined
      ? { desde: argumentos.desde ?? '0000-01-01', hasta: argumentos.hasta ?? datos.hoy }
      : resolverPeriodo('ultimo_mes', datos.hoy);
  const base = datos.transacciones.filter((t) => t.tipo === 'ingreso' && t.fecha >= rango.desde && t.fecha <= rango.hasta);
  const porCategoria = new Map<string, number>();
  for (const t of base) {
    const nombre = nombreCategoria(datos, t);
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + enCentavos(t.monto));
  }
  const desglose = [...porCategoria.entries()]
    .map(([categoria, centavos]) => ({ categoria, total: deCentavos(centavos) }))
    .sort((a, b) => b.total - a.total);
  const mayorRow = [...base].sort((a, b) => enCentavos(b.monto) - enCentavos(a.monto))[0];
  const mayor =
    mayorRow === undefined ? null : { monto: mayorRow.monto, categoria: nombreCategoria(datos, mayorRow), fecha: mayorRow.fecha };
  const anterior = periodoAnterior(rango);
  const totalAnterior = deCentavos(
    datos.transacciones
      .filter((t) => t.tipo === 'ingreso' && t.fecha >= anterior.desde && t.fecha <= anterior.hasta)
      .reduce((suma, t) => suma + enCentavos(t.monto), 0),
  );
  const centavos = base.reduce((suma, t) => suma + enCentavos(t.monto), 0);
  return {
    total: deCentavos(centavos),
    cantidad: base.length,
    porCategoria: desglose,
    mayor,
    anterior: { rango: anterior, total: totalAnterior },
    rango,
    cobertura: coberturaDe(datos, rango, base, base.length),
  };
}
