import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from 'react-native';
import { Presionable } from '../animaciones/Presionable';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

// Anatomía copiada de Assets/cuenta/modelo-pantalla-cuenta.png
// (kodigo-grupo-12/.github): header con Cuenta y Soporte, perfil de la
// cuenta de Google (avatar con la inicial, chip CUENTA DE GOOGLE, nombre y correo),
// las listas Mis carteras/Categorías y Soporte/Configuraciones/Acerca, y
// Cerrar sesión en rojo separada del grupo. Se copia el patrón, no los
// assets ni las marcas ajenas. Los iconos van dibujados con vistas: Expo
// SDK 58 ya no trae un set de iconos, no se agrega ninguna dependencia
// nueva ni nada se pide por URL. Los datos del perfil salen de la sesión.

function IconoChevron() {
  return <View style={estilos.chevron} />;
}

function IconoSigno({ signo }: { signo: string }) {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.circulo, { borderColor: paleta.texto }]} />
      <Text style={[estilos.signo, { color: paleta.texto }]}>{signo}</Text>
    </View>
  );
}

function IconoCartera() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.cartera, { borderColor: paleta.texto }]} />
      <View style={[estilos.carteraRanura, { borderColor: paleta.texto }]} />
    </View>
  );
}

function IconoCaja() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.caja, { borderColor: paleta.texto }]} />
      <View style={[estilos.cajaTapa, { borderColor: paleta.texto }]} />
      <View style={[estilos.cajaLengüeta, { borderColor: paleta.texto }]} />
    </View>
  );
}

function IconoEngranaje() {
  const marcas = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <View style={estilos.icono}>
      <View style={[estilos.engranajeCentro, { borderColor: paleta.texto }]} />
      {marcas.map((angulo) => (
        <View
          key={angulo}
          style={[
            estilos.engranajeMarca,
            { backgroundColor: paleta.texto, transform: [{ rotate: `${angulo}deg` }, { translateY: -10 }] },
          ]}
        />
      ))}
    </View>
  );
}

function IconoApagado() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.apagadoLinea, { backgroundColor: paleta.rojo }]} />
      <View style={[estilos.apagadoPunta, { borderTopColor: paleta.rojo }]} />
      <View style={[estilos.apagadoBandeja, { backgroundColor: paleta.rojo }]} />
    </View>
  );
}

function ChipDemo() {
  // Chip limpio con borde verde (T013): la marca de cuenta de Google se queda,
  // el banderín no.
  return (
    <View style={estilos.chip}>
      <Text style={estilos.chipTexto}>CUENTA DE GOOGLE</Text>
    </View>
  );
}

function Fila({
  etiqueta,
  icono,
  alTocar,
  color = paleta.texto,
}: {
  etiqueta: string;
  icono: ReactNode;
  alTocar?: () => void;
  color?: string;
}) {
  return (
    <Presionable
      style={estilos.fila}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alTocar}
      estiloContenido={{ flex: 1 }}
    >
      <View style={estilos.filaInterna}>
        {icono}
        <Text style={[estilos.filaEtiqueta, { color }]}>{etiqueta}</Text>
        <IconoChevron />
      </View>
    </Presionable>
  );
}

export function PantallaCuenta() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { salir, usuario } = useSesion();
  const nombre = usuario?.nombre ?? '';
  const correo = usuario?.correo ?? '';
  const inicial = (nombre || correo).charAt(0).toUpperCase() || '?';
  const verDesarrollo = () => enrutador.push('/desarrollo');
  // Enmienda puntual a la T005 (ADR-0011), extendida por la T013: las
  // filas empujan su pantalla real. Categorías se reutiliza de la T007 en
  // modo lectura y Mis carteras es la misma pantalla de siempre; Acerca y
  // Configuraciones son pantallas nuevas locales. Soporte sigue con el
  // placeholder porque no tiene pantalla todavía.
  const verCategorias = () => enrutador.push('/cuenta/categorias');
  const verCarteras = () => enrutador.push('/carteras');
  const verConfiguracion = () => enrutador.push('/cuenta/configuracion');
  const verAcerca = () => enrutador.push('/cuenta/acerca');

  // Confirmación al cerrar sesión (T013): revierte la decisión 7 de la
  // T005 (ADR-0008 la declaraba sin confirmación). Al tocar la fila se
  // pregunta; salir borra la marca y la guardia del grupo con sesión manda
  // a la entrada, con el splash reiniciando el recorrido completo.
  const [cerrando, setCerrando] = useState(false);
  const cerrarSesion = async () => {
    await salir();
  };

  return (
    <ScrollView
      style={[estilos.contenedor, { backgroundColor: paleta.fondo }]}
      contentContainerStyle={{ paddingTop: margenes.top, paddingBottom: 24 }}
    >
      <View style={estilos.encabezado}>
        <Text style={[estilos.encabezadoTitulo, { color: paleta.texto }]}>Cuenta</Text>
      </View>
      <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />

      <View style={estilos.perfil}>
        <View style={estilos.perfilCentro}>
          <View style={estilos.anillo}>
            <View style={[estilos.avatar, { backgroundColor: paleta.teal }]}>
              <Text style={estilos.avatarInicial}>{inicial}</Text>
            </View>
          </View>
          <View style={estilos.chipMontado}>
            <ChipDemo />
          </View>
        </View>
        <View style={estilos.perfilTextos}>
          <Text style={[estilos.perfilNombre, { color: paleta.texto }]}>{nombre}</Text>
          <Text style={[estilos.perfilCorreo, { color: paleta.textoSuave }]}>{correo}</Text>
        </View>
      </View>

      <View>
        <Fila etiqueta="Mis carteras" icono={<IconoCartera />} alTocar={verCarteras} />
        <Fila etiqueta="Categorías" icono={<IconoCaja />} alTocar={verCategorias} />
      </View>

      <View style={estilos.grupo}>
        <Fila etiqueta="Soporte" icono={<IconoSigno signo="?" />} alTocar={verDesarrollo} />
        <Fila etiqueta="Configuraciones" icono={<IconoEngranaje />} alTocar={verConfiguracion} />
        <Fila etiqueta="Acerca" icono={<IconoSigno signo="i" />} alTocar={verAcerca} />
      </View>

      <View style={estilos.grupoSalida}>
        <Fila etiqueta="Cerrar sesión" icono={<IconoApagado />} alTocar={() => setCerrando(true)} color={paleta.rojo} />
      </View>

      {/* Confirmación de salida (T013): misma anatomía del diálogo de
          eliminar de Inicio. Cancelar vuelve, Salir cierra la sesión. */}
      <Modal visible={cerrando} transparent animationType="fade" onRequestClose={() => setCerrando(false)}>
        <View style={estilos.fondoDialogo}>
          <View style={estilos.tarjetaDialogo}>
            <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>¿Seguro que quieres salir?</Text>
            <View style={estilos.botonesDialogo}>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.rojo }]}
                accessibilityRole="button"
                accessibilityLabel="Salir"
                onPress={() => {
                  Vibration.vibrate(10);
                  void cerrarSesion();
                }}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Salir</Text>
              </Pressable>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => setCerrando(false)}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  encabezadoTitulo: {
    fontSize: 32,
    fontWeight: '700',
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  perfil: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 30,
  },
  perfilCentro: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInicial: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  chipMontado: {
    position: 'absolute',
    top: 86,
  },
  chip: {
    minWidth: 150,
    borderWidth: 1.5,
    borderColor: paleta.verdeAccion,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  chipTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  anillo: {
    borderWidth: 2.5,
    borderColor: paleta.verdeAccion,
    borderRadius: 55,
    padding: 3,
  },
  perfilTextos: {
    alignItems: 'center',
    marginTop: 10,
  },
  perfilNombre: {
    fontSize: 22,
    fontWeight: '700',
  },
  perfilCorreo: {
    fontSize: 15,
    marginTop: 4,
  },
  grupo: {
    marginTop: 24,
  },
  grupoSalida: {
    marginTop: 40,
    paddingBottom: 8,
  },
  fondoDialogo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 24,
  },
  tarjetaDialogo: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: paleta.tarjeta,
    borderRadius: 16,
    padding: 20,
  },
  tituloDialogo: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  botonesDialogo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  botonDialogo: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  botonDialogoTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  fila: {
    backgroundColor: paleta.tarjeta,
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filaInterna: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  filaEtiqueta: {
    flex: 1,
    fontSize: 17,
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
  icono: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circulo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  signo: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartera: {
    width: 20,
    height: 15,
    borderRadius: 4,
    borderWidth: 2,
  },
  carteraRanura: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 4,
    height: 7,
    borderRadius: 2,
    borderLeftWidth: 2,
  },
  caja: {
    width: 18,
    height: 16,
    borderWidth: 2,
    borderRadius: 2,
  },
  cajaTapa: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: 18,
    height: 0,
    borderTopWidth: 2,
  },
  cajaLengüeta: {
    position: 'absolute',
    top: 4,
    left: 7,
    width: 4,
    height: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  engranajeCentro: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  engranajeMarca: {
    position: 'absolute',
    left: 10.5,
    top: 9.5,
    width: 3,
    height: 5,
    borderRadius: 1.5,
  },
  apagadoLinea: {
    position: 'absolute',
    top: 3,
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  apagadoPunta: {
    position: 'absolute',
    top: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  apagadoBandeja: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
});
