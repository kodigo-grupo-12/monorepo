import { View } from 'react-native';

import { PantallaCarrusel } from '../carrusel/PantallaCarrusel';
import { PantallaInicio } from '../inicio/PantallaInicio';
import { usarSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

export default function PantallaSegunSesion() {
  const { cargando, activa } = usarSesion();

  if (cargando) {
    return <View style={{ flex: 1, backgroundColor: paleta.fondo }} />;
  }

  if (activa) {
    return <PantallaInicio />;
  }

  return <PantallaCarrusel />;
}
