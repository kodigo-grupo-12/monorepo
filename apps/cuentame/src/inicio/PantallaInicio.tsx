import { StyleSheet, Text, View } from 'react-native';

import { paleta } from '../tema/colores';

export function PantallaInicio() {
  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo }]}>
      <Text style={[estilos.titulo, { color: paleta.texto }]}>Cuéntame</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 32,
  },
});
