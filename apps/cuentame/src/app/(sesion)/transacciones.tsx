import { useLocalSearchParams } from 'expo-router';

import { PantallaTransacciones } from '../../transacciones/PantallaTransacciones';

// Raíz de tab: la pantalla real de Transacciones (T009), sin botón de atrás.
// Desde la T012 acepta ?dia=YYYY-MM-DD (#117, desde una barra del gráfico
// de Inicio) y ?categoria= (#119, desde el desglose por categoría).
export default function RutaTransacciones() {
  const { dia, categoria } = useLocalSearchParams<{ dia?: string | string[]; categoria?: string | string[] }>();
  const diaInicial = typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;
  const categoriaInicial = typeof categoria === 'string' && categoria.length > 0 ? categoria : undefined;

  return <PantallaTransacciones diaInicial={diaInicial} categoriaInicial={categoriaInicial} />;
}
