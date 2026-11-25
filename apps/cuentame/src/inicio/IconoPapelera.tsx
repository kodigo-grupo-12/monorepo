import { StyleSheet, View } from 'react-native';

import { paleta } from '../tema/colores';

// Papelera verde dibujada con vistas, como quedó en la T004: Expo SDK 58 ya no
// trae un set de iconos, no se agrega ninguna dependencia nueva ni nada se pide
// por URL.
export function IconoPapelera() {
  return (
    <View style={estilos.contenedor}>
      <View style={estilos.asa} />
      <View style={estilos.tapa} />
      <View style={estilos.cuerpo} />
      <View style={[estilos.linea, { left: 9.5 }]} />
      <View style={[estilos.linea, { left: 13 }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    width: 24,
    height: 24,
  },
  asa: {
    position: 'absolute',
    top: 2,
    left: 8,
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: paleta.verdeAccion,
  },
  tapa: {
    position: 'absolute',
    top: 5,
    left: 4,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: paleta.verdeAccion,
  },
  cuerpo: {
    position: 'absolute',
    top: 8,
    left: 5.5,
    width: 13,
    height: 13,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: paleta.verdeAccion,
  },
  linea: {
    position: 'absolute',
    top: 11,
    width: 1.5,
    height: 7,
    borderRadius: 0.75,
    backgroundColor: paleta.verdeAccion,
  },
});