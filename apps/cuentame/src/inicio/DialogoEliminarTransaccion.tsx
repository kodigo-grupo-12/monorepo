import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { paleta } from '../tema/colores';
import type { Transaccion } from '../datos/transacciones';

type Props = {
  transaccion: Transaccion | null;
  alCancelar: () => void;
  alEliminar: (transaccion: Transaccion) => void;
};

// Diálogo de confirmación «¿Eliminar transacción?» (T008): tarjeta custom
// dibujada con vistas, igual en Android y web. Sin deshacer ni toast: el
// listener en vivo es el feedback y Cancelar no toca nada.
export function DialogoEliminarTransaccion({ transaccion, alCancelar, alEliminar }: Props) {
  const etiquetaBase =
    transaccion?.nota?.trim() || (transaccion?.tipo === 'ingreso' ? 'Ingreso' : 'Gasto');
  const montoTexto = transaccion ? `$${transaccion.monto.toFixed(2)}` : '$0.00';
  const identificacion = `${etiquetaBase} · ${montoTexto}`;

  return (
    <Modal
      visible={transaccion !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={alCancelar}
    >
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>¿Eliminar transacción?</Text>
          <Text style={[estilos.identificacion, { color: paleta.textoSuave }]}>{identificacion}</Text>
          <View style={estilos.botones}>
            <Pressable
              style={[estilos.boton, { backgroundColor: paleta.rojo }]}
              accessibilityRole="button"
              accessibilityLabel="Eliminar"
              onPress={() => {
                if (transaccion) {
                  alEliminar(transaccion);
                }
              }}
            >
              <Text style={[estilos.textoBoton, { color: paleta.texto }]}>Eliminar</Text>
            </Pressable>
            <Pressable
              style={[estilos.boton, { backgroundColor: paleta.bannerSombra }]}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={alCancelar}
            >
              <Text style={[estilos.textoBoton, { color: paleta.texto }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  tarjeta: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderRadius: 16,
    backgroundColor: paleta.superficie,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  identificacion: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  botones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  boton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBoton: {
    fontSize: 16,
    fontWeight: '600',
  },
});