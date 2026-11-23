import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';

import { PantallaSplash } from '../splash/PantallaSplash';

export default function DisposicionRaiz() {
  const [splashActivo, setSplashActivo] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        aria-hidden={splashActivo}
        accessibilityElementsHidden={splashActivo}
        importantForAccessibility={splashActivo ? 'no-hide-descendants' : 'auto'}
        pointerEvents={splashActivo ? 'none' : 'auto'}
      >
        <Stack screenOptions={{ headerShown: false }} />
      </View>
      {splashActivo ? (
        <PantallaSplash alTerminar={() => setSplashActivo(false)} />
      ) : null}
    </View>
  );
}
