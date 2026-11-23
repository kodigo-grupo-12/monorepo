// El MVP se queda en el oscuro de las plantillas. El modo del telefono no entra.
export const paleta = {
  fondo: '#1C1C1E',
  texto: '#F4F7F5',
  credito: '#C5CDC8',
} as const;

export function usarPaleta() {
  return paleta;
}
