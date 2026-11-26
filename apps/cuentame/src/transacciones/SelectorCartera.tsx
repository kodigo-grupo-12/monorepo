import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import type { Cartera } from '../datos/carteras';
import type { Transaccion } from '../datos/transacciones';
import { IconoBilletera } from '../carteras/IconoBilletera';

type Props = {
  visible: boolean;
  carteras: Cartera[];
  transacciones: Transaccion[];
  seleccionadaId?: string;
  alCerrar: () => void;
  alSeleccionar: (carteraId?: string) => void;
};

// Selector de cartera (T009), copiado de
// Assets/transacciones/modelo-pantalla-seleccionar-cartera.png
// (kodigo-grupo-12/.github): modal a pantalla completa sin navbar, tercera
// excepción junto con el modal del + y el calendario. «Total» va
// seleccionado por defecto con su punto verde y tarjeta resaltada, y debajo
// está «Incluido en el total» con cada cartera y su saldo. Elegir una
// cartera filtra el saldo y la lista de Transacciones; la X cierra sin
// elegir. Sin EDITAR, sin menú por cartera y sin FAB: crear cartera sigue
// viviendo en Cuenta y en la alta rápida del modal (lenguaje único
// «cartera», nunca «monedero»).
export function SelectorCartera({
  visible,
  carteras,
  transacciones,
  seleccionadaId,
  alCerrar,
  alSeleccionar,
}: Props) {
  const margenes = useSafeAreaInsets();

  // ADR-0011: el saldo nunca vive en el documento; se agrega en vivo desde
  // el snapshot. El Total suma todas las transacciones y cada cartera las
  // suyas, igual que en Mis carteras.
  const saldoDe = (cartera: Cartera): number =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.cartera_id === cartera.id
          ? total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto)
          : total,
      0,
    );
  const saldoTotal = transacciones.reduce(
    (total, transaccion) => total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto),
    0,
  );
  const saldoTexto = (saldo: number): string => `${saldo < 0 ? '-' : ''}$ ${Math.abs(saldo).toFixed(2)}`;

  return (
    <Modal visible={visible} statusBarTranslucent>
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top + 8 }]}>
        <View style={estilos.cabecera}>
          <Pressable
            style={estilos.cerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={alCerrar}
            hitSlop={8}
          >
            <View style={estilos.aspaUno} />
            <View style={estilos.aspaDos} />
          </Pressable>
          <Text style={[estilos.titulo, { color: paleta.texto }]} numberOfLines={1}>
            Seleccionar cartera
          </Text>
        </View>

        <Pressable
          style={[estilos.tarjeta, seleccionadaId === undefined && { backgroundColor: paleta.dialogo }]}
          accessibilityRole="button"
          accessibilityLabel="Total, todas las carteras"
          accessibilityState={{ selected: seleccionadaId === undefined }}
          onPress={() => alSeleccionar(undefined)}
        >
          <View style={estilos.ranuraPunto}>
            {seleccionadaId === undefined ? (
              <View style={[estilos.punto, { backgroundColor: paleta.verdeAccion }]} />
            ) : null}
          </View>
          <View style={[estilos.globo, { backgroundColor: paleta.globoTotal }]}>
            <GlifoGlobo />
          </View>
          <View style={estilos.textos}>
            <Text style={[estilos.nombre, { color: paleta.texto }]}>Total</Text>
            <Text style={[estilos.saldo, { color: paleta.textoSuave }]}>{saldoTexto(saldoTotal)}</Text>
          </View>
        </Pressable>

        <Text style={[estilos.incluido, { color: paleta.textoSuave }]}>Incluido en el total</Text>
        {carteras.map((cartera, indice) => (
          <View key={cartera.id ?? cartera.nombre}>
            <Pressable
              style={estilos.fila}
              accessibilityRole="button"
              accessibilityLabel={`Cartera ${cartera.nombre}`}
              accessibilityState={{ selected: seleccionadaId === cartera.id }}
              onPress={() => alSeleccionar(cartera.id)}
            >
              <View style={estilos.ranuraPunto}>
                {seleccionadaId === cartera.id ? (
                  <View style={[estilos.punto, { backgroundColor: paleta.verdeAccion }]} />
                ) : null}
              </View>
              <View style={estilos.escalaIcono}>
                <IconoBilletera fondo={paleta.naranjaCartera} />
              </View>
              <View style={estilos.textos}>
                <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
                  {cartera.nombre}
                </Text>
                <Text style={[estilos.saldo, { color: paleta.textoSuave }]}>{saldoTexto(saldoDe(cartera))}</Text>
              </View>
            </Pressable>
            {indice < carteras.length - 1 ? (
              <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
            ) : null}
          </View>
        ))}
      </View>
    </Modal>
  );
}

// Globo terráqueo para la fila Total, dibujado con vistas como el resto de
// los glifos (T004): Expo SDK 58 ya no trae un set de iconos.
function GlifoGlobo() {
  return (
    <View style={estilos.globoGlifo}>
      <View style={estilos.globoEsfera} />
      <View style={estilos.globoMeridiano} />
      <View style={estilos.globoEcuador} />
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
    height: 64,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  cerrar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspaUno: {
    position: 'absolute',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  aspaDos: {
    position: 'absolute',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '-45deg' }],
  },
  titulo: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingRight: 16,
  },
  ranuraPunto: {
    width: 30,
    alignItems: 'center',
  },
  punto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  globo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globoGlifo: {
    width: 20,
    height: 20,
  },
  globoEsfera: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  globoMeridiano: {
    position: 'absolute',
    left: 5.5,
    top: 1,
    width: 9,
    height: 18,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  globoEcuador: {
    position: 'absolute',
    left: 2.5,
    top: 9.25,
    width: 15,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  textos: {
    flex: 1,
    marginLeft: 14,
  },
  nombre: {
    fontSize: 19,
    fontWeight: '700',
  },
  saldo: {
    fontSize: 15,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  incluido: {
    fontSize: 15,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingRight: 16,
  },
  escalaIcono: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },
});
