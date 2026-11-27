// Tipos y escrituras del compromiso de «Deudas y préstamos» (spec #130).
// Nada de lo que es suma se guarda: lo abonado, lo pendiente y el estado se
// calculan en compromisos/calculos.ts (ADR-0019).
import { collection, deleteField, doc, getDoc, updateDoc } from 'firebase/firestore';

import { armarBatchCompromiso, COLECCION_COMPROMISOS, type DatosNuevoCompromiso } from './consultas';
import { datosDeAbono, type DatosAbono } from '../compromisos/calculos';
import { armarBatchBorrado } from './consultas';
import { montoRompeElPlan } from '../compromisos/cuotas';
import { crearTransaccion, type Transaccion } from './transacciones';
import { db } from './firebase';
import { uidDeSesion } from '../sesion/auth';

export const coleccionCompromisos = collection(db, COLECCION_COMPROMISOS);

// Crea el compromiso y, si viene origen y la naturaleza es dinero, la
// transacción de origen amarrada, todo en un solo batch (#132).
export async function crearCompromiso(
  datos: DatosNuevoCompromiso,
  origen?: { cartera_id: string },
): Promise<string> {
  const { batch, id } = armarBatchCompromiso(db, datos, uidDeSesion(), origen);
  await batch.commit();
  return id;
}

// Registra un cobro o un pago (#134): escribe la transacción de abono
// amarrada al compromiso con los datos calculados en compromisos/calculos.
export async function registrarAbono(compromiso: Compromiso, abono: DatosAbono): Promise<string> {
  return crearTransaccion(datosDeAbono(compromiso, abono));
}

// Corrige lo que la persona puede cambiar (#135): contraparte, teléfono,
// monto, vencimiento, nota y, desde #140, el precio de contado. Lo
// indefinido se borra con deleteField, igual que actualizarTransaccion.
// Nunca toca uid, direccion, naturaleza, plan ni cierre.
export async function actualizarCompromiso(
  id: string,
  cambios: Pick<Compromiso, 'contraparte' | 'telefono' | 'monto' | 'vence' | 'nota' | 'precio_contado'>,
): Promise<void> {
  if (cambios.monto !== undefined) {
    // El plan vigente se lee del documento: la escritura es la frontera que
    // impide guardar un monto que rompe el plan fijo (#155). cuotasDe sigue
    // lanzando como invariante y los lectores no llevan try/catch.
    const actual = await getDoc(doc(db, COLECCION_COMPROMISOS, id));
    const plan = actual.data()?.plan as Compromiso['plan'];
    if (plan && montoRompeElPlan(plan, cambios.monto)) {
      throw new Error('El monto deja la última cuota del plan fijo en 0 o menos');
    }
  }
  const documento: Record<string, unknown> = {};
  for (const campo of ['contraparte', 'telefono', 'monto', 'vence', 'nota', 'precio_contado'] as const) {
    const valor = cambios[campo];
    if (valor === undefined) {
      documento[campo] = deleteField();
    } else {
      documento[campo] = valor;
    }
  }
  await updateDoc(doc(db, COLECCION_COMPROMISOS, id), documento);
}

// Cierra sin inventar un cobro: perdonado o cancelado (#135).
export async function cerrarCompromiso(id: string, cierre: Cierre): Promise<void> {
  await updateDoc(doc(db, COLECCION_COMPROMISOS, id), { cierre });
}

// Reabre un compromiso perdonado o cancelado (#135).
export async function reabrirCompromiso(id: string): Promise<void> {
  await updateDoc(doc(db, COLECCION_COMPROMISOS, id), { cierre: deleteField() });
}

// Borra el compromiso y decide qué pasa con sus transacciones amarradas
// (#135): con 'todo' se borran, con 'soltar' quedan sueltas contando como
// gasto o ingreso normal.
export async function borrarCompromiso(
  compromiso: Compromiso,
  transaccionesAmarradas: Transaccion[],
  modo: 'todo' | 'soltar',
): Promise<void> {
  const ids = transaccionesAmarradas
    .filter((t) => t.compromiso_id === compromiso.id && t.id)
    .map((t) => t.id as string);
  const { batches } = armarBatchBorrado(db, compromiso.id as string, ids, modo);
  for (const batch of batches) {
    await batch.commit();
  }
}

export type Direccion = 'me_deben' | 'debo';
export type Naturaleza = 'dinero' | 'compra';
export type Cierre = 'perdonado' | 'cancelado';

export interface Plan {
  modo: 'fijo' | 'variable';
  cuota?: number; // obligatoria si modo es 'fijo'
  numero_cuotas: number; // entero 1..120
  dia: number; // entero 1..31
  primera: string; // 'AAAA-MM'
}

export interface Compromiso {
  id?: string;
  uid?: string;
  direccion: Direccion;
  naturaleza: Naturaleza;
  contraparte: string;
  telefono?: string;
  monto: number;
  fecha: string; // AAAA-MM-DD
  vence?: string; // AAAA-MM-DD
  plan?: Plan;
  precio_contado?: number;
  categoria_id?: string;
  cartera_id?: string;
  nota?: string;
  cierre?: Cierre;
}
