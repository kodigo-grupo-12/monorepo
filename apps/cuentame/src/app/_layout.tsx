import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorSesion, useSesion } from '../sesion/ProveedorSesion';
import { ProveedorSplash } from '../splash/SplashActivo';
import { PantallaSplash } from '../splash/PantallaSplash';
import { paleta } from '../tema/colores';

// El recorrido de bienvenida vive acá: el splash cubre la app al arrancar y
// vuelve a cubrirla cuando la sesión se cierra, para reiniciar el recorrido
// completo (splash, carrusel y login) sin recargar nada (ADR-0008).
function Recorrido() {
  const { activa } = useSesion();
  const [splashActivo, setSplashActivo] = useState(true);
  const [cicloSplash, setCicloSplash] = useState(0);
  const [activaVista, setActivaVista] = useState(activa);

  // El cierre tiene que cubrir en el mismo render en que `activa` pasa a
  // false. Un efecto corre después del paint y deja ver el carrusel; el
  // compilador de React también puede saltárselo. Ajuste de estado durante
  // el render (docs de React): si la sesión acaba de cerrarse, el splash
  // vuelve antes de pintar y se remonta para que el temporizador arranque
  // de cero.
  if (activa !== activaVista) {
    setActivaVista(activa);
    if (activaVista && !activa) {
      setSplashActivo(true);
      setCicloSplash((n) => n + 1);
    }
  }

  return (
    <ProveedorSplash activo={splashActivo}>
    <View style={{ flex: 1, backgroundColor: paleta.fondo }}>
      <StatusBar style="light" />
      <View
        style={{ flex: 1 }}
        aria-hidden={splashActivo}
        accessibilityElementsHidden={splashActivo}
        importantForAccessibility={splashActivo ? 'no-hide-descendants' : 'auto'}
        pointerEvents={splashActivo ? 'none' : 'auto'}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: paleta.fondo },
          }}
        />
      </View>
      {splashActivo ? (
        <PantallaSplash key={cicloSplash} alTerminar={() => setSplashActivo(false)} />
      ) : null}
    </View>
    </ProveedorSplash>
  );
}

export default function DisposicionRaiz() {
  return (
    <ProveedorSesion>
      <Recorrido />
    </ProveedorSesion>
  );
}
