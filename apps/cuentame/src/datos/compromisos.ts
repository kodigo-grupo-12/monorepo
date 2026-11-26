// Tipos del compromiso de «Deudas y préstamos» (spec #130, issue #131).
// Nada de lo que es suma se guarda: lo abonado, lo pendiente y el estado se
// calculan en compromisos/calculos.ts (ADR-0019).
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
