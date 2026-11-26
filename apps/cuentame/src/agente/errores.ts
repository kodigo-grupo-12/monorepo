// Traducción de errores del modelo a español (T011, #114). Nunca muestra
// códigos crudos. El orden importa: cuota, App Check, red y API no
// activada antes que el mensaje genérico.

export function mensajeDeErrorDelAgente(error: unknown): string {
  const codigo = typeof error === 'object' && error !== null ? String((error as { code?: unknown }).code ?? '') : '';
  const mensaje = String(
    typeof error === 'object' && error !== null && (error as { message?: unknown }).message !== undefined
      ? (error as { message?: unknown }).message
      : error,
  );
  const todo = `${codigo} ${mensaje}`;
  if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(todo)) {
    return 'Se acabó la cuota gratis del Agente por ahora. Intentá de nuevo en un rato.';
  }
  if (/app[-_ ]?check/i.test(todo)) {
    return 'El Agente no está disponible por ahora (App Check rechazó la llamada). Avisale al equipo.';
  }
  if (codigo === 'FETCH_ERROR' || error instanceof TypeError || /network/i.test(todo)) {
    return 'No hay conexión. Revisá la red e intentá de nuevo.';
  }
  if (codigo === 'API_NOT_ENABLED' || /api.*no.*activad|not.*enabled/i.test(todo)) {
    return 'El Agente todavía no está activado en el proyecto. Avisale al equipo.';
  }
  return 'El Agente no pudo responder ahora. Intentá de nuevo.';
}
