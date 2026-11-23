import { useEffect } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { paleta } from '../tema/colores';

export function PantallaInicio() {
  const enrutador = useRouter();

  useEffect(() => {
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => true);

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return () => suscripcion.remove();
    }

    const quedarse = () => {
      if (window.location.pathname.includes('login')) {
        enrutador.replace('/');
      }
    };

    window.addEventListener('popstate', quedarse);

    return () => {
      suscripcion.remove();
      window.removeEventListener('popstate', quedarse);
    };
  }, [enrutador]);

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
