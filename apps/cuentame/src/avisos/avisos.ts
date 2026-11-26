// Canal de avisos in-app (T013): cualquier pantalla pide un aviso con
// mostrarAviso y el receptor, montado una sola vez en el layout de la
// sesión, lo pinta como toast. Pub/sub minimalista, sin librerías nuevas.
export type TipoAviso = 'exito' | 'error';

export interface AccionAviso {
  etiqueta: string;
  alTocar: () => void;
}

export interface Aviso {
  mensaje: string;
  tipo: TipoAviso;
  accion?: AccionAviso;
}

type Oyente = (aviso: Aviso) => void;
let oyentes: Oyente[] = [];

export function mostrarAviso(aviso: Aviso): void {
  for (const oyente of oyentes) {
    oyente(aviso);
  }
}

export function suscribirseAvisos(oyente: Oyente): () => void {
  oyentes.push(oyente);
  return () => {
    oyentes = oyentes.filter((otro) => otro !== oyente);
  };
}
