// Herramientas del Agente: funciones puras de (datos, argumentos) que solo
// hacen import type de la capa de datos, para no cargar Firebase en las
// pruebas. Ninguna devuelve notas, imágenes ni la lista cruda de
// transacciones, y las sumas van en centavos enteros (spec #107).

import type { Categoria, TipoCategoria } from '../datos/categorias';
import type { Transaccion } from '../datos/transacciones';

import { mesCalendario, periodoAnterior, resolverPeriodo, type Rango } from './fechas';

export interface DatosAgente {
  transacciones: Transaccion[];
  categorias: Categoria[];
  hoy: string;
}

export interface Cobertura {
  consideradas: number;
  primeraFecha: string | null;
  sinCategoria: number;
  antesDeLaPrimera: boolean;
}

export interface ResumenCategoria {
  id: string;
  nombre: string;
  tipo: TipoCategoria;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function centavos(monto: number): number {
  return Math.round(monto * 100);
}

function pesos(centavosTotales: number): number {
  return centavosTotales / 100;
}

function nombreDe(datos: DatosAgente, categoriaId: string | undefined): string {
  const encontrada = datos.categorias.find((categoria) => categoria.id === categoriaId);
  return encontrada ? encontrada.nombre : 'Sin categoría';
}

function rangoDe(datos: DatosAgente, desde?: string, hasta?: string): Rango {
  return { desde: desde ?? '0000-01-01', hasta: hasta ?? datos.hoy };
}

// La cobertura dice cuántas transacciones de la persona entraron al cálculo,
// cuándo empieza su historial, cuántas del rango van sin categoría usable y
// si el rango pedido arranca antes de la primera transacción.
function coberturaDe(datos: DatosAgente, rango: Rango): Cobertura {
  const enRango = datos.transacciones.filter(
    (transaccion) => transaccion.fecha >= rango.desde && transaccion.fecha <= rango.hasta,
  );
  let primeraFecha: string | null = null;
  for (const transaccion of datos.transacciones) {
    if (primeraFecha === null || transaccion.fecha < primeraFecha) {
      primeraFecha = transaccion.fecha;
    }
  }
  const sinCategoria = enRango.filter(
    (transaccion) =>
      !transaccion.categoria_id ||
      !datos.categorias.some((categoria) => categoria.id === transaccion.categoria_id),
  ).length;
  return {
    consideradas: enRango.length,
    primeraFecha,
    sinCategoria,
    antesDeLaPrimera: primeraFecha !== null && rango.desde < primeraFecha,
  };
}

export type RespuestaResolverCategoria =
  | { estado: 'una'; categoria: ResumenCategoria }
  | { estado: 'varias'; candidatas: ResumenCategoria[] }
  | { estado: 'ninguna' };

// Normaliza (minúsculas, sin tildes, espacios colapsados) y compara con las
// categorías de la persona en tres niveles: exacta, prefijo y contiene. El
// primer nivel que encuentre algo gana.
export function resolverCategoria(
  datos: DatosAgente,
  { texto, tipo }: { texto: string; tipo?: TipoCategoria },
): RespuestaResolverCategoria {
  const buscado = normalizar(texto);
  if (buscado.length === 0) {
    return { estado: 'ninguna' };
  }
  const candidatas = datos.categorias.filter(
    (categoria) => categoria.id !== undefined && (tipo === undefined || categoria.tipo === tipo),
  );
  const niveles = [
    (categoria: Categoria) => normalizar(categoria.nombre) === buscado,
    (categoria: Categoria) => normalizar(categoria.nombre).startsWith(buscado),
    (categoria: Categoria) => normalizar(categoria.nombre).includes(buscado),
  ];
  for (const nivel of niveles) {
    const encontradas = candidatas
      .filter(nivel)
      .map((categoria) => ({ id: categoria.id as string, nombre: categoria.nombre, tipo: categoria.tipo }));
    if (encontradas.length === 1) {
      return { estado: 'una', categoria: encontradas[0] };
    }
    if (encontradas.length > 1) {
      return { estado: 'varias', candidatas: encontradas };
    }
  }
  return { estado: 'ninguna' };
}

export interface RespuestaTotalPorCategoria {
  total: number;
  cantidad: number;
  rango: Rango;
  cobertura: Cobertura;
}

export function totalPorCategoria(
  datos: DatosAgente,
  { categoriaId, desde, hasta }: { categoriaId: string; desde?: string; hasta?: string },
): RespuestaTotalPorCategoria {
  const rango = rangoDe(datos, desde, hasta);
  const seleccionadas = datos.transacciones.filter(
    (transaccion) =>
      transaccion.tipo === 'gasto' &&
      transaccion.categoria_id === categoriaId &&
      transaccion.fecha >= rango.desde &&
      transaccion.fecha <= rango.hasta,
  );
  return {
    total: pesos(seleccionadas.reduce((suma, transaccion) => suma + centavos(transaccion.monto), 0)),
    cantidad: seleccionadas.length,
    rango,
    cobertura: coberturaDe(datos, rango),
  };
}

export interface RespuestaDiaConMasGasto {
  dias: { fecha: string; total: number }[];
  mayores: { monto: number; categoria: string }[];
  rango: Rango;
  cobertura: Cobertura;
}

export function diaConMasGasto(
  datos: DatosAgente,
  { categoriaId, desde, hasta }: { categoriaId?: string; desde?: string; hasta?: string },
): RespuestaDiaConMasGasto {
  const rango = rangoDe(datos, desde, hasta);
  const gastos = datos.transacciones.filter(
    (transaccion) =>
      transaccion.tipo === 'gasto' &&
      transaccion.fecha >= rango.desde &&
      transaccion.fecha <= rango.hasta &&
      (categoriaId === undefined || transaccion.categoria_id === categoriaId),
  );
  const totalPorDia = new Map<string, number>();
  for (const gasto of gastos) {
    totalPorDia.set(gasto.fecha, (totalPorDia.get(gasto.fecha) ?? 0) + centavos(gasto.monto));
  }
  const dias = [...totalPorDia.entries()]
    .map(([fecha, centavosDia]) => ({ fecha, total: pesos(centavosDia) }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const maximo = dias.length > 0 ? Math.max(...dias.map((dia) => dia.total)) : null;
  const empatados = maximo === null ? [] : dias.filter((dia) => dia.total === maximo);
  const primerDia = empatados[0]?.fecha;
  const mayores =
    primerDia === undefined
      ? []
      : gastos
          .filter((gasto) => gasto.fecha === primerDia)
          .sort((a, b) => centavos(b.monto) - centavos(a.monto))
          .slice(0, 3)
          .map((gasto) => ({ monto: gasto.monto, categoria: nombreDe(datos, gasto.categoria_id) }));
  return { dias: empatados, mayores, rango, cobertura: coberturaDe(datos, rango) };
}

export interface RespuestaGastoDelMes {
  total: number;
  cantidad: number;
  porCategoria: { categoria: string; total: number }[];
  rango: Rango;
  cobertura: Cobertura;
}

export function gastoDelMes(
  datos: DatosAgente,
  { mes, categoriaId }: { mes?: string; categoriaId?: string },
): RespuestaGastoDelMes {
  const rango = mesCalendario(mes ?? datos.hoy.slice(0, 7));
  const gastos = datos.transacciones.filter(
    (transaccion) =>
      transaccion.tipo === 'gasto' &&
      transaccion.fecha >= rango.desde &&
      transaccion.fecha <= rango.hasta &&
      (categoriaId === undefined || transaccion.categoria_id === categoriaId),
  );
  const porNombre = new Map<string, number>();
  for (const gasto of gastos) {
    const nombre = nombreDe(datos, gasto.categoria_id);
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + centavos(gasto.monto));
  }
  return {
    total: pesos(gastos.reduce((suma, gasto) => suma + centavos(gasto.monto), 0)),
    cantidad: gastos.length,
    porCategoria: [...porNombre.entries()]
      .map(([categoria, centavosCategoria]) => ({ categoria, total: pesos(centavosCategoria) }))
      .sort((a, b) => b.total - a.total),
    rango,
    cobertura: coberturaDe(datos, rango),
  };
}

export interface RespuestaResumenIngresos {
  total: number;
  cantidad: number;
  porCategoria: { categoria: string; total: number }[];
  mayor: { monto: number; categoria: string; fecha: string } | null;
  anterior: { rango: Rango; total: number };
  rango: Rango;
  cobertura: Cobertura;
}

export function resumenIngresos(
  datos: DatosAgente,
  { desde, hasta }: { desde?: string; hasta?: string } = {},
): RespuestaResumenIngresos {
  const rango: Rango =
    desde !== undefined || hasta !== undefined
      ? rangoDe(datos, desde, hasta)
      : resolverPeriodo('ultimo_mes', datos.hoy);
  const ingresos = datos.transacciones.filter(
    (transaccion) =>
      transaccion.tipo === 'ingreso' &&
      transaccion.fecha >= rango.desde &&
      transaccion.fecha <= rango.hasta,
  );
  const totalAnterior = (rangoAnterior: Rango): number =>
    pesos(
      datos.transacciones
        .filter(
          (transaccion) =>
            transaccion.tipo === 'ingreso' &&
            transaccion.fecha >= rangoAnterior.desde &&
            transaccion.fecha <= rangoAnterior.hasta,
        )
        .reduce((suma, ingreso) => suma + centavos(ingreso.monto), 0),
    );
  const porNombre = new Map<string, number>();
  for (const ingreso of ingresos) {
    const nombre = nombreDe(datos, ingreso.categoria_id);
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + centavos(ingreso.monto));
  }
  let mayor: RespuestaResumenIngresos['mayor'] = null;
  for (const ingreso of ingresos) {
    if (mayor === null || centavos(ingreso.monto) > centavos(mayor.monto)) {
      mayor = { monto: ingreso.monto, categoria: nombreDe(datos, ingreso.categoria_id), fecha: ingreso.fecha };
    }
  }
  const rangoAnterior = periodoAnterior(rango);
  return {
    total: pesos(ingresos.reduce((suma, ingreso) => suma + centavos(ingreso.monto), 0)),
    cantidad: ingresos.length,
    porCategoria: [...porNombre.entries()]
      .map(([categoria, centavosCategoria]) => ({ categoria, total: pesos(centavosCategoria) }))
      .sort((a, b) => b.total - a.total),
    mayor,
    anterior: { rango: rangoAnterior, total: totalAnterior(rangoAnterior) },
    rango,
    cobertura: coberturaDe(datos, rango),
  };
}
