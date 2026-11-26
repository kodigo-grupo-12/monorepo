import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAjustes } from '../ajustes/ProveedorAjustes';
import { paleta } from '../tema/colores';

// Pantalla Configuraciones (T013): ajustes locales de la app, sin
// Firebase. Animaciones apagables por accesibilidad y avisos in-app
// apagables por gusto; la persistencia va al dispositivo.
export function PantallaConfiguracion() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { ajustes, cambiar } = useAjustes();

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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Configuraciones</Text>
        <View style={estilos.ranura} />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <FilaAjuste
            titulo="Animaciones"
            detalle="Transiciones y contadores animados. Apagarlas hace la app más sobria."
            valor={ajustes.animaciones}
            alCambiar={(valor) => cambiar({ animaciones: valor })}
          />
          <View style={[estilos.linea, { backgroundColor: paleta.dialogo }]} />
          <FilaAjuste
            titulo="Avisos in-app"
            detalle="Toasts de confirmación y el banner de sincronización."
            valor={ajustes.avisos}
            alCambiar={(valor) => cambiar({ avisos: valor })}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function FilaAjuste({
  titulo,
  detalle,
  valor,
  alCambiar,
}: {
  titulo: string;
  detalle: string;
  valor: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.textos}>
        <Text style={[estilos.tituloFila, { color: paleta.texto }]}>{titulo}</Text>
        <Text style={[estilos.detalle, { color: paleta.textoSuave }]}>{detalle}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        trackColor={{ true: paleta.verdeAccion, false: paleta.dialogoBoton }}
        thumbColor="#FFFFFF"
        accessibilityLabel={titulo}
      />
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
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  textos: {
    flex: 1,
  },
  tituloFila: {
    fontSize: 16,
    fontWeight: '600',
  },
  detalle: {
    fontSize: 13,
    marginTop: 3,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
});
