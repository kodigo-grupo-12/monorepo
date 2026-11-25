import { useEffect, useRef, useState } from 'react';
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
  const antes = useRef(activa);

  useEffect(() => {
    if (antes.current && !activa) {
      setSplashActivo(true);
    }
    antes.current = activa;
  }, [activa]);

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
        <PantallaSplash alTerminar={() => setSplashActivo(false)} />
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
