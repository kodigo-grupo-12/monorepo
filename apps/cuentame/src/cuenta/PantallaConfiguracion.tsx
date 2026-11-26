import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAjustes } from '../ajustes/ProveedorAjustes';
import { borrarContenidoDeDuenio } from '../datos/arranque';
import { db } from '../datos/firebase';
import { useSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

// Pantalla Configuraciones (T013): ajustes locales de la app, sin
// Firebase. Animaciones apagables por accesibilidad y avisos in-app
// apagables por gusto; la persistencia va al dispositivo.
//
// El reset «Borrar todo y comenzar de cero» (spec #143, issue #147) borra
// las carteras y las transacciones del uid con doble confirmación; las
// categorías no se tocan. Al vaciarse la cuenta, ProveedorSesion vuelve a
// mostrar la pantalla de bienvenida para reelegir entre ejemplo y cero.
export function PantallaConfiguracion() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { ajustes, cambiar } = useAjustes();
  const { usuario } = useSesion();
  const [paso, setPaso] = useState<'reposo' | 'primera' | 'segunda' | 'borrando'>('reposo');
  const [aviso, setAviso] = useState('');

  const borrar = async () => {
    if (!usuario) {
      return;
    }
    setPaso('borrando');
    try {
      await borrarContenidoDeDuenio(db, usuario.uid);
      setPaso('reposo');
    } catch (error) {
      console.error('No se pudo borrar el contenido de la cuenta:', error);
      setAviso('No se pudo borrar. Intentá de nuevo.');
      setPaso('reposo');
    }
  };

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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Configuraciones</Text>
        <View style={estilos.ranura} />
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <FilaAjuste
            titulo="Animaciones"
            detalle="Transiciones y contadores animados. Apagarlas hace la app más sobria."
            valor={ajustes.animaciones}
            alCambiar={(valor) => cambiar({ animaciones: valor })}
          />
          <View style={[estilos.linea, { backgroundColor: paleta.dialogo }]} />
          <FilaAjuste
            titulo="Avisos in-app"
            detalle="Toasts de confirmación y el banner de sincronización."
            valor={ajustes.avisos}
            alCambiar={(valor) => cambiar({ avisos: valor })}
          />
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta, marginTop: 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar todo y comenzar de cero"
            onPress={() => {
              setAviso('');
              setPaso('primera');
            }}
            style={estilos.fila}
          >
            <View style={estilos.textos}>
              <Text style={[estilos.tituloFila, { color: paleta.rojoMonto }]}>
                Borrar todo y comenzar de cero
              </Text>
              <Text style={[estilos.detalle, { color: paleta.textoSuave }]}>
                Elimina tus carteras y transacciones. Las categorías no se tocan.
              </Text>
            </View>
          </Pressable>
          {aviso ? (
            <Text accessibilityLiveRegion="polite" style={[estilos.aviso, { color: paleta.rojoMonto }]}>
              {aviso}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={paso !== 'reposo'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (paso !== 'borrando') {
            setPaso('reposo');
          }
        }}
      >
        <View style={estilos.fondoDialogo}>
          <View style={[estilos.tarjetaDialogo, { backgroundColor: paleta.dialogo }]}>
            {paso === 'primera' ? (
              <>
                <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>
                  Borrar todo y comenzar de cero
                </Text>
                <Text style={[estilos.cuerpoDialogo, { color: paleta.textoSuave }]}>
                  Se eliminan todas tus carteras y todas tus transacciones. Las categorías no se
                  tocan. Después vas a elegir de nuevo cómo empezar.
                </Text>
                <View style={estilos.filaDialogo}>
                  <BotonDialogo titulo="Cancelar" tono="calma" alTocar={() => setPaso('reposo')} />
                  <BotonDialogo titulo="Continuar" tono="peligro" alTocar={() => setPaso('segunda')} />
                </View>
              </>
            ) : (
              <>
                <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>
                  Última confirmación
                </Text>
                <Text style={[estilos.cuerpoDialogo, { color: paleta.textoSuave }]}>
                  ¿Seguro? No hay vuelta atrás: lo que se borra, se pierde.
                </Text>
                <View style={estilos.filaDialogo}>
                  <BotonDialogo
                    titulo="Cancelar"
                    tono="calma"
                    deshabilitado={paso === 'borrando'}
                    alTocar={() => setPaso('reposo')}
                  />
                  <BotonDialogo
                    titulo={paso === 'borrando' ? 'Borrando…' : 'Borrar todo'}
                    tono="peligro"
                    deshabilitado={paso === 'borrando'}
                    alTocar={() => {
                      void borrar();
                    }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilaAjuste({
  titulo,
  detalle,
  valor,
  alCambiar,
}: {
  titulo: string;
  detalle: string;
  valor: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <View style={estilos.fila}>
      <View style={estilos.textos}>
        <Text style={[estilos.tituloFila, { color: paleta.texto }]}>{titulo}</Text>
        <Text style={[estilos.detalle, { color: paleta.textoSuave }]}>{detalle}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        trackColor={{ true: paleta.verdeAccion, false: paleta.dialogoBoton }}
        thumbColor="#FFFFFF"
        accessibilityLabel={titulo}
      />
    </View>
  );
}

function BotonDialogo({
  titulo,
  tono,
  alTocar,
  deshabilitado = false,
}: {
  titulo: string;
  tono: 'calma' | 'peligro';
  alTocar: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={alTocar}
      style={[
        estilos.botonDialogo,
        { backgroundColor: tono === 'peligro' ? paleta.rojo : paleta.dialogoBoton },
        deshabilitado ? estilos.apagado : null,
      ]}
    >
      <Text style={estilos.botonDialogoTexto}>{titulo}</Text>
    </Pressable>
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
  contenido: {
    padding: 20,
    paddingBottom: 24,
  },
  tarjeta: {
    borderRadius: 16,
    padding: 16,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  textos: {
    flex: 1,
  },
  tituloFila: {
    fontSize: 16,
    fontWeight: '600',
  },
  detalle: {
    fontSize: 13,
    marginTop: 3,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  aviso: {
    fontSize: 13,
    marginTop: 8,
  },
  fondoDialogo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 24,
  },
  tarjetaDialogo: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
  },
  tituloDialogo: {
    fontSize: 17,
    fontWeight: '700',
  },
  cuerpoDialogo: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  filaDialogo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  botonDialogo: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDialogoTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  apagado: {
    opacity: 0.6,
  },
});
