import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useAjustes } from '../ajustes/ProveedorAjustes';
import { paleta } from '../tema/colores';

// Esqueleto (T013): bloque con pulso suave mientras los datos en vivo
// llegan. Con animaciones apagadas queda el bloque estático, que sigue
// siendo un mejor sustituto que un hueco vacío.
export function Esqueleto({
  ancho = 100,
  alto = 14,
  redondeo = 7,
  margen = 6,
}: {
  ancho?: number | `${number}%`;
  alto?: number;
  redondeo?: number;
  margen?: number;
}) {
  const { ajustes } = useAjustes();
  const opacidad = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!ajustes.animaciones) {
      return;
    }
    const latido = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0.85, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.35, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    latido.start();
    return () => latido.stop();
  }, [ajustes.animaciones, opacidad]);

  return (
    <Animated.View
      style={[
        estilos.bloque,
        { width: ancho, height: alto, borderRadius: redondeo, marginVertical: margen, opacity: opacidad },
      ]}
    />
  );
}

const estilos = StyleSheet.create({
  bloque: {
    backgroundColor: paleta.barraFantasma,
  },
});
