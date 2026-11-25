import { useLocalSearchParams } from 'expo-router';

import { PantallaNuevaCategoria } from '../../categorias/PantallaNuevaCategoria';
import type { TipoCategoria } from '../../datos/categorias';

// La radio Gasto/Ingreso arranca preseleccionada según el tab del que se
// vino (Categorías pasa su tab activo).
export default function RutaNuevaCategoria() {
  const { tipo } = useLocalSearchParams<{ tipo?: string }>();
  const tipoInicial: TipoCategoria = tipo === 'ingreso' ? 'ingreso' : 'gasto';
  return <PantallaNuevaCategoria tipoInicial={tipoInicial} />;
}
