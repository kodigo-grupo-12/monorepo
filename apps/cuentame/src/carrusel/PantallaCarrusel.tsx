import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usarSplashActivo } from '../entrada/SplashActivo';
import { reducirMovimientoInicial } from '../splash/reducirMovimientoInicial';
import { paleta } from '../tema/colores';
import { laminas, SEGUNDO_MS } from './laminas';

const icono = require('../../assets/marca/icono.png');

function usarReducirMovimiento() {
  const inicial = reducirMovimientoInicial();
  const [reducir, setReducir] = useState(inicial ?? false);

  useLayoutEffect(() => {
    if (inicial == null) {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(setReducir)
        .catch(() => setReducir(false));
    }

    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducir);
    return () => suscripcion.remove();
  }, [inicial]);

  return reducir;
}

export function PantallaCarrusel() {
  const insets = useSafeAreaInsets();
  const reducir = usarReducirMovimiento();
  const splashEncima = usarSplashActivo();
  const [indice, setIndice] = useState(0);
  const indiceRef = useRef(0);
  indiceRef.current = indice;

  const irA = (siguiente: number) => {
    const total = laminas.length;
    const normalizado = ((siguiente % total) + total) % total;
    setIndice(normalizado);
  };

  useEffect(() => {
    if (reducir || splashEncima) {
      return;
    }

    const id = setTimeout(() => irA(indiceRef.current + 1), SEGUNDO_MS);
    return () => clearTimeout(id);
  }, [indice, reducir, splashEncima]);

  const gesto = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestoActual) =>
        Math.abs(gestoActual.dx) > 12 && Math.abs(gestoActual.dx) > Math.abs(gestoActual.dy),
      onPanResponderRelease: (_, gestoActual) => {
        if (gestoActual.dx <= -40) {
          irA(indiceRef.current + 1);
        } else if (gestoActual.dx >= 40) {
          irA(indiceRef.current - 1);
        }
      },
    }),
  ).current;

  const lamina = laminas[indice];

  return (
    <View style={[estilos.pantalla, { backgroundColor: paleta.fondo, paddingTop: Math.max(insets.top, 16) }]}>
      <View style={estilos.cabecera}>
        <Image
          source={icono}
          style={estilos.icono}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
        />
        <Text style={[estilos.marca, { color: paleta.verdeCarrusel }]}>cuéntame</Text>
      </View>

      <View style={estilos.ilustracion} {...gesto.panHandlers}>
        <Image
          source={lamina.imagen}
          style={estilos.dibujo}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
        />
      </View>

      <View style={estilos.titular}>
        <Text style={[estilos.linea, { color: paleta.texto }]}>{lamina.lineas[0]}</Text>
        <Text style={[estilos.linea, { color: paleta.texto }]}>{lamina.lineas[1]}</Text>
      </View>

      <View style={estilos.puntos}>
        {laminas.map((item, posicion) => {
          const activo = posicion === indice;
          const nombre = item.lineas.filter((linea) => linea.trim().length > 0).join(' ');
          return (
            <Pressable
              key={nombre}
              onPress={() => irA(posicion)}
              accessibilityRole="button"
              accessibilityLabel={nombre}
              accessibilityState={{ selected: activo }}
              hitSlop={8}
              style={[
                estilos.punto,
                { backgroundColor: activo ? paleta.verdeCarrusel : paleta.punto },
              ]}
            />
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="INICIAR SESIÓN"
        style={[estilos.boton, { backgroundColor: paleta.verdeCarrusel }]}
        onPress={() => undefined}
      >
        <Text style={estilos.botonTexto}>INICIAR SESIÓN</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="SALTAR"
        onPress={() => undefined}
        style={estilos.saltar}
      >
        <Text style={[estilos.saltarTexto, { color: paleta.verdeCarrusel }]}>SALTAR</Text>
      </Pressable>

      <Text
        style={[
          estilos.version,
          { color: paleta.textoSuave, marginBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        versión 0.1.0
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  marca: {
    fontSize: 22,
    fontWeight: '700',
  },
  ilustracion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dibujo: {
    width: '100%',
    height: '100%',
  },
  titular: {
    minHeight: 72,
    justifyContent: 'center',
  },
  linea: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  boton: {
    borderRadius: 28,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  saltar: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saltarTexto: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  version: {
    textAlign: 'center',
    fontSize: 13,
  },
});
