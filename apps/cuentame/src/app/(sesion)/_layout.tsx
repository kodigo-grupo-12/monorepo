import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { Navbar } from '../../nav/Navbar';
import { ModalAgregarTransaccion } from '../../transacciones/ModalAgregarTransaccion';
import { useSesion } from '../../sesion/ProveedorSesion';
import { AvisosGlobal } from '../../avisos/AvisosGlobal';
import { paleta } from '../../tema/colores';

// Layout del grupo con sesión: el navbar se monta una sola vez aquí y
// cubre las cuatro rutas. Sin sesión, manda de vuelta a la entrada, así
// el carrusel y el login siguen sin navbar.
export default function DisposicionSesion() {
  const { cargando, activa, arranque } = useSesion();
  const [modalAbierto, setModalAbierto] = useState(false);

  // La verificación del arranque (T015) también se cubre: antes el inicio
  // se asomaba detrás de la bienvenida hasta que llegaban las escuchas
  // (comentario del PR #148).
  if (cargando || (activa && arranque === 'verificando')) {
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
      <Navbar alTocarCentral={() => setModalAbierto(true)} />
      {/* El modal de agregar transacción es la única excepción a la regla
          del navbar (T006): por ser de pantalla completa lo tapa. La X
          cierra sin guardar y regresa a donde estaba la persona. */}
      <ModalAgregarTransaccion
        visible={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
      />
      {/* Los avisos in-app (T013) viven aquí una sola vez: toast sobre el
          navbar, apagable desde Configuraciones. */}
      <AvisosGlobal />
    </View>
  );
}
