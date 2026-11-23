import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ProveedorSplash } from '../splash/SplashActivo';
import { PantallaSplash } from '../splash/PantallaSplash';
import { paleta } from '../tema/colores';

export default function DisposicionRaiz() {
  const [splashActivo, setSplashActivo] = useState(true);

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
