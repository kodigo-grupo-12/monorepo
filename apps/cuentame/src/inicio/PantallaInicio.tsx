import { useEffect, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useTransacciones } from '../datos/useTransacciones';
import { useCategorias } from '../datos/useCategorias';
import { eliminarTransaccion } from '../datos/transacciones';
import type { Transaccion } from '../datos/transacciones';

export function PantallaInicio() {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando } = useTransacciones();
  const { categorias } = useCategorias();
  const nombresDeCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));
  // La papelera marca la transacción; el diálogo decide. Cancelar no toca
  // nada y no hay deshacer (ADR-0012).
  const [pendiente, setPendiente] = useState<Transaccion>();
  const [eliminando, setEliminando] = useState(false);

  async function confirmarEliminacion() {
    if (!pendiente?.id || eliminando) {
      return;
    }
    setEliminando(true);
    try {
      await eliminarTransaccion(pendiente.id);
      setPendiente(undefined);
    } finally {
      setEliminando(false);
    }
  }

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
          renderItem={({ item }) => (
            <FilaTransaccion
              transaccion={item}
              nombreCategoria={item.categoria_id ? nombresDeCategoria.get(item.categoria_id) : undefined}
              alEliminar={() => setPendiente(item)}
            />
          )}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>
              Aún no hay transacciones
            </Text>
          }
        />
      )}

      <Modal
        visible={!!pendiente}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPendiente(undefined)}
      >
        <Pressable
          style={estilos.fondoDialogo}
          accessibilityLabel="Cerrar"
          onPress={() => setPendiente(undefined)}
        >
          <Pressable style={estilos.tarjetaDialogo}>
            <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>¿Eliminar transacción?</Text>
            {pendiente ? (
              <Text style={[estilos.detalleDialogo, { color: paleta.textoSuave }]} numberOfLines={1}>
                {pendiente.nota ?? (pendiente.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')} · ${pendiente.monto.toFixed(2)}
              </Text>
            ) : null}
            <View style={estilos.botonesDialogo}>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.rojo }]}
                accessibilityRole="button"
                accessibilityLabel="Eliminar"
                accessibilityState={{ disabled: eliminando }}
                disabled={eliminando}
                onPress={confirmarEliminacion}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Eliminar</Text>
              </Pressable>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                accessibilityState={{ disabled: eliminando }}
                disabled={eliminando}
                onPress={() => setPendiente(undefined)}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Fila de la lista en tiempo real: fecha, nota, monto en USD y la categoría
// solo cuando la transacción la lleva. La papelera verde (ADR-0012) vive al
// borde derecho y nunca borra directo: abre el diálogo de confirmación.
function FilaTransaccion({
  transaccion,
  nombreCategoria,
  alEliminar,
}: {
  transaccion: Transaccion;
  nombreCategoria?: string;
  alEliminar: () => void;
}) {
  return (
    <View style={estilos.fila}>
      <Text style={[estilos.fecha, { color: paleta.textoSuave }]}>{transaccion.fecha}</Text>
      <View style={estilos.detalles}>
        <Text style={[estilos.nota, { color: paleta.texto }]} numberOfLines={1}>
          {transaccion.nota ?? (transaccion.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}
        </Text>
        {(nombreCategoria ?? transaccion.categoria) ? (
          <Text style={[estilos.categoria, { color: paleta.textoSuave }]} numberOfLines={1}>
            {nombreCategoria ?? transaccion.categoria}
          </Text>
        ) : null}
      </View>
      <Text style={[estilos.monto, { color: paleta.texto }]}>${transaccion.monto.toFixed(2)}</Text>
      <Pressable
        style={estilos.papeleraBoton}
        accessibilityRole="button"
        accessibilityLabel="Eliminar transacción"
        onPress={alEliminar}
        hitSlop={6}
      >
        <GlifoPapelera />
      </Pressable>
    </View>
  );
}

// Papelera dibujada con vistas, como quedó en la T004: Expo SDK 58 ya no
// trae un set de iconos y no se agrega ninguna dependencia nueva.
function GlifoPapelera() {
  const verde = paleta.verdeAccion;

  return (
    <View style={estilos.papelera}>
      <View style={[estilos.papeleraAsa, { backgroundColor: verde }]} />
      <View style={[estilos.papeleraTapa, { backgroundColor: verde }]} />
      <View style={[estilos.papeleraCuerpo, { borderColor: verde }]} />
      <View style={[estilos.papeleraLinea, { backgroundColor: verde, left: 7 }]} />
      <View style={[estilos.papeleraLinea, { backgroundColor: verde, left: 11 }]} />
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
  papeleraBoton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  papelera: {
    width: 20,
    height: 22,
  },
  papeleraAsa: {
    position: 'absolute',
    top: 0,
    left: 7,
    width: 6,
    height: 2,
    borderRadius: 1,
  },
  papeleraTapa: {
    position: 'absolute',
    top: 3,
    left: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  papeleraCuerpo: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  papeleraLinea: {
    position: 'absolute',
    top: 9,
    width: 2,
    height: 7,
  },
  fondoDialogo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tarjetaDialogo: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: paleta.dialogo,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  tituloDialogo: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  detalleDialogo: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  botonesDialogo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  botonDialogo: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDialogoTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
});
