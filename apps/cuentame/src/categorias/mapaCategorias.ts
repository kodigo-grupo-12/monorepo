// Mapa fijo copiado del modelo Assets/categorias/modelo-pantalla-categorias.png
// (kodigo-grupo-12/.github): color y glifo de cada categoría de producción.
// Una categoría creada por la persona nace con el círculo gris de «…», igual
// que Otros gastos.
export interface AspectoCategoria {
  color: string;
  glifo:
    | 'taza'
    | 'bus'
    | 'bolsa'
    | 'libro'
    | 'pelicula'
    | 'recibo'
    | 'casa'
    | 'cruz'
    | 'barras'
    | 'otros';
}

const OTROS: AspectoCategoria = { color: '#787C80', glifo: 'otros' };

const MAPA_CATEGORIAS: Record<string, AspectoCategoria> = {
  'Comida y bebida': { color: '#26A69A', glifo: 'taza' },
  Transporte: { color: '#FF9800', glifo: 'bus' },
  Compras: { color: '#2196F3', glifo: 'bolsa' },
  Educación: { color: '#FFC107', glifo: 'libro' },
  Entretenimiento: { color: '#9575CD', glifo: 'pelicula' },
  'Facturas y servicios': { color: '#EF5350', glifo: 'recibo' },
  Familia: { color: '#4CAF50', glifo: 'casa' },
  Salud: { color: '#00BCD4', glifo: 'cruz' },
  Invertir: { color: '#FF7043', glifo: 'barras' },
  'Otros gastos': OTROS,
};

export function aspectoDe(nombre: string): AspectoCategoria {
  return MAPA_CATEGORIAS[nombre] ?? OTROS;
}
