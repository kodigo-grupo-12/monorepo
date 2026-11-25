import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { Navbar } from '../../nav/Navbar';
import { usarSesion } from '../../sesion/ProveedorSesion';
import { paleta } from '../../tema/colores';

// Layout del grupo con sesión: el navbar se monta una sola vez aquí y
// cubre las cuatro rutas. Sin sesión, manda de vuelta a la entrada, así
// el carrusel y el login siguen sin navbar.
export default function DisposicionSesion() {
  const { cargando, activa } = usarSesion();

  if (cargando) {
    return <View style={{ flex: 1, backgroundColor: paleta.fondo }} />;
  }

  if (!activa) {
    return <Redirect href="/" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: paleta.fondo }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: paleta.fondo },
        }}
      />
      <Navbar />
    </View>
  );
}
