import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { PantallaCarrusel } from '../carrusel/PantallaCarrusel';
import { usarSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

// Compuerta de la sesión: sin sesión, carrusel; con sesión, el grupo con
// navbar. El montaje del navbar vive en el layout del grupo con sesión.
export default function Entrada() {
  const { cargando, activa } = usarSesion();

  if (cargando) {
    return <View style={{ flex: 1, backgroundColor: paleta.fondo }} />;
  }

  if (activa) {
    return <Redirect href="/inicio" />;
  }

  return <PantallaCarrusel />;
}
