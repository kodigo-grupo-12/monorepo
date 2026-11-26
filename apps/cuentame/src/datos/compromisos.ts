// Tipos y escrituras del compromiso de «Deudas y préstamos» (spec #130).
// Nada de lo que es suma se guarda: lo abonado, lo pendiente y el estado se
// calculan en compromisos/calculos.ts (ADR-0019).
import { collection } from 'firebase/firestore';

import { armarBatchCompromiso, COLECCION_COMPROMISOS, type DatosNuevoCompromiso } from './consultas';
import { datosDeAbono, type DatosAbono } from '../compromisos/calculos';
import { crearTransaccion } from './transacciones';
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
