// Normaliza el teléfono opcional de la contraparte (spec #130, issue #131).
// Solo dígitos: 8 dígitos son número local de El Salvador y llevan 503
// adelante para que wa.me entienda el destino. Sin librerías.
export function normalizarTelefono(texto: string): string | undefined {
  const digitos = (texto.match(/\d/g) ?? []).join('');
  if (digitos.length === 0) {
    return undefined;
  }
  if (digitos.length < 8 || digitos.length > 15) {
    throw new Error('Teléfono inválido');
  }
  return digitos.length === 8 ? `503${digitos}` : digitos;
}

// El nombre de la contraparte es obligatorio: de 1 a 60 caracteres después
// de recortar.
export function contraparteValida(texto: string): boolean {
  const recortado = texto.trim();
  return recortado.length >= 1 && recortado.length <= 60;
}
