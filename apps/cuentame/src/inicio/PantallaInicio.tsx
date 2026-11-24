import { useEffect } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { paleta } from '../tema/colores';

export function PantallaInicio() {
  const enrutador = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => suscripcion.remove();
    }

    if (typeof window === 'undefined') {
      return;
    }

    const quedarse = () => {
      if (window.location.pathname.includes('login')) {
        enrutador.replace('/');
      }
    };

    window.addEventListener('popstate', quedarse);

    return () => {
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
