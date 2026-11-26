import { StyleSheet, Text, View } from 'react-native';

import { useAjustes } from '../ajustes/ProveedorAjustes';
import { paleta } from '../tema/colores';

// Banner de sincronización (T013): una línea discreta que dice si los
// datos están al día con Firebase o si se perdió la conexión y se está
// reintentando. El ajuste de avisos lo apaga.
export function BannerSincronizacion({ visible, sincronizado }: { visible: boolean; sincronizado: boolean }) {
  const { ajustes } = useAjustes();

  if (!ajustes.avisos || !visible) {
    return null;
  }

  return (
    <View style={estilos.banner}>
      <View style={[estilos.punto, { backgroundColor: sincronizado ? paleta.verdeAccion : paleta.rojo }]} />
      <Text style={[estilos.texto, { color: paleta.textoSuave }]}>
        {sincronizado ? 'Sincronizado ✓' : 'Sin conexión, reintentando'}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  texto: {
    fontSize: 12,
  },
});
