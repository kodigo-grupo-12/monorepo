import { StyleSheet, Text, View } from 'react-native';

export default function PantallaInicio() {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.titulo}>Cuéntame</Text>
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
