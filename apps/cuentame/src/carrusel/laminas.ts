// Copias locales. Se reponen desde la carpeta de assets del carrusel
// de la TAREA 003, con estos nombres de origen:
// 01-finanzas-simple.png, 02-gastos-por-mes.png, 03-balance-todo.png,
// 04-metas-ahorro.png, 05-agente.png, 06-privacidad.png.
// Nada se pide por URL. El modelo no se copia a la app.

export type Lamina = {
  lineas: readonly [string, string];
  imagen: number;
};

export const laminas: readonly Lamina[] = [
  {
    lineas: ['Una forma simple', 'de cuidar tus finanzas'],
    imagen: require('../../assets/carrusel/finanzas-simple.png'),
  },
  {
    lineas: ['Gastos', 'por mes'],
    imagen: require('../../assets/carrusel/gastos-por-mes.png'),
  },
  {
    lineas: ['Balance', 'de todo'],
    imagen: require('../../assets/carrusel/balance-todo.png'),
  },
  {
    lineas: ['Metas', 'de ahorro'],
    imagen: require('../../assets/carrusel/metas-ahorro.png'),
  },
  {
    lineas: ['Agente', ' '],
    imagen: require('../../assets/carrusel/agente.png'),
  },
  {
    lineas: ['Privacidad', ' '],
    imagen: require('../../assets/carrusel/privacidad.png'),
  },
];

export const SEGUNDO_MS = 1000;
