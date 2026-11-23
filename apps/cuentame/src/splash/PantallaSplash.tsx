import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usarPaleta } from '../tema/colores';
import { reducirMovimientoInicial } from './reducirMovimientoInicial';

// Copias locales. La fuente es la carpeta Assets de kodigo-grupo-12/.github.
// icono.png sale de cuentame-web-512.png.
// logo-kodigo-claro.png sale de kodigo_logo.png.
// logo-kodigo-oscuro.png sale de kodigo_logo_dark.png.
const icono = require('../../assets/marca/icono.png');
const logoClaro = require('../../assets/marca/logo-kodigo-claro.png');
const logoOscuro = require('../../assets/marca/logo-kodigo-oscuro.png');

const ESPERA_MS = 2000;
const DURACION_ICONO_MS = 450;
const DEMORA_CREDITO_MS = 220;
const DURACION_CREDITO_MS = 420;
const DURACION_SALIDA_MS = 280;
const ESCALA_INICIAL = 0.92;

const controladorNativo = Platform.OS !== 'web';

function animar(valor: Animated.Value, destino: number, duracion: number, demora = 0) {
  return Animated.timing(valor, {
    toValue: destino,
    duration: duracion,
    delay: demora,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: controladorNativo,
  });
}

type Propiedades = {
  alTerminar: () => void;
};

export function PantallaSplash({ alTerminar }: Propiedades) {
  const paleta = usarPaleta();
  const insets = useSafeAreaInsets();
  const alTerminarRef = useRef(alTerminar);
  const saliendo = useRef(false);
  const terminado = useRef(false);
  const entradaHecha = useRef(false);
  const imagenLista = useRef(false);
  const preferenciaLista = useRef(false);
  const salidaPendiente = useRef(false);
  const reducirRef = useRef(false);
  const opacidadIcono = useRef(new Animated.Value(0)).current;
  const escalaIcono = useRef(new Animated.Value(ESCALA_INICIAL)).current;
  const opacidadCredito = useRef(new Animated.Value(0)).current;
  const opacidadCapa = useRef(new Animated.Value(1)).current;

  alTerminarRef.current = alTerminar;

  const terminar = () => {
    if (terminado.current) {
      return;
    }

    terminado.current = true;
    alTerminarRef.current();
  };

  const mostrarQuieto = () => {
    opacidadIcono.stopAnimation();
    escalaIcono.stopAnimation();
    opacidadCredito.stopAnimation();
    opacidadCapa.stopAnimation();
    opacidadIcono.setValue(1);
    escalaIcono.setValue(1);
    opacidadCredito.setValue(1);
    opacidadCapa.setValue(1);
  };

  const salir = () => {
    if (saliendo.current) {
      return;
    }

    if (!preferenciaLista.current) {
      salidaPendiente.current = true;
      return;
    }

    saliendo.current = true;

    if (reducirRef.current) {
      terminar();
      return;
    }

    animar(opacidadCapa, 0, DURACION_SALIDA_MS).start(({ finished }) => {
      if (finished) {
        terminar();
      }
    });
  };

  const salirRef = useRef(salir);
  salirRef.current = salir;

  const intentarEntrada = () => {
    if (!imagenLista.current || !preferenciaLista.current) {
      return;
    }

    if (reducirRef.current) {
      mostrarQuieto();
      return;
    }

    if (entradaHecha.current || saliendo.current) {
      return;
    }

    entradaHecha.current = true;
    opacidadIcono.setValue(0);
    escalaIcono.setValue(ESCALA_INICIAL);
    opacidadCredito.setValue(0);

    Animated.parallel([
      animar(opacidadIcono, 1, DURACION_ICONO_MS),
      animar(escalaIcono, 1, DURACION_ICONO_MS),
      animar(opacidadCredito, 1, DURACION_CREDITO_MS, DEMORA_CREDITO_MS),
    ]).start();
  };

  const intentarEntradaRef = useRef(intentarEntrada);
  intentarEntradaRef.current = intentarEntrada;

  useEffect(() => {
    const id = setTimeout(() => salirRef.current(), ESPERA_MS);
    return () => clearTimeout(id);
  }, []);

  useLayoutEffect(() => {
    let vivo = true;

    const aplicarMovimiento = (reducirMovimiento: boolean) => {
      if (!vivo || preferenciaLista.current) {
        return;
      }

      reducirRef.current = reducirMovimiento;
      preferenciaLista.current = true;

      if (reducirMovimiento) {
        entradaHecha.current = true;
        mostrarQuieto();
      } else {
        intentarEntradaRef.current();
      }

      if (salidaPendiente.current) {
        salirRef.current();
      }
    };

    const inicial = reducirMovimientoInicial();
    if (inicial != null) {
      aplicarMovimiento(inicial);
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(aplicarMovimiento)
        .catch(() => aplicarMovimiento(false));
    }

    const suscripcion = AccessibilityInfo.addEventListener('reduceMotionChanged', (reducirMovimiento) => {
      if (!vivo) {
        return;
      }

      reducirRef.current = reducirMovimiento;
      preferenciaLista.current = true;

      if (reducirMovimiento) {
        entradaHecha.current = true;
        if (saliendo.current) {
          opacidadCapa.stopAnimation();
          terminar();
          return;
        }

        mostrarQuieto();
      }
    });

    return () => {
      vivo = false;
      suscripcion.remove();
    };
  }, [escalaIcono, opacidadCapa, opacidadCredito, opacidadIcono]);

  const logo = paleta.esquema === 'oscuro' ? logoOscuro : logoClaro;

  return (
    <Animated.View
      style={[estilos.pantalla, { backgroundColor: paleta.fondo, opacity: opacidadCapa }]}
    >
      <View style={estilos.iconoZona}>
        <Animated.View
          style={{
            opacity: opacidadIcono,
            transform: [{ scale: escalaIcono }],
          }}
        >
          <Image
            source={icono}
            style={estilos.icono}
            contentFit="contain"
            accessible
            accessibilityRole="image"
            accessibilityLabel="Cuéntame"
            onDisplay={() => {
              imagenLista.current = true;
              intentarEntradaRef.current();
            }}
          />
        </Animated.View>
      </View>
      <Animated.View
        style={[
          estilos.credito,
          {
            opacity: opacidadCredito,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 24),
            paddingRight: Math.max(insets.right, 24),
          },
        ]}
      >
        <Image
          source={logo}
          style={estilos.logo}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
        />
        <Text style={[estilos.linea, { color: paleta.credito }]}>
          AI For Devs Jr. 5 — Grupo 12
        </Text>
      </Animated.View>
      <Pressable
        style={estilos.toque}
        onPress={() => salirRef.current()}
        accessibilityRole="button"
        accessibilityLabel="continuar"
      />
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  iconoZona: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icono: {
    width: 320,
    maxWidth: '100%',
    aspectRatio: 1,
  },
  credito: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 12,
  },
  logo: {
    width: 112,
    height: 28,
  },
  linea: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  toque: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
