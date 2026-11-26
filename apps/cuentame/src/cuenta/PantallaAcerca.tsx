import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';

// Pantalla Acerca (T013): datos de la app, créditos del Grupo 12 y enlace
// al repositorio. La versión se lee de la configuración de Expo, nunca
// hardcodeada.
const REPOSITORIO = 'https://github.com/kodigo-grupo-12/monorepo';

export function PantallaAcerca() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const version = Constants.expoConfig?.version;

  return (
    <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <View style={estilos.cabecera}>
        <View style={estilos.ranura}>
          <Pressable
            style={estilos.atras}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => enrutador.back()}
            hitSlop={8}
          >
            <View style={estilos.atrasPunta} />
          </Pressable>
        </View>
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Acerca</Text>
        <View style={estilos.ranura} />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <Text style={[estilos.nombreApp, { color: paleta.texto }]}>Cuéntame</Text>
          <Text style={[estilos.descripcion, { color: paleta.textoSuave }]}>
            Una forma simple de cuidar tus finanzas
          </Text>
          <View style={[estilos.linea, { backgroundColor: paleta.dialogo }]} />
          <FilaDato etiqueta="Versión" valor={version ?? '—'} />
          <FilaDato etiqueta="Equipo" valor="Grupo 12 · Kodigo" />
          <FilaDato etiqueta="Programa" valor="AI For Devs Jr. 5" />
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <Pressable
            style={estilos.filaEnlace}
            accessibilityRole="button"
            accessibilityLabel="Abrir el repositorio del proyecto"
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open(REPOSITORIO, '_blank');
              } else {
                void Linking.openURL(REPOSITORIO);
              }
            }}
          >
            <Text style={[estilos.filaEnlaceTexto, { color: paleta.verdeAccion, flex: 1 }]}>
              Repositorio del proyecto
            </Text>
            <View style={estilos.chevron} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.filaDato}>
      <Text style={[estilos.etiqueta, { color: paleta.textoSuave }]}>{etiqueta}</Text>
      <Text style={[estilos.valor, { color: paleta.texto }]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 8,
  },
  ranura: {
    width: 40,
    alignItems: 'center',
  },
  atras: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atrasPunta: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  contenido: {
    padding: 20,
    paddingBottom: 24,
  },
  tarjeta: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  nombreApp: {
    fontSize: 24,
    fontWeight: '700',
  },
  descripcion: {
    fontSize: 14,
    marginTop: 4,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 4,
  },
  filaDato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  etiqueta: {
    fontSize: 15,
  },
  valor: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
    marginLeft: 12,
  },
  filaEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  filaEnlaceTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
});
