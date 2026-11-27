import { useEffect, useState } from 'react';
import {
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
import { crearCategoria } from '../datos/categorias';
import { useCategorias } from '../datos/useCategorias';
import { crearCartera } from '../datos/carteras';
import { useCarteras } from '../datos/useCarteras';
import { IconoCartera } from '../carteras/IconoCartera';
import { actualizarTransaccion } from '../datos/transacciones';
import type { Transaccion } from '../datos/transacciones';
import { GlifoCategoria } from '../categorias/GlifoCategoria';
import { mostrarAviso } from '../avisos/avisos';
import { actualizarCompromiso, crearCompromiso } from '../datos/compromisos';
import type { Compromiso as CompromisoDoc, Direccion, Naturaleza } from '../datos/compromisos';
import { contraparteValida, normalizarTelefono } from '../compromisos/contraparte';
import { abonadoDe, notaDeOrigen, validarNuevoMonto } from '../compromisos/calculos';
import { useCompromisos } from '../datos/useCompromisos';
import { useTransacciones } from '../datos/useTransacciones';

const TOPE_B64 = 700 * 1024;
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

// La misma normalización del ticket, pero para el render: un teléfono a
// medio escribir no debe tumbar la pantalla.
function seguroTelefono(texto: string): string | undefined {
  try {
    return normalizarTelefono(texto);
  } catch {
    return undefined;
  }
}

type PropsModal = {
  visible: boolean;
  alCerrar: () => void;
  transaccion?: Transaccion;
  compromiso?: CompromisoDoc;
};

type Vista = 'form' | 'categoria' | 'cartera';

// Modal «Agregar transacción» (T006): pantalla completa, sin navbar, que abre
// el + del navbar. La X cierra sin guardar; Guardar escribe en Firestore y
// cierra sin confirmación. El selector de categoría (T007) vive dentro del
// mismo modal con alta rápida inline y guarda categoria_id. En modo edición
// (ADR-0012) recibe el documento precargado y no se duplica el modal. El
// modal sigue sin navbar: única excepción a la regla de la T005.
export function ModalAgregarTransaccion({ visible, alCerrar, transaccion, compromiso }: PropsModal) {
  // La presencia del documento define el modo: la X cierra sin guardar en
  // los dos modos.
  const enEdicion = !!transaccion;
  // Modo edición de compromiso (#135): mismo modal, documento precargado.
  const enEdicionCompromiso = !!compromiso;
  const margenes = useSafeAreaInsets();
  const [tipo, setTipo] = useState<TipoTransaccion>('gasto');
  const [montoTexto, setMontoTexto] = useState('');
  const [notaTexto, setNotaTexto] = useState('');
  const [foto, setFoto] = useState<string>();
  const [fecha, setFecha] = useState(new Date());
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState<Vista>('form');
  const [categoriaId, setCategoriaId] = useState<string>();
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [creandoAlta, setCreandoAlta] = useState(false);
  const [carteraId, setCarteraId] = useState<string>();
  const [nuevaCartera, setNuevaCartera] = useState('');
  const [segmento, setSegmento] = useState<'gasto' | 'ingreso' | 'compromiso'>('gasto');
  const [direccion, setDireccion] = useState<Direccion>('me_deben');
  const [naturaleza, setNaturaleza] = useState<Naturaleza>('dinero');
  const [contraparteTexto, setContraparteTexto] = useState('');
  const [telefonoTexto, setTelefonoTexto] = useState('');
  const [venceFecha, setVenceFecha] = useState<Date>();
  const [conOrigen, setConOrigen] = useState(true);

  const { categorias } = useCategorias();
  const { compromisos } = useCompromisos();
  // En «Deuda/Préstamo» la lista de categorías sale de la naturaleza: una
  // compra con debo lista las de gasto y con me_deben las de ingreso; con
  // dinero no hay categoría.
  const tipoEfectivo: TipoTransaccion | undefined =
    segmento === 'compromiso'
      ? naturaleza === 'compra'
        ? direccion === 'debo'
          ? 'gasto'
          : 'ingreso'
        : undefined
      : tipo;
  const delTipo = categorias.filter((categoria) => categoria.tipo === tipoEfectivo);
  const categoriaSeleccionada = categorias.find((categoria) => categoria.id === categoriaId);
  const { carteras } = useCarteras();
  const carteraSeleccionada = carteras.find((cartera) => cartera.id === carteraId);

  // Transacción amarrada a un compromiso (#136): no cambia de tipo, se sabe
  // parte de «Deudas y préstamos» y, si es neutral, no necesita categoría.
  const amarrada = !!transaccion?.compromiso_id;
  const compromisoAmarrado = amarrada
    ? compromisos.find((c) => c.id === transaccion?.compromiso_id)
    : undefined;
  const amarradaNeutral = amarrada && transaccion?.neutral === true;
  const { transacciones } = useTransacciones();

  // Crear arranca limpio; editar precarga el documento tocado. La fecha se
  // construye por partes para que la zona horaria no corra el día. La X
  // cierra sin guardar nada en los dos modos.
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (transaccion) {
      setTipo(transaccion.tipo);
      setSegmento(transaccion.tipo);
      setMontoTexto(`${transaccion.monto}`);
      setNotaTexto(transaccion.nota ?? '');
      setFoto(transaccion.imagen);
      const [anio, mes, dia] = transaccion.fecha.split('-').map(Number);
      setFecha(new Date(anio, mes - 1, dia));
      setCategoriaId(transaccion.categoria_id);
      setCarteraId(transaccion.cartera_id);
      setVista('form');
      setNuevaCategoria('');
      setNuevaCartera('');
      return;
    }
    if (compromiso) {
      setSegmento('compromiso');
      setDireccion(compromiso.direccion);
      setNaturaleza(compromiso.naturaleza);
      setContraparteTexto(compromiso.contraparte);
      setTelefonoTexto(compromiso.telefono ?? '');
      setMontoTexto(`${compromiso.monto}`);
      if (compromiso.vence) {
        const [anioV, mesV, diaV] = compromiso.vence.split('-').map(Number);
        setVenceFecha(new Date(anioV, mesV - 1, diaV));
      } else {
        setVenceFecha(undefined);
      }
      setNotaTexto(compromiso.nota ?? '');
      setConOrigen(false);
      setFoto(undefined);
      const [anioC, mesC, diaC] = compromiso.fecha.split('-').map(Number);
      setFecha(new Date(anioC, mesC - 1, diaC));
      setCategoriaId(compromiso.categoria_id);
      setVista('form');
      setNuevaCategoria('');
      setNuevaCartera('');
      return;
    }
    setTipo('gasto');
    setMontoTexto('');
    setNotaTexto('');
    setFoto(undefined);
    setFecha(new Date());
    setVista('form');
    setCategoriaId(undefined);
    setNuevaCategoria('');
    setCarteraId(undefined);
    setNuevaCartera('');
    setSegmento('gasto');
    setDireccion('me_deben');
    setNaturaleza('dinero');
    setContraparteTexto('');
    setTelefonoTexto('');
    setVenceFecha(undefined);
    setConOrigen(true);
  }, [visible, transaccion, compromiso]);

  // Monto: solo dígitos y un punto con hasta dos decimales.
  function alCambiarMonto(texto: string) {
    const conPunto = texto.replace(',', '.');
    const partes = conPunto.split('.');
    const normalizado = partes.length > 1
      ? `${partes[0].replace(/\D/g, '')}.${partes.slice(1).join('').replace(/\D/g, '').slice(0, 2)}`
      : conPunto.replace(/\D/g, '');
    setMontoTexto(normalizado);
  }

  // Al cambiar de tipo, una categoría del otro tipo deja de valer.
  function alCambiarTipo(valor: TipoTransaccion) {
    if (categoriaSeleccionada && categoriaSeleccionada.tipo !== valor) {
      setCategoriaId(undefined);
    }
    setTipo(valor);
  }

  const montoValido = /^\d+(\.\d{1,2})?$/.test(montoTexto) && Number(montoTexto) > 0;
  const telefonoSeguro = telefonoTexto.trim() ? seguroTelefono(telefonoTexto) : undefined;
  const telefonoInvalido = !!telefonoTexto.trim() && telefonoSeguro === undefined;
  // En edición del compromiso (#135) el monto nuevo no puede quedar por
  // debajo de lo ya abonado.
  const abonadoCompromiso =
    enEdicionCompromiso && compromiso?.id ? abonadoDe(compromiso.id, transacciones) : 0;
  const validacionMontoNuevo =
    enEdicionCompromiso && montoValido
      ? validarNuevoMonto(Number(montoTexto), abonadoCompromiso)
      : undefined;
  const compromisoValido =
    montoValido &&
    contraparteValida(contraparteTexto) &&
    !telefonoInvalido &&
    (enEdicionCompromiso
      ? validacionMontoNuevo !== 'menor_que_abonado'
      : naturaleza === 'dinero'
        ? !conOrigen || !!carteraId
        : !!categoriaId);
  const listo =
    segmento === 'compromiso'
      ? compromisoValido
      : montoValido && !!carteraId && (amarradaNeutral || !!categoriaId);

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

  // Alta rápida inline (ADR-0011): crea la categoría del tipo activo y la
  // deja seleccionada, sin salir del modal.
  async function crearAltaRapida() {
    const nombre = nuevaCategoria.trim();
    if (!nombre || creandoAlta) {
      return;
    }
    setCreandoAlta(true);
    try {
      const id = await crearCategoria(nombre, tipoEfectivo ?? tipo);
      setCategoriaId(id);
      setNuevaCategoria('');
      setVista('form');
    } finally {
      setCreandoAlta(false);
    }
  }

  // Alta rápida inline de cartera (ADR-0011): crea y la deja seleccionada.
  async function crearAltaRapidaCartera() {
    const nombre = nuevaCartera.trim();
    if (!nombre || creandoAlta) {
      return;
    }
    setCreandoAlta(true);
    try {
      const id = await crearCartera(nombre);
      setCarteraId(id);
      setNuevaCartera('');
      setVista('form');
    } finally {
      setCreandoAlta(false);
    }
  }

  async function guardar() {
    if (enEdicionCompromiso && compromiso?.id) {
      if (!listo || guardando) {
        return;
      }
      setGuardando(true);
      try {
        await actualizarCompromiso(compromiso.id, {
          contraparte: contraparteTexto,
          telefono: telefonoSeguro,
          monto: Number(montoTexto),
          vence: venceFecha ? fechaISO(venceFecha) : undefined,
          nota: notaTexto.trim() ? notaTexto.trim() : undefined,
        });
        mostrarAviso({ mensaje: 'Compromiso guardado', tipo: 'exito' });
        alCerrar();
      } catch (error) {
        console.error('No se pudo actualizar el compromiso:', error);
        mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
      } finally {
        setGuardando(false);
      }
      return;
    }
    if (segmento === 'compromiso') {
      if (!listo || guardando) {
        return;
      }
      setGuardando(true);
      try {
        await crearCompromiso(
          {
            direccion,
            naturaleza,
            contraparte: contraparteTexto,
            telefono: telefonoSeguro,
            monto: Number(montoTexto),
            fecha: fechaISO(fecha),
            vence: venceFecha ? fechaISO(venceFecha) : undefined,
            categoria_id: naturaleza === 'compra' ? categoriaId : undefined,
            nota: notaTexto.trim() ? notaTexto.trim() : undefined,
          },
          naturaleza === 'dinero' && conOrigen && carteraId ? { cartera_id: carteraId } : undefined,
        );
        mostrarAviso({
          mensaje:
            direccion === 'me_deben'
              ? `Préstamo a ${contraparteTexto.trim()} guardado`
              : `Deuda con ${contraparteTexto.trim()} guardado`,
          tipo: 'exito',
        });
        alCerrar();
      } catch (error) {
        console.error('No se pudo crear el compromiso:', error);
        mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
      } finally {
        setGuardando(false);
      }
      return;
    }
    if (!montoValido || !carteraId || (!amarradaNeutral && !categoriaId) || guardando) {
      return;
    }
    if (enEdicion && transaccion?.id) {
      setGuardando(true);
      try {
        await actualizarTransaccion(transaccion.id, {
          tipo,
          monto: Number(montoTexto),
          nota: notaTexto.trim() ? notaTexto.trim() : undefined,
          fecha: fechaISO(fecha),
          imagen: foto,
          categoria_id: categoriaId,
          cartera_id: carteraId,
        });
        mostrarAviso({ mensaje: 'Transacción guardada', tipo: 'exito' });
        alCerrar();
      } catch (error) {
        console.error('No se pudo actualizar la transacción:', error);
        mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
      } finally {
        setGuardando(false);
      }
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
        categoria_id: categoriaId,
        cartera_id: carteraId,
      });
      mostrarAviso({ mensaje: 'Transacción guardada', tipo: 'exito' });
      alCerrar();
    } catch (error) {
      console.error('No se pudo crear la transacción:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => (vista === 'form' ? alCerrar() : setVista('form'))}
    >
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
        <View style={estilos.cabecera}>
          <View style={estilos.ranura}>
            {vista === 'form' ? (
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
            ) : (
              <Pressable
                style={estilos.x}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={() => setVista('form')}
                hitSlop={8}
              >
                <View style={estilos.atrasPunta} />
              </Pressable>
            )}
          </View>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>
            {vista === 'categoria'
              ? 'Categoría'
              : vista === 'cartera'
                ? 'Cartera'
                : enEdicionCompromiso
                  ? 'Editar compromiso'
                  : enEdicion
                    ? 'Editar transacción'
                    : 'Agregar transacción'}
          </Text>
          <View style={estilos.ranura} />
        </View>

        {vista === 'categoria' ? (
          <ScrollView style={estilos.cuerpo} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
            {delTipo.map((categoria, indice) => (
              <View key={categoria.id}>
                <Pressable
                  style={estilos.filaPicker}
                  accessibilityRole="button"
                  accessibilityLabel={categoria.nombre}
                  onPress={() => {
                    setCategoriaId(categoria.id);
                    setVista('form');
                  }}
                >
                  <GlifoCategoria nombre={categoria.nombre} />
                  <Text style={[estilos.filaTexto, { color: paleta.texto, flex: 1 }]} numberOfLines={1}>
                    {categoria.nombre}
                  </Text>
                  {categoria.id === categoriaId ? <View style={[estilos.marcado, { backgroundColor: paleta.verdeLogin }]} /> : null}
                </Pressable>
                {indice < delTipo.length - 1 ? (
                  <View style={[estilos.lineaPicker, { backgroundColor: paleta.separador }]} />
                ) : null}
              </View>
            ))}

            <View style={estilos.filaAlta}>
              <View style={[estilos.circuloNueva, { backgroundColor: paleta.verdeAccion }]}>
                <Text style={estilos.masNueva}>+</Text>
              </View>
              <TextInput
                style={[estilos.entradaAlta, { color: paleta.texto }]}
                value={nuevaCategoria}
                onChangeText={setNuevaCategoria}
                placeholder="Nueva categoría"
                placeholderTextColor={paleta.textoSuave}
                onSubmitEditing={crearAltaRapida}
                returnKeyType="done"
                accessibilityLabel="Nueva categoría"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar"
                disabled={!nuevaCategoria.trim() || creandoAlta}
                onPress={crearAltaRapida}
              >
                <Text
                  style={[
                    estilos.textoAlta,
                    { color: nuevaCategoria.trim() ? paleta.verdeAccion : paleta.textoSuave },
                  ]}
                >
                  Agregar
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : vista === 'cartera' ? (
          <ScrollView style={estilos.cuerpo} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
            {carteras.map((cartera, indice) => (
              <View key={cartera.id}>
                <Pressable
                  style={estilos.filaPicker}
                  accessibilityRole="button"
                  accessibilityLabel={cartera.nombre}
                  onPress={() => {
                    setCarteraId(cartera.id);
                    setVista('form');
                  }}
                >
                  <IconoCartera />
                  <Text style={[estilos.filaTexto, { color: paleta.texto, flex: 1 }]} numberOfLines={1}>
                    {cartera.nombre}
                  </Text>
                  {cartera.id === carteraId ? <View style={[estilos.marcado, { backgroundColor: paleta.verdeLogin }]} /> : null}
                </Pressable>
                {indice < carteras.length - 1 ? (
                  <View style={[estilos.lineaPicker, { backgroundColor: paleta.separador }]} />
                ) : null}
              </View>
            ))}

            <View style={estilos.filaAlta}>
              <View style={[estilos.circuloNueva, { backgroundColor: paleta.verdeAccion }]}>
                <Text style={estilos.masNueva}>+</Text>
              </View>
              <TextInput
                style={[estilos.entradaAlta, { color: paleta.texto }]}
                value={nuevaCartera}
                onChangeText={setNuevaCartera}
                placeholder="Nueva cartera"
                placeholderTextColor={paleta.textoSuave}
                onSubmitEditing={crearAltaRapidaCartera}
                returnKeyType="done"
                accessibilityLabel="Nueva cartera"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar"
                disabled={!nuevaCartera.trim() || creandoAlta}
                onPress={crearAltaRapidaCartera}
              >
                <Text
                  style={[
                    estilos.textoAlta,
                    { color: nuevaCartera.trim() ? paleta.verdeAccion : paleta.textoSuave },
                  ]}
                >
                  Agregar
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={estilos.cuerpo} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
            {amarrada ? (
              <Text style={[estilos.avisoAmarre, { color: paleta.textoSuave }]}>
                {compromisoAmarrado
                  ? `Es parte de «Deudas y préstamos» (${notaDeOrigen(compromisoAmarrado)}). El monto del compromiso se corrige en su detalle.`
                  : 'Es parte de «Deudas y préstamos».'}
              </Text>
            ) : null}
            {!enEdicionCompromiso ? (
            <View style={estilos.selector}>
              {(enEdicion
                ? (['gasto', 'ingreso'] as const)
                : (['gasto', 'ingreso', 'compromiso'] as const)
              ).map((valor) => (
                <Pressable
                  key={valor}
                  style={[
                    estilos.segmento,
                    segmento === valor && { backgroundColor: paleta.verdeOscuro, borderRadius: 26 },
                    amarrada && { opacity: 0.4 },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: segmento === valor, disabled: amarrada }}
                  disabled={amarrada}
                  onPress={() => {
                    if (valor === 'compromiso') {
                      setSegmento('compromiso');
                      return;
                    }
                    alCambiarTipo(valor);
                    setSegmento(valor);
                  }}
                >
                  <Text
                    style={[
                      estilos.segmentoTexto,
                      { color: segmento === valor ? paleta.texto : paleta.textoSuave },
                      segmento === valor && { fontWeight: 'bold' },
                    ]}
                  >
                    {valor === 'gasto' ? 'Gasto' : valor === 'ingreso' ? 'Ingreso' : 'Deuda/Préstamo'}
                  </Text>
                </Pressable>
              ))}
            </View>
            ) : null}

{segmento !== 'compromiso' ? (
            <>
            <Pressable
              style={estilos.fila}
              accessibilityRole="button"
              accessibilityLabel={carteraSeleccionada ? carteraSeleccionada.nombre : 'Seleccione cartera'}
              onPress={() => setVista('cartera')}
            >
              {carteraSeleccionada ? (
                <IconoCartera />
              ) : (
                <View style={estilos.billetera}>
                  <View style={estilos.billeteraMoneda} />
                </View>
              )}
              <Text
                style={[
                  estilos.filaTexto,
                  { color: carteraSeleccionada ? paleta.texto : paleta.textoSuave, flex: 1 },
                ]}
              >
                {carteraSeleccionada ? carteraSeleccionada.nombre : 'Seleccione cartera'}
              </Text>
              <View style={estilos.chevron} />
            </Pressable>

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

            {!amarradaNeutral ? (
            <Pressable
              style={estilos.fila}
              accessibilityRole="button"
              accessibilityLabel={categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccione categoría'}
              onPress={() => setVista('categoria')}
            >
              {categoriaSeleccionada ? (
                <GlifoCategoria nombre={categoriaSeleccionada.nombre} />
              ) : (
                <View style={estilos.circuloCategoria} />
              )}
              <Text
                style={[
                  estilos.filaTexto,
                  { color: categoriaSeleccionada ? paleta.texto : paleta.textoSuave, flex: 1 },
                ]}
              >
                {categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccione categoría'}
              </Text>
              <View style={estilos.chevron} />
            </Pressable>
            ) : null}

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

            {enEdicion && foto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quitar imagen"
                onPress={() => setFoto(undefined)}
                style={estilos.quitar}
              >
                <Text style={[estilos.quitarTexto, { color: paleta.rojo }]}>Quitar imagen</Text>
              </Pressable>
            ) : null}

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

</>
            ) : (
            <>
            <View style={estilos.selector}>
              {(['me_deben', 'debo'] as const).map((valor) => (
                <Pressable
                  key={valor}
                  style={[estilos.segmento, direccion === valor && { backgroundColor: paleta.verdeOscuro, borderRadius: 26 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: direccion === valor }}
                  disabled={enEdicionCompromiso}
                  onPress={() => setDireccion(valor)}
                >
                  <Text
                    style={[
                      estilos.segmentoTexto,
                      { color: direccion === valor ? paleta.texto : paleta.textoSuave },
                      direccion === valor && { fontWeight: 'bold' },
                    ]}
                  >
                    {valor === 'me_deben' ? 'Me deben' : 'Debo'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={estilos.selector}>
              {(['dinero', 'compra'] as const).map((valor) => (
                <Pressable
                  key={valor}
                  style={[estilos.segmento, naturaleza === valor && { backgroundColor: paleta.verdeOscuro, borderRadius: 26 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: naturaleza === valor }}
                  disabled={enEdicionCompromiso}
                  onPress={() => {
                    if (valor !== naturaleza) {
                      setCategoriaId(undefined);
                    }
                    setNaturaleza(valor);
                  }}
                >
                  <Text
                    style={[
                      estilos.segmentoTexto,
                      { color: naturaleza === valor ? paleta.texto : paleta.textoSuave },
                      naturaleza === valor && { fontWeight: 'bold' },
                    ]}
                  >
                    {valor === 'dinero' ? 'Dinero' : 'Compra'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[estilos.ayuda, { color: paleta.textoSuave }]}>
              Dinero: se movió plata. Compra: te llevaste algo y lo pagás después.
            </Text>

            <TextInput
              style={[estilos.entrada, { color: paleta.texto, borderColor: paleta.separador }]}
              value={contraparteTexto}
              onChangeText={setContraparteTexto}
              placeholder="¿Quién? (ej. Juan)"
              placeholderTextColor={paleta.textoSuave}
              accessibilityLabel="Contraparte"
            />

            <TextInput
              style={[estilos.entrada, { color: paleta.texto, borderColor: paleta.separador }]}
              value={telefonoTexto}
              onChangeText={setTelefonoTexto}
              keyboardType="number-pad"
              placeholder="Teléfono (opcional, para recordarle)"
              placeholderTextColor={paleta.textoSuave}
              accessibilityLabel="Teléfono"
            />
            {telefonoInvalido ? (
              <Text style={[estilos.errorTexto, { color: paleta.rojo }]}>Teléfono inválido</Text>
            ) : null}

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

            {validacionMontoNuevo === 'menor_que_abonado' ? (
              <Text style={[estilos.errorTexto, { color: paleta.rojo }]}>
                No puede ser menor que lo ya abonado ($ {abonadoCompromiso.toFixed(2)})
              </Text>
            ) : null}

{!enEdicionCompromiso ? (
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
            ) : null}

            <View style={estilos.fila}>
              <View style={estilos.calendario}>
                <View style={estilos.calendarioPinIzquierdo} />
                <View style={estilos.calendarioPinDerecho} />
                <View style={estilos.calendarioLinea} />
              </View>
              {venceFecha ? (
                <>
                  <Pressable
                    style={estilos.flecha}
                    accessibilityRole="button"
                    accessibilityLabel="Día anterior del vencimiento"
                    onPress={() => setVenceFecha(new Date(venceFecha.getTime() - 86400000))}
                  >
                    <View style={estilos.flechaIzquierda} />
                  </Pressable>
                  <View style={[estilos.pastilla, { backgroundColor: paleta.superficie }]}>
                    <Text style={[estilos.pastillaTexto, { color: paleta.texto }]}>Vence {fechaTexto(venceFecha)}</Text>
                  </View>
                  <Pressable
                    style={estilos.flecha}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar vencimiento"
                    onPress={() => setVenceFecha(undefined)}
                  >
                    <View style={[estilos.flechaIzquierda, { transform: [{ rotate: '135deg' }] }]} />
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[estilos.pastilla, { backgroundColor: paleta.superficie }]}
                  accessibilityRole="button"
                  accessibilityLabel="Elegir fecha de vencimiento"
                  onPress={() => setVenceFecha(new Date())}
                >
                  <Text style={[estilos.pastillaTexto, { color: paleta.textoSuave }]}>Sin fecha</Text>
                </Pressable>
              )}
            </View>

            {!enEdicionCompromiso ? naturaleza === 'dinero' ? (
              <>
                <Pressable
                  style={estilos.filaAccion}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: conOrigen }}
                  accessibilityLabel={direccion === 'me_deben' ? 'Salió de mi cartera' : 'Entró a mi cartera'}
                  onPress={() => setConOrigen((antes) => !antes)}
                >
                  <View
                    style={[
                      estilos.casilla,
                      { borderColor: paleta.separador },
                      conOrigen && { backgroundColor: paleta.verdeLogin, borderColor: paleta.verdeLogin },
                    ]}
                  >
                    {conOrigen ? <View style={estilos.casillaPalomita} /> : null}
                  </View>
                  <Text style={[estilos.filaTexto, { color: paleta.texto, flex: 1 }]}>
                    {direccion === 'me_deben' ? 'Salió de mi cartera' : 'Entró a mi cartera'}
                  </Text>
                </Pressable>
                {conOrigen ? (
                  <Pressable
                    style={estilos.fila}
                    accessibilityRole="button"
                    accessibilityLabel={carteraSeleccionada ? carteraSeleccionada.nombre : 'Seleccione cartera'}
                    onPress={() => setVista('cartera')}
                  >
                    {carteraSeleccionada ? (
                      <IconoCartera />
                    ) : (
                      <View style={estilos.billetera}>
                        <View style={estilos.billeteraMoneda} />
                      </View>
                    )}
                    <Text
                      style={[
                        estilos.filaTexto,
                        { color: carteraSeleccionada ? paleta.texto : paleta.textoSuave, flex: 1 },
                      ]}
                    >
                      {carteraSeleccionada ? carteraSeleccionada.nombre : 'Seleccione cartera'}
                    </Text>
                    <View style={estilos.chevron} />
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Pressable
                style={estilos.fila}
                accessibilityRole="button"
                accessibilityLabel={categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccione categoría'}
                onPress={() => setVista('categoria')}
              >
                {categoriaSeleccionada ? (
                  <GlifoCategoria nombre={categoriaSeleccionada.nombre} />
                ) : (
                  <View style={estilos.circuloCategoria} />
                )}
                <Text
                  style={[
                    estilos.filaTexto,
                    { color: categoriaSeleccionada ? paleta.texto : paleta.textoSuave, flex: 1 },
                  ]}
                >
                  {categoriaSeleccionada ? categoriaSeleccionada.nombre : 'Seleccione categoría'}
                </Text>
                <View style={estilos.chevron} />
              </Pressable>
            ) : null}

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
            </View>

            <View style={estilos.espacio} />
            </>
            )}

          </ScrollView>
        )}

        {vista === 'form' ? (
          <Pressable
            style={[
              estilos.guardar,
              listo ? { backgroundColor: paleta.verdeLogin } : { backgroundColor: paleta.superficie },
              { marginBottom: 24 + margenes.bottom },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Guardar"
            accessibilityState={{ disabled: !listo || guardando }}
            disabled={!listo || guardando}
            onPress={guardar}
          >
            <Text
              style={[
                estilos.guardarTexto,
                { color: listo ? paleta.texto : paleta.textoSuave },
              ]}
            >
              Guardar
            </Text>
          </Pressable>
        ) : null}
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
  cuerpo: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contenido: {
    paddingBottom: 8,
  },
  avisoAmarre: {
    fontSize: 13,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
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
  filaPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
    paddingVertical: 14,
  },
  lineaPicker: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  marcado: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filaAlta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: paleta.separador,
  },
  circuloNueva: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masNueva: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  entradaAlta: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  textoAlta: {
    fontSize: 15,
    fontWeight: '700',
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
  quitar: {
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 10,
  },
  quitarTexto: {
    fontSize: 13,
    fontWeight: '600',
  },
  entrada: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  ayuda: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
  },
  errorTexto: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  filaAccion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  casilla: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 6,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaPalomita: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: paleta.texto,
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
});
