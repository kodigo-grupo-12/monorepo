import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { paleta } from '../tema/colores';
import type { Aviso } from './avisos';

// Toast con auto cierre (T013): variante de éxito y de error, con acción
// opcional (reintentar). Aparición y salida animadas.
const TIEMPO_VISIBLE = 2600;
const controladorNativo = Platform.OS !== 'web';

export function ToastAviso({ aviso, alOcultar }: { aviso: Aviso; alOcultar: () => void }) {
  const animacion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animacion, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: controladorNativo,
    }).start();

    const temporizador = setTimeout(() => {
      Animated.timing(animacion, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: controladorNativo,
      }).start(() => alOcultar());
    }, TIEMPO_VISIBLE);

    return () => clearTimeout(temporizador);
  }, [aviso, animacion, alOcultar]);

  const colorPunto = aviso.tipo === 'exito' ? paleta.verdeAccion : paleta.rojo;

  return (
    <Animated.View
      style={[estilos.toast, { opacity: animacion, transform: [{ translateY: animacion }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={[estilos.punto, { backgroundColor: colorPunto }]} />
      <Text style={[estilos.mensaje, { color: paleta.texto }]} numberOfLines={2}>
        {aviso.mensaje}
      </Text>
      {aviso.accion ? (
        <Pressable
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={aviso.accion.etiqueta}
          onPress={() => aviso.accion?.alTocar()}
        >
          <Text style={[estilos.accion, { color: paleta.verdeAccion }]}>{aviso.accion.etiqueta}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 340,
    backgroundColor: paleta.tarjeta,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: paleta.sombra,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mensaje: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  accion: {
    fontSize: 14,
    fontWeight: '800',
  },
});
