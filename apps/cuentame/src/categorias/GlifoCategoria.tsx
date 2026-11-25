import { StyleSheet, View } from 'react-native';

import { aspectoDe } from './mapaCategorias';

// Glifos dibujados con vistas, como quedó en la T004: Expo SDK 58 ya no trae
// un set de iconos, no se agrega ninguna dependencia nueva ni nada se pide
// por URL. Cada glifo vive dentro del círculo de color de su categoría.
export function GlifoCategoria({ nombre }: { nombre: string }) {
  const aspecto = aspectoDe(nombre);
  const tinta = '#FFFFFF';

  return (
    <View style={[estilos.circulo, { backgroundColor: aspecto.color }]}>
      {aspecto.glifo === 'taza' && (
        <>
          <View style={[estilos.tazaCuerpo, { backgroundColor: tinta }]} />
          <View style={[estilos.tazaAsa, { borderColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'bus' && (
        <>
          <View style={[estilos.busCuerpo, { backgroundColor: tinta }]} />
          <View style={[estilos.busVentana, { backgroundColor: aspecto.color }]} />
        </>
      )}
      {aspecto.glifo === 'bolsa' && (
        <>
          <View style={[estilos.bolsaCuerpo, { backgroundColor: tinta }]} />
          <View style={[estilos.bolsaAsa, { borderColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'libro' && (
        <>
          <View style={[estilos.libroIzquierda, { backgroundColor: tinta }]} />
          <View style={[estilos.libroDerecha, { backgroundColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'pelicula' && (
        <View style={[estilos.peliculaPunta, { borderLeftColor: tinta }]} />
      )}
      {aspecto.glifo === 'recibo' && (
        <>
          <View style={[estilos.reciboCuerpo, { backgroundColor: tinta }]} />
          <View style={[estilos.reciboLinea, { backgroundColor: aspecto.color, top: 8 }]} />
          <View style={[estilos.reciboLinea, { backgroundColor: aspecto.color, top: 10 }]} />
          <View style={[estilos.reciboLinea, { backgroundColor: aspecto.color, top: 12 }]} />
        </>
      )}
      {aspecto.glifo === 'casa' && (
        <>
          <View style={[estilos.casaTecho, { borderBottomColor: tinta }]} />
          <View style={[estilos.casaCuerpo, { backgroundColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'cruz' && (
        <>
          <View style={[estilos.cruzVertical, { backgroundColor: tinta }]} />
          <View style={[estilos.cruzHorizontal, { backgroundColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'barras' && (
        <>
          <View style={[estilos.barraBaja, { backgroundColor: tinta }]} />
          <View style={[estilos.barraMedia, { backgroundColor: tinta }]} />
          <View style={[estilos.barraAlta, { backgroundColor: tinta }]} />
        </>
      )}
      {aspecto.glifo === 'otros' && (
        <>
          <View style={[estilos.otrosPunto, { backgroundColor: tinta, left: 5 }]} />
          <View style={[estilos.otrosPunto, { backgroundColor: tinta, left: 9.5 }]} />
          <View style={[estilos.otrosPunto, { backgroundColor: tinta, left: 14 }]} />
        </>
      )}
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
  tazaCuerpo: {
    position: 'absolute',
    left: 5,
    top: 6,
    width: 9,
    height: 8,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tazaAsa: {
    position: 'absolute',
    right: 4,
    top: 7,
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 2,
  },
  busCuerpo: {
    position: 'absolute',
    left: 5,
    top: 6,
    width: 12,
    height: 9,
    borderRadius: 2,
  },
  busVentana: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: 2,
    height: 2,
  },
  bolsaCuerpo: {
    position: 'absolute',
    left: 6,
    top: 8,
    width: 10,
    height: 8,
    borderRadius: 1,
  },
  bolsaAsa: {
    position: 'absolute',
    left: 8,
    top: 5,
    width: 6,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  libroIzquierda: {
    position: 'absolute',
    left: 5,
    top: 7,
    width: 5,
    height: 8,
    borderTopLeftRadius: 1,
    borderBottomLeftRadius: 1,
  },
  libroDerecha: {
    position: 'absolute',
    left: 12,
    top: 7,
    width: 5,
    height: 8,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  peliculaPunta: {
    position: 'absolute',
    left: 8,
    top: 6,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  reciboCuerpo: {
    position: 'absolute',
    left: 6,
    top: 5,
    width: 10,
    height: 12,
    borderRadius: 1,
  },
  reciboLinea: {
    position: 'absolute',
    left: 8,
    width: 6,
    height: 1.5,
  },
  casaTecho: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  casaCuerpo: {
    position: 'absolute',
    left: 6,
    top: 10,
    width: 10,
    height: 7,
    borderRadius: 1,
  },
  cruzVertical: {
    position: 'absolute',
    left: 9.5,
    top: 5,
    width: 3,
    height: 12,
    borderRadius: 1,
  },
  cruzHorizontal: {
    position: 'absolute',
    left: 5,
    top: 9.5,
    width: 12,
    height: 3,
    borderRadius: 1,
  },
  barraBaja: {
    position: 'absolute',
    left: 5,
    bottom: 5,
    width: 3,
    height: 5,
    borderRadius: 1,
  },
  barraMedia: {
    position: 'absolute',
    left: 9.5,
    bottom: 5,
    width: 3,
    height: 8,
    borderRadius: 1,
  },
  barraAlta: {
    position: 'absolute',
    left: 14,
    bottom: 5,
    width: 3,
    height: 11,
    borderRadius: 1,
  },
  otrosPunto: {
    position: 'absolute',
    top: 9.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
