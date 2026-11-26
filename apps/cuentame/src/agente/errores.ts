// Traducción de errores del modelo a mensajes en español para la persona
// (spec #107). Nunca se muestra un código crudo. Los códigos se comparan
// como texto para que las pruebas corran sin cargar firebase/ai: los
// valores de AIErrorCode son cadenas estables del SDK.
const MENSAJE_CUOTA = 'Se acabó la cuota gratis del Agente por ahora. Intentá de nuevo en un rato.';
const MENSAJE_APP_CHECK = 'El Agente no está disponible por ahora (App Check rechazó la llamada). Avisale al equipo.';
const MENSAJE_RED = 'No hay conexión. Revisá la red e intentá de nuevo.';
const MENSAJE_API_NO_ACTIVADA = 'El Agente todavía no está activado en el proyecto. Avisale al equipo.';
const MENSAJE_GENERAL = 'El Agente no pudo responder ahora. Intentá de nuevo.';

export function mensajeDeErrorDelAgente(error: unknown): string {
  const texto = String((error as { message?: unknown } | null)?.message ?? error);
  const codigo = String((error as { code?: unknown } | null)?.code ?? '');
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(texto) || /RESOURCE_EXHAUSTED/i.test(codigo)) {
    return MENSAJE_CUOTA;
  }
  if (/app[ -]?check/i.test(texto) || /app-check/i.test(codigo)) {
    return MENSAJE_APP_CHECK;
  }
  if (codigo === 'FETCH_ERROR' || error instanceof TypeError || /network/i.test(texto)) {
    return MENSAJE_RED;
  }
  if (codigo === 'API_NOT_ENABLED' || /API_NOT_ENABLED/i.test(texto)) {
    return MENSAJE_API_NO_ACTIVADA;
  }
  return MENSAJE_GENERAL;
}
