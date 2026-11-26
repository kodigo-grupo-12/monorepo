import { useLocalSearchParams } from 'expo-router';

import { PantallaDetalleCompromiso } from '../../../compromisos/PantallaDetalleCompromiso';

// Detalle de un compromiso, pantalla empujada con el navbar visible.
export default function RutaDetalleCompromiso() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PantallaDetalleCompromiso id={id} />;
}
