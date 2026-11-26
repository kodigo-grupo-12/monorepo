import { useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useAjustes } from '../ajustes/ProveedorAjustes';

// Presionable (T013): un Pressable con feedback de presión sutil, una
// escala mínima al tocar que regresa con muelle. Respeta el ajuste de
// animaciones: apagadas, queda un Pressable normal.
type Props = PressableProps & {
  children: ReactNode;
  escala?: number;
  estiloContenido?: StyleProp<ViewStyle>;
};

export function Presionable({ children, escala = 0.97, estiloContenido, ...resto }: Props) {
  const { ajustes } = useAjustes();
  const animacion = useRef(new Animated.Value(1)).current;

  const presionar = (evento: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (ajustes.animaciones) {
      Animated.timing(animacion, { toValue: escala, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }
    resto.onPressIn?.(evento);
  };

  const soltar = (evento: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    if (ajustes.animaciones) {
      Animated.spring(animacion, { toValue: 1, speed: 40, bounciness: 5, useNativeDriver: true }).start();
    }
    resto.onPressOut?.(evento);
  };

  return (
    <Pressable {...resto} onPressIn={presionar} onPressOut={soltar}>
      <Animated.View style={[{ transform: [{ scale: animacion }] }, estiloContenido]}>{children}</Animated.View>
    </Pressable>
  );
}
