import { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { paleta } from '../tema/colores';

export function PantallaInicio() {
  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => suscripcion.remove();
  }, []);

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
