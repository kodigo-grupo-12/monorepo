import { useLocalSearchParams } from 'expo-router';

import { PantallaTransacciones } from '../../transacciones/PantallaTransacciones';

// Raíz de tab: la pantalla real de Transacciones (T009), sin botón de atrás.
// Desde la T012 (#117) acepta ?dia=YYYY-MM-DD, que manda una barra del
// gráfico de Inicio.
export default function RutaTransacciones() {
  const { dia } = useLocalSearchParams<{ dia?: string | string[] }>();
  const diaInicial = typeof dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;

  return <PantallaTransacciones diaInicial={diaInicial} />;
}
