import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as SelectorImagen from 'expo-image-picker';
import * as Manipulador from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { crearTransaccion } from '../datos/transacciones';
import type { TipoTransaccion } from '../datos/transacciones';

const VISIBLE_MS = 2000;
const DURACION_MS = 180;
const TOPE_B64 = 700 * 1024;
const controladorNativo = Platform.OS !== 'web';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaTexto(fecha: Date): string {
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function fechaISO(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// ADR-0009: la foto se comprime en el dispositivo a JPEG y viaja en base64
// dentro del documento, con tope interno de ~700 KB y re-compresión si se pasa.
async function comprimirFoto(uri: string): Promise<string | undefined> {
  let ancho = 1280;
  let calidad = 0.8;
  for (let ronda = 0; ronda < 6; ronda += 1) {
    const resultado = await Manipulador.manipulateAsync(
      uri,
      [{ resize: { width: ancho } }],
      { compress: calidad, format: Manipulador.SaveFormat.JPEG, base64: true },
    );
    if (resultado.base64 && resultado.base64.length <= TOPE_B64) {
      return resultado.base64;
    }
    ancho = Math.round(ancho * 0.7);
    calidad = Math.max(0.4, calidad - 0.1);
  }
  return undefined;
}

type PropsModal = { visible: boolean; alCerrar: () => void };

// Modal «Agregar transacción» (T006): pantalla completa, sin navbar, que abre
// el + del navbar. La X cierra sin guardar; Guardar escribe en Firestore y
// cierra sin confirmación. Anatomía del modelo de .github/Assets/transacciones.
export function ModalAgregarTransaccion({ visible, alCerrar }: PropsModal) {
  const margenes = useSafeAreaInsets();
  const [tipo, setTipo] = useState<TipoTransaccion>('gasto');
  const [montoTexto, setMontoTexto] = useState('');
  const [notaTexto, setNotaTexto] = useState('');
  const [foto, setFoto] = useState<string>();
  const [fecha, setFecha] = useState(new Date());
  const [guardando, setGuardando] = useState(false);
  const toastVisto = useRef(false);
  const opacidad = useRef(new Animated.Value(0)).current;

  // Cada visita arranca limpia: la X cierra sin guardar nada.
  useEffect(() => {
    if (visible) {
      setTipo('gasto');
      setMontoTexto('');
      setNotaTexto('');
      setFoto(undefined);
      setFecha(new Date());
      toastVisto.current = false;
    }
  }, [visible]);

  // El toast global «En desarrollo», una vez por visita al modal.
  function mostrarToast() {
    if (toastVisto.current) {
      return;
    }
    toastVisto.current = true;
    Animated.timing(opacidad, {
      toValue: 1,
      duration: DURACION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: controladorNativo,
    }).start();
    setTimeout(() => {
      Animated.timing(opacidad, {
        toValue: 0,
        duration: DURACION_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: controladorNativo,
      }).start();
    }, VISIBLE_MS);
  }

  // Monto: solo dígitos y un punto con hasta dos decimales.
  function alCambiarMonto(texto: string) {
    const conPunto = texto.replace(',', '.');
    const partes = conPunto.split('.');
    const normalizado = partes.length > 1
      ? `${partes[0].replace(/\D/g, '')}.${partes.slice(1).join('').replace(/\D/g, '').slice(0, 2)}`
      : conPunto.replace(/\D/g, '');
    setMontoTexto(normalizado);
  }

  const montoValido = /^\d+(\.\d{1,2})?$/.test(montoTexto) && Number(montoTexto) > 0;

  async function elegirFoto() {
    const resultado = await SelectorImagen.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      exif: false,
    });
    if (resultado.canceled || !resultado.assets[0]) {
      return;
    }
    const base64 = await comprimirFoto(resultado.assets[0].uri);
    if (base64) {
      setFoto(base64);
    }
  }

  async function guardar() {
    if (!montoValido || guardando) {
      return;
    }
    setGuardando(true);
    try {
      await crearTransaccion({
        tipo,
        monto: Number(montoTexto),
        nota: notaTexto.trim() ? notaTexto.trim() : undefined,
        fecha: fechaISO(fecha),
        imagen: foto,
      });
      alCerrar();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={alCerrar}>
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
        <View style={estilos.cabecera}>
          <View style={estilos.ranura}>
            <Pressable
              style={estilos.x}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={alCerrar}
              hitSlop={8}
            >
              <View style={estilos.barraX1} />
              <View style={estilos.barraX2} />
            </Pressable>
          </View>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>Agregar transacción</Text>
          <View style={estilos.ranura} />
        </View>

        <ScrollView style={estilos.cuerpo} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <View style={estilos.selector}>
            {(['gasto', 'ingreso'] as const).map((valor) => (
              <Pressable
                key={valor}
                style={[estilos.segmento, tipo === valor && { backgroundColor: paleta.verdeOscuro, borderRadius: 26 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: tipo === valor }}
                onPress={() => setTipo(valor)}
              >
                <Text
                  style={[
                    estilos.segmentoTexto,
                    { color: tipo === valor ? paleta.texto : paleta.textoSuave },
                    tipo === valor && { fontWeight: 'bold' },
                  ]}
                >
                  {valor === 'gasto' ? 'Gasto' : 'Ingreso'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={estilos.fila}>
            <View style={estilos.billetera}>
              <View style={estilos.billeteraMoneda} />
            </View>
            <Text style={[estilos.filaTexto, { color: paleta.texto }]}>Efectivo</Text>
          </View>

          <View style={estilos.monto}>
            <View style={estilos.badge}>
              <Text style={[estilos.badgeTexto, { color: paleta.texto }]}>USD</Text>
            </View>
            <TextInput
              style={[estilos.montoEntrada, { color: paleta.verdeMonto }]}
              value={montoTexto}
              onChangeText={alCambiarMonto}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={paleta.textoSuave}
              accessibilityLabel="Monto"
            />
          </View>

          <Pressable
            style={estilos.fila}
            accessibilityRole="button"
            accessibilityLabel="Seleccione categoría"
            onPress={mostrarToast}
          >
            <View style={estilos.circuloCategoria} />
            <Text style={[estilos.filaTexto, { color: paleta.textoSuave, flex: 1 }]}>
              Seleccione categoría
            </Text>
            <View style={estilos.chevron} />
          </Pressable>

          <View style={estilos.fila}>
            <View style={estilos.notas}>
              <View style={estilos.notaLinea} />
              <View style={estilos.notaLinea} />
            </View>
            <TextInput
              style={[estilos.notaEntrada, { color: paleta.texto }]}
              value={notaTexto}
              onChangeText={setNotaTexto}
              placeholder="Escribir una nota"
              placeholderTextColor={paleta.textoSuave}
              accessibilityLabel="Nota"
            />
            {foto ? (
              <Image source={{ uri: `data:image/jpeg;base64,${foto}` }} style={estilos.miniatura} />
            ) : null}
            <Pressable
              style={[estilos.botonFoto, { backgroundColor: paleta.verdeLogin }]}
              accessibilityRole="button"
              accessibilityLabel="Adjuntar foto"
              onPress={elegirFoto}
            >
              <View style={estilos.fotoMarco}>
                <View style={estilos.fotoSol} />
                <View style={estilos.fotoMontana} />
              </View>
            </Pressable>
          </View>

          <View style={estilos.fila}>
            <View style={estilos.calendario}>
              <View style={estilos.calendarioPinIzquierdo} />
              <View style={estilos.calendarioPinDerecho} />
              <View style={estilos.calendarioLinea} />
            </View>
            <Pressable
              style={estilos.flecha}
              accessibilityRole="button"
              accessibilityLabel="Día anterior"
              onPress={() => setFecha(new Date(fecha.getTime() - 86400000))}
            >
              <View style={estilos.flechaIzquierda} />
            </Pressable>
            <View style={[estilos.pastilla, { backgroundColor: paleta.verdeOscuro }]}>
              <Text style={[estilos.pastillaTexto, { color: paleta.texto }]}>{fechaTexto(fecha)}</Text>
            </View>
            <Pressable
              style={estilos.flecha}
              accessibilityRole="button"
              accessibilityLabel="Día siguiente"
              onPress={() => setFecha(new Date(fecha.getTime() + 86400000))}
            >
              <View style={estilos.flechaDerecha} />
            </Pressable>
          </View>

          <View style={estilos.espacio} />
        </ScrollView>

        <Pressable
          style={[
            estilos.guardar,
            montoValido ? { backgroundColor: paleta.verdeLogin } : { backgroundColor: paleta.superficie },
            { marginBottom: 24 + margenes.bottom },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Guardar"
          accessibilityState={{ disabled: !montoValido || guardando }}
          disabled={!montoValido || guardando}
          onPress={guardar}
        >
          <Text style={[estilos.guardarTexto, { color: montoValido ? paleta.texto : paleta.textoSuave }]}>
            Guardar
          </Text>
        </Pressable>

        <Animated.View style={[estilos.toast, { opacity: opacidad }]} pointerEvents="none">
          <Text style={[estilos.toastTexto, { color: paleta.texto }]}>En desarrollo</Text>
        </Animated.View>
      </View>
    </Modal>
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
    justifyContent: 'center',
  },
  x: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barraX1: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  barraX2: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '-45deg' }],
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  cuerpo: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contenido: {
    paddingBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: paleta.separador,
    overflow: 'hidden',
    marginBottom: 14,
  },
  segmento: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  segmentoTexto: {
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
  filaTexto: {
    fontSize: 15,
  },
  billetera: {
    width: 22,
    height: 16,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: paleta.texto,
  },
  billeteraMoneda: {
    position: 'absolute',
    right: 2,
    top: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: paleta.texto,
  },
  monto: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  badge: {
    backgroundColor: paleta.superficie,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  montoEntrada: {
    flex: 1,
    fontSize: 40,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: paleta.verdeMonto,
    paddingVertical: 4,
  },
  circuloCategoria: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: paleta.puntoInactivo,
  },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
  notas: {
    width: 18,
    height: 20,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: paleta.texto,
  },
  notaLinea: {
    width: 10,
    height: 2,
    backgroundColor: paleta.texto,
    marginTop: 3,
    marginLeft: 2,
  },
  notaEntrada: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  miniatura: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  botonFoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoMarco: {
    width: 16,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: paleta.texto,
  },
  fotoSol: {
    position: 'absolute',
    top: 1,
    left: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: paleta.texto,
  },
  fotoMontana: {
    position: 'absolute',
    bottom: 0,
    left: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: paleta.texto,
  },
  calendario: {
    width: 20,
    height: 18,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: paleta.texto,
  },
  calendarioPinIzquierdo: {
    position: 'absolute',
    top: -4,
    left: 4,
    width: 2,
    height: 4,
    backgroundColor: paleta.texto,
  },
  calendarioPinDerecho: {
    position: 'absolute',
    top: -4,
    right: 4,
    width: 2,
    height: 4,
    backgroundColor: paleta.texto,
  },
  calendarioLinea: {
    position: 'absolute',
    top: 4,
    left: 2,
    right: 2,
    height: 1.5,
    backgroundColor: paleta.texto,
  },
  flecha: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  flechaIzquierda: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  flechaDerecha: {
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  pastilla: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pastillaTexto: {
    fontSize: 14,
    fontWeight: '600',
  },
  espacio: {
    height: 16,
  },
  guardar: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
  guardarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 96,
    backgroundColor: paleta.superficie,
    borderColor: paleta.separador,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastTexto: {
    fontSize: 14,
  },
});
