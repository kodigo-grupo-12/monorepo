// Mensaje y enlace del botón «Recordarle» (#137). Puro: arma el texto y el
// enlace de wa.me, pero la persona es quien abre WhatsApp y lo manda.
import type { Compromiso } from '../datos/compromisos';

import { MESES } from '../transacciones/fechas';

export function mensajeRecordatorio(
  compromiso: Pick<Compromiso, 'contraparte' | 'naturaleza' | 'monto' | 'vence'>,
  pendiente: number,
  hoy: string,
): string {
  const articulo = compromiso.naturaleza === 'compra' ? 'de la compra' : 'del préstamo';
  const monto = `$${pendiente.toFixed(2)}`;
  const nombre = compromiso.contraparte;
  if (!compromiso.vence) {
    return `Hola ${nombre}, te recuerdo los ${monto} ${articulo}. Gracias.`;
  }
  const [, mes, dia] = compromiso.vence.split('-').map(Number);
  const fecha = `${dia} de ${MESES[mes - 1]}`;
  if (hoy > compromiso.vence) {
    return `Hola ${nombre}, te escribo por los ${monto} ${articulo}, que vencían el ${fecha}. ¿Cuándo me los podés pasar? Gracias.`;
  }
  return `Hola ${nombre}, te recuerdo los ${monto} ${articulo} para el ${fecha}. Gracias.`;
}

export function enlaceWhatsApp(telefono: string | undefined, mensaje: string): string {
  const texto = encodeURIComponent(mensaje);
  return telefono ? `https://wa.me/${telefono}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
