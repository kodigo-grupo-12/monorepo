import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCarteras } from '../datos/useCarteras';
import type { Cartera } from '../datos/carteras';
import { useTransacciones } from '../datos/useTransacciones';
import { paleta } from '../tema/colores';
import { IconoBilletera } from './IconoBilletera';

// Anatomía copiada de Assets/carteras/modelo-pantalla-carteras.png
// (kodigo-grupo-12/.github): header con flecha de atrás y título, encabezado
// «Incluido en el total» en gris, filas con círculo de billetera, nombre y
// saldo debajo en gris con dos decimales, y botón flotante verde abajo a la
// derecha. Sin búsqueda en el header y sin menú por cartera (spec #54).
// Pantalla empujada del tab Cuenta (ADR-0011): el navbar queda visible.
export function PantallaCarteras() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { carteras, cargando } = useCarteras();
  const { transacciones } = useTransacciones();

  // ADR-0011: el saldo nunca vive en el documento; se agrega en vivo desde
  // el snapshot de transacciones (ingresos menos gastos de esa cartera).
  const saldoDe = (cartera: Cartera): number =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.cartera_id === cartera.id
          ? total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto)
          : total,
      0,
    );

  function saldoTexto(saldo: number): string {
    const cifra = Math.abs(saldo).toFixed(2);
    return saldo < 0 ? `-$${cifra}` : `$${cifra}`;
  }

  return (
    <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <View style={estilos.cabecera}>
        <View style={estilos.ranura}>
          <Pressable
            style={estilos.atras}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={() => enrutador.back()}
            hitSlop={8}
          >
            <View style={estilos.atrasPunta} />
          </Pressable>
        </View>
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Mis carteras</Text>
        <View style={estilos.ranura} />
      </View>

      <ScrollView contentContainerStyle={estilos.lista}>
        <Text style={[estilos.incluido, { color: paleta.textoSuave }]}>Incluido en el total</Text>
        {cargando ? null : carteras.map((cartera, indice) => (
          <View key={cartera.id ?? cartera.nombre}>
            <View style={estilos.fila}>
              <IconoBilletera />
              <View style={estilos.textos}>
                <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
                  {cartera.nombre}
                </Text>
                <Text style={[estilos.saldo, { color: paleta.textoSuave }]}>{saldoTexto(saldoDe(cartera))}</Text>
              </View>
            </View>
            {indice < carteras.length - 1 ? (
              <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
            ) : null}
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[estilos.fab, { bottom: 24 + margenes.bottom }]}
        accessibilityRole="button"
        accessibilityLabel="Nueva cartera"
        onPress={() => enrutador.push('/nueva-cartera')}
      >
        <Text style={estilos.fabMas}>+</Text>
      </Pressable>
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
    height: 56,
    paddingHorizontal: 8,
  },
  ranura: {
    width: 40,
    alignItems: 'center',
  },
  atras: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atrasPunta: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  lista: {
    paddingBottom: 96,
  },
  incluido: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  textos: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
  },
  saldo: {
    fontSize: 13,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: paleta.verdeAccion,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: paleta.sombra,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabMas: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 34,
    marginTop: -2,
  },
});
