import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OpcionArranque } from '../datos/historialEjemplo';
import { paleta } from '../tema/colores';

// Pantalla de bienvenida (spec #143, issue #145): lo primero que ve la
// persona después del login cuando su cuenta está totalmente vacía. Modal
// bloqueante a pantalla completa: no hay forma de cerrarla sin elegir,
// porque sin carteras la app no tiene dónde poner movimientos. Tono cálido
// y copys en español salvadoreño, con la paleta del app.
export function PantallaBienvenida({
  sembrando,
  alElegir,
}: {
  sembrando: boolean;
  alElegir: (opcion: OpcionArranque) => void;
}) {
  const margenes = useSafeAreaInsets();

  return (
    <Modal visible animationType="fade" onRequestClose={() => {}}>
      <View
        style={[
          estilos.raiz,
          {
            backgroundColor: paleta.fondo,
            paddingTop: Math.max(margenes.top, 24),
            paddingBottom: Math.max(margenes.bottom, 24),
          },
        ]}
      >
        <View style={estilos.contenido}>
          <Text style={[estilos.marca, { color: paleta.verdeLogin }]}>Cuéntame</Text>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>¡Te damos la bienvenida!</Text>
          <Text style={[estilos.subtitulo, { color: paleta.textoSuave }]}>
            ¿Cómo querés empezar? Podés cargar un historial de ejemplo con 12 meses de gastos e
            ingresos salvadoreños, o arrancar de cero con tu cartera Efectivo lista.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cargar historial de ejemplo"
            accessibilityState={{ disabled: sembrando }}
            disabled={sembrando}
            onPress={() => alElegir('ejemplo')}
            style={[estilos.boton, { backgroundColor: paleta.verdeLogin }, sembrando ? estilos.botonApagado : null]}
          >
            <Text style={estilos.botonTexto}>Cargar historial de ejemplo</Text>
            <Text style={estilos.botonDetalle}>
              12 meses de movimientos de ejemplo, en Efectivo, Banco y Tarjeta
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Empezar de cero"
            accessibilityState={{ disabled: sembrando }}
            disabled={sembrando}
            onPress={() => alElegir('cero')}
            style={[estilos.boton, { backgroundColor: paleta.dialogoBoton }, sembrando ? estilos.botonApagado : null]}
          >
            <Text style={estilos.botonTexto}>Empezar de cero</Text>
            <Text style={estilos.botonDetalle}>Solo tu cartera Efectivo, vacía y lista</Text>
          </Pressable>

          {sembrando ? (
            <View style={estilos.cargando}>
              <ActivityIndicator color={paleta.verdeLogin} />
              <Text style={[estilos.cargandoTexto, { color: paleta.textoSuave }]}>
                Preparando tus datos…
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contenido: {
    flex: 1,
    justifyContent: 'center',
  },
  marca: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitulo: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
  boton: {
    borderRadius: 12,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  botonApagado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  botonDetalle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  cargandoTexto: {
    fontSize: 14,
  },
});
