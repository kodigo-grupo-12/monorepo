import { useCallback, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';

const VISIBLE_MS = 2000;
const DURACION_MS = 180;
const controladorNativo = Platform.OS !== 'web';

// El placeholder único y compartido (ADR-0007): dice «En desarrollo» y no
// lleva parámetros. Como raíz de tab no ofrece botón de atrás; empujada
// desde Cuenta, sí, además del gesto del sistema. El toast es propio, sin
// librerías: en cada entrada aparece abajo sobre el navbar, dura dos
// segundos y desaparece solo.
export function PantallaPlaceholder({ conAtras = false }: { conAtras?: boolean }) {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const opacidad = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      opacidad.setValue(0);
      Animated.timing(opacidad, {
        toValue: 1,
        duration: DURACION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: controladorNativo,
      }).start();

      const temporizador = setTimeout(() => {
        Animated.timing(opacidad, {
          toValue: 0,
          duration: DURACION_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: controladorNativo,
        }).start();
      }, VISIBLE_MS);

      return () => {
        clearTimeout(temporizador);
        opacidad.setValue(0);
      };
    }, [opacidad]),
  );

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      {conAtras ? (
        <Pressable
          style={[estilos.atras, { top: margenes.top + 10 }]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => enrutador.back()}
        >
          <View style={estilos.atrasPunta} />
        </Pressable>
      ) : null}
      <Text style={[estilos.texto, { color: paleta.texto }]}>En desarrollo</Text>
      <Animated.View style={[estilos.toast, { opacity: opacidad }]} pointerEvents="none">
        <Text style={[estilos.toastTexto, { color: paleta.texto }]}>En desarrollo</Text>
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atras: {
    position: 'absolute',
    left: 16,
    padding: 10,
  },
  atrasPunta: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  texto: {
    fontSize: 22,
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: paleta.superficie,
    borderColor: paleta.separador,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastTexto: {
    fontSize: 14,
  },
});
