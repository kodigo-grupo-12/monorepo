import { PantallaAgente } from '../../agente/PantallaAgente';
import { useSesion } from '../../sesion/ProveedorSesion';

// Raíz de tab: el chat del Agente. El historial vive dentro de la
// pantalla y se borra al cerrar sesión: la key remonta la pantalla cuando
// la sesión cambia (con #106 la key será el uid de la persona).
export default function RutaAgente() {
  const { activa } = useSesion();
  return <PantallaAgente key={activa ? 'con-sesion' : 'sin-sesion'} />;
}
