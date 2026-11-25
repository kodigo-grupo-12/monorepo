import { useEffect } from 'react';
import { BackHandler, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useTransacciones } from '../datos/useTransacciones';
import type { Transaccion } from '../datos/transacciones';

export function PantallaInicio() {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando } = useTransacciones();

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
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <Text style={[estilos.titulo, { color: paleta.texto }]}>Cuéntame</Text>
      {cargando ? null : (
        <FlatList
          data={transacciones}
          keyExtractor={(transaccion) => transaccion.id ?? `${transaccion.fecha}-${transaccion.monto}`}
          renderItem={({ item }) => <FilaTransaccion transaccion={item} />}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>
              Aún no hay transacciones
            </Text>
          }
        />
      )}
    </View>
  );
}

// Fila de la lista en tiempo real: fecha, nota, monto en USD y la categoría
// solo cuando la transacción la lleva.
function FilaTransaccion({ transaccion }: { transaccion: Transaccion }) {
  return (
    <View style={estilos.fila}>
      <Text style={[estilos.fecha, { color: paleta.textoSuave }]}>{transaccion.fecha}</Text>
      <View style={estilos.detalles}>
        <Text style={[estilos.nota, { color: paleta.texto }]} numberOfLines={1}>
          {transaccion.nota ?? (transaccion.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}
        </Text>
        {transaccion.categoria ? (
          <Text style={[estilos.categoria, { color: paleta.textoSuave }]} numberOfLines={1}>
            {transaccion.categoria}
          </Text>
        ) : null}
      </View>
      <Text style={[estilos.monto, { color: paleta.texto }]}>${transaccion.monto.toFixed(2)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  titulo: {
    fontSize: 32,
    textAlign: 'center',
    marginVertical: 16,
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  vacio: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: paleta.superficie,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  fecha: {
    fontSize: 13,
  },
  detalles: {
    flex: 1,
  },
  nota: {
    fontSize: 15,
  },
  categoria: {
    fontSize: 13,
    marginTop: 2,
  },
  monto: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
