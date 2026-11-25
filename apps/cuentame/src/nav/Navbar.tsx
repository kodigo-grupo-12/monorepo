import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';

// Anatomia copiada de navbar-template.png (kodigo-grupo-12/.github, Assets/navbar):
// cinco posiciones en el orden del modelo, con Inicio como tab activo. Estático:
// tocar no hace nada todavía; la navegación llega con el ticket #32. Los glifos
// van dibujados con vistas: Expo SDK 58 ya no trae un set de iconos y no se
// agrega ninguna dependencia nueva ni nada se pide por URL.

type PropsGlifo = { activo?: boolean };

function GlifoInicio({ activo = false }: PropsGlifo) {
  const color = activo ? paleta.texto : paleta.textoSuave;

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
  const color = activo ? paleta.texto : paleta.textoSuave;

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
  const color = activo ? paleta.texto : paleta.textoSuave;

  return (
    <View style={estilos.glifo}>
      {activo ? (
        <View style={[estilos.burbuja, { backgroundColor: color }]} />
      ) : (
        <View style={[estilos.burbuja, { borderColor: color, borderWidth: 2 }]} />
      )}
      {activo ? (
        <View style={[estilos.colaLlena, { borderLeftColor: color }]} />
      ) : (
        <View style={[estilos.colaContorno, { borderColor: color }]} />
      )}
    </View>
  );
}

function GlifoCuenta({ activo = false }: PropsGlifo) {
  const color = activo ? paleta.texto : paleta.textoSuave;

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
  children,
}: {
  etiqueta: string;
  activa?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      style={estilos.posicion}
      accessibilityRole="tab"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: activa }}
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
    </Pressable>
  );
}

export function Navbar() {
  const margenes = useSafeAreaInsets();

  return (
    <View style={[estilos.barra, { paddingBottom: 6 + margenes.bottom }]}>
      <Posicion etiqueta="Inicio" activa>
        <GlifoInicio activo />
      </Posicion>
      <Posicion etiqueta="Transacciones">
        <GlifoTransacciones />
      </Posicion>
      <View style={[estilos.posicion, estilos.posicionCentral]}>
        <Pressable
          style={estilos.botonCentral}
          accessibilityRole="button"
          accessibilityLabel="Nueva transacción"
        >
          <Text style={estilos.mas}>+</Text>
        </Pressable>
      </View>
      <Posicion etiqueta="Agente">
        <GlifoAgente />
      </Posicion>
      <Posicion etiqueta="Cuenta">
        <GlifoCuenta />
      </Posicion>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: paleta.superficie,
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
  burbuja: {
    width: 18,
    height: 13,
    borderRadius: 6,
  },
  colaLlena: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 7,
    borderTopColor: 'transparent',
    alignSelf: 'flex-start',
    marginLeft: 3,
    marginTop: -3,
  },
  colaContorno: {
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    alignSelf: 'flex-start',
    marginLeft: 2,
    marginTop: -6,
    transform: [{ rotate: '45deg' }],
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
    color: paleta.texto,
    fontWeight: 'bold',
  },
  etiquetaInactiva: {
    color: paleta.textoSuave,
  },
  botonCentral: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: paleta.verdeLogin,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: paleta.sombra,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  mas: {
    color: paleta.texto,
    fontSize: 32,
    lineHeight: 36,
    marginTop: -2,
  },
});
