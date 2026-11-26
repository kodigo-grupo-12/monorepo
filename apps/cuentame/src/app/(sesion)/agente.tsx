import { useSesion } from '../../sesion/ProveedorSesion';
import { PantallaAgente } from '../../agente/PantallaAgente';

// Raíz de tab: el chat del Agente, reiniciado por persona (key con el uid).
export default function RutaAgente() {
  const { usuario } = useSesion();
  return <PantallaAgente key={usuario?.uid ?? 'sin-sesion'} />;
}
