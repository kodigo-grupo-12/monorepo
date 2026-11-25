import { View } from 'react-native';

import { PantallaCarrusel } from '../carrusel/PantallaCarrusel';
import { PantallaInicio } from '../inicio/PantallaInicio';
import { Navbar } from '../nav/Navbar';
import { usarSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

export default function PantallaSegunSesion() {
  const { cargando, activa } = usarSesion();

  if (cargando) {
    return <View style={{ flex: 1, backgroundColor: paleta.fondo }} />;
  }

  if (activa) {
    // El navbar se monta una sola vez aquí, donde la app decide la sesión:
    // no se repite por pantalla y no aparece en el carrusel ni en el login.
    return (
      <View style={{ flex: 1, backgroundColor: paleta.fondo }}>
        <PantallaInicio />
        <Navbar />
      </View>
    );
  }

  return <PantallaCarrusel />;
}
