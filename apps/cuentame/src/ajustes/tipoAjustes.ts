// Ajustes locales de la app (T013): viven en el dispositivo, nunca en
// Firestore. Animaciones apagables por accesibilidad y avisos in-app
// apagables por gusto.
export interface Ajustes {
  animaciones: boolean;
  avisos: boolean;
}
