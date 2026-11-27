import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { vencimientosApurados } from '../compromisos/calculos';
import { hoyISO } from '../transacciones/fechas';
import { useCompromisos } from '../datos/useCompromisos';
import { useTransacciones } from '../datos/useTransacciones';

const glifoAgente = require('../../assets/glifos/agente-robot.png');
const glifoAgenteActivo = require('../../assets/glifos/agente-robot-activo.png');

// Anatomía del rediseño aprobado el 2026-11-26 (issue #157): barra oscura
// con hairline separadora, cuatro tab con etiquetas, activo en verde con
// punto, + central prominente elevado sobre el borde y badge de
// vencimientos sobre Inicio. El tab activo sale de la ruta y tocar navega.
// Los glifos van dibujados con vistas, salvo el del Agente, que es un asset
// del proyecto (en dos tintas: inactivo y activo): Expo SDK 58 ya no trae
// un set de iconos y no se agrega ninguna dependencia nueva ni nada se
// pide por URL.

// En pantallas anchas (web) el contenido se centra con este tope en vez de
// estirarse de borde a borde: centrado, con poca separación de los bordes.
const ANCHO_CONTENIDO = 560;
const DESDE_ANCHO = 768;

type PropsGlifo = { activo?: boolean };

function GlifoInicio({ activo = false }: PropsGlifo) {
  const color = activo ? paleta.verdeLogin : paleta.textoSuave;

  return (
    <View style={estilos.glifo}>
      {activo ? (
        <View style={[estilos.techoLleno, { borderBottomColor: color }]} />
      ) : (
        <View style={estilos.techoContorno}>
          <View style={[estilos.aguaTechoIzquierda, { backgroundColor: color }]} />
          <View style={[estilos.aguaTechoDerecha, { backgroundColor: color }]} />
        </View>
      )}
      {activo ? (
        <View style={[estilos.cuerpoCasa, { backgroundColor: color }]} />
      ) : (
        <View style={[estilos.cuerpoCasa, { borderColor: color, borderWidth: 2 }]} />
      )}
    </View>
  );
}

function GlifoTransacciones({ activo = false }: PropsGlifo) {
  const color = activo ? paleta.verdeLogin : paleta.textoSuave;

  return (
    <View style={estilos.glifo}>
      <View style={estilos.flecha}>
        <View style={[estilos.astil, { backgroundColor: color }]} />
        <View style={[estilos.puntaDerecha, { borderLeftColor: color }]} />
      </View>
      <View style={estilos.flecha}>
        <View style={[estilos.puntaIzquierda, { borderRightColor: color }]} />
        <View style={[estilos.astil, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function GlifoAgente({ activo = false }: PropsGlifo) {
  // El robot va en dos tintas (inactivo y activo) y el inactivo además se
  // atenúa, para leerse bien en los dos estados.
  return (
    <Image
      source={activo ? glifoAgenteActivo : glifoAgente}
      style={[estilos.glifoAgente, { opacity: activo ? 1 : 0.55 }]}
      contentFit="contain"
    />
  );
}

function GlifoCuenta({ activo = false }: PropsGlifo) {
  const color = activo ? paleta.verdeLogin : paleta.textoSuave;

  return (
    <View style={estilos.glifo}>
      {activo ? (
        <View style={[estilos.cabeza, { backgroundColor: color }]} />
      ) : (
        <View style={[estilos.cabeza, { borderColor: color, borderWidth: 2 }]} />
      )}
      {activo ? (
        <View style={[estilos.torso, { backgroundColor: color }]} />
      ) : (
        <View style={[estilos.torso, { borderColor: color, borderWidth: 2 }]} />
      )}
    </View>
  );
}

function Posicion({
  etiqueta,
  activa = false,
  alTocar,
  children,
}: {
  etiqueta: string;
  activa?: boolean;
  alTocar?: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      style={estilos.posicion}
      accessibilityRole="tab"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: activa }}
      onPress={alTocar}
    >
      {children}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={
          activa
            ? [estilos.etiqueta, estilos.etiquetaActiva]
            : [estilos.etiqueta, estilos.etiquetaInactiva]
        }
      >
        {etiqueta}
      </Text>
      {/* El punto del tab activo: la ranura existe en los dos estados para
          que todos los tab midan lo mismo. */}
      <View
        style={[estilos.puntoActivo, { backgroundColor: activa ? paleta.verdeLogin : 'transparent' }]}
      />
    </Pressable>
  );
}

export function Navbar({ alTocarCentral }: { alTocarCentral?: () => void }) {
  const margenes = useSafeAreaInsets();
  const camino = usePathname();
  const enrutador = useRouter();
  const ancho = useWindowDimensions().width;
  const { compromisos, cargando: cargandoCompromisos } = useCompromisos();
  const { transacciones, cargando: cargandoTransacciones } = useTransacciones();

  // Las pantallas empujadas dentro del tab Cuenta (ADR-0011) mantienen a
  // Cuenta como tab activo.
  const enCuenta =
    camino === '/cuenta' ||
    camino === '/categorias' ||
    camino === '/nueva-categoria' ||
    camino === '/carteras' ||
    camino === '/nueva-cartera';

  // El badge de Inicio (#157): vencimientos de hoy o atrasados, la misma
  // lógica del aviso diario (#137), una sola fuente de verdad.
  const apurados =
    cargandoCompromisos || cargandoTransacciones
      ? []
      : vencimientosApurados(compromisos, transacciones, hoyISO());

  return (
    <View style={[estilos.barra, { paddingBottom: 6 + margenes.bottom }]}>
      <View style={[estilos.contenido, ancho >= DESDE_ANCHO && estilos.contenidoCentrado]}>
        <Posicion
          etiqueta="Inicio"
          activa={camino === '/inicio'}
          alTocar={() => enrutador.navigate('/inicio')}
        >
          <View>
            <GlifoInicio activo={camino === '/inicio'} />
            {apurados.length > 0 ? (
              <View style={estilos.insignia}>
                <Text style={estilos.insigniaTexto}>{apurados.length}</Text>
              </View>
            ) : null}
          </View>
        </Posicion>
        <Posicion
          etiqueta="Transacciones"
          activa={camino === '/transacciones'}
          alTocar={() => enrutador.navigate('/transacciones')}
        >
          <GlifoTransacciones activo={camino === '/transacciones'} />
        </Posicion>
        <View style={[estilos.posicion, estilos.posicionCentral]}>
          <Pressable
            style={estilos.botonCentral}
            accessibilityRole="button"
            accessibilityLabel="Nueva transacción"
            onPress={alTocarCentral}
          >
            <Text style={estilos.mas}>+</Text>
          </Pressable>
        </View>
        <Posicion
          etiqueta="Agente"
          activa={camino === '/agente'}
          alTocar={() => enrutador.navigate('/agente')}
        >
          <GlifoAgente activo={camino === '/agente'} />
        </Posicion>
        <Posicion
          etiqueta="Cuenta"
          activa={enCuenta}
          alTocar={() => enrutador.navigate('/cuenta')}
        >
          <GlifoCuenta activo={enCuenta} />
        </Posicion>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    backgroundColor: paleta.fondo,
    borderTopWidth: 1,
    borderTopColor: paleta.separador,
  },
  contenido: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  contenidoCentrado: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: ANCHO_CONTENIDO,
  },
  posicion: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingTop: 8,
  },
  posicionCentral: {
    justifyContent: 'center',
    paddingTop: 0,
  },
  puntoActivo: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  glifo: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techoLleno: {
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  techoContorno: {
    width: 22,
    height: 9,
  },
  aguaTechoIzquierda: {
    position: 'absolute',
    left: -2,
    top: 3,
    width: 14,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-36deg' }],
  },
  aguaTechoDerecha: {
    position: 'absolute',
    right: -2,
    top: 3,
    width: 14,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '36deg' }],
  },
  cuerpoCasa: {
    width: 16,
    height: 11,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  flecha: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 8,
  },
  astil: {
    width: 11,
    height: 2,
  },
  puntaDerecha: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  puntaIzquierda: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  glifoAgente: {
    width: 24,
    height: 24,
  },
  cabeza: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginBottom: 2,
  },
  torso: {
    width: 16,
    height: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  etiqueta: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  etiquetaActiva: {
    color: paleta.verdeLogin,
  },
  etiquetaInactiva: {
    color: paleta.textoSuave,
  },
  botonCentral: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: paleta.verdeLogin,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -18 }],
    shadowColor: paleta.sombra,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  mas: {
    color: paleta.texto,
    fontSize: 38,
    lineHeight: 42,
    marginTop: -2,
  },
  insignia: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: paleta.rojoMonto,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  insigniaTexto: {
    color: paleta.texto,
    fontSize: 10,
    lineHeight: 12,
  },
});
