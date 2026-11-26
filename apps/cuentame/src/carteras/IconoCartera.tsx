import { StyleSheet, View } from 'react-native';

import { paleta } from '../tema/colores';

// Glifo de cartera dibujado con vistas, como quedo en la T004: Expo SDK 58
// ya no trae un set de iconos y no se agrega ninguna dependencia nueva.
export function IconoCartera({ fondo = paleta.teal }: { fondo?: string }) {
  return (
    <View style={[estilos.circulo, { backgroundColor: fondo }]}>
      <View style={estilos.cuerpo} />
      <View style={[estilos.ranura, { backgroundColor: fondo }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    width: 12,
    height: 9,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  ranura: {
    position: 'absolute',
    right: 4,
    top: 7.5,
    width: 3,
    height: 4,
    borderRadius: 1,
  },
});
