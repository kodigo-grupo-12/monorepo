import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlifoCategoria } from '../categorias/GlifoCategoria';
import { IconoCartera } from '../carteras/IconoCartera';
import { useCarteras } from '../datos/useCarteras';
import { useCategorias } from '../datos/useCategorias';
import { useTransacciones } from '../datos/useTransacciones';
import { registrarAbono } from '../datos/compromisos';
import type { Compromiso as CompromisoDoc } from '../datos/compromisos';
import type { Transaccion } from '../datos/transacciones';
import { mostrarAviso } from '../avisos/avisos';
import { paleta } from '../tema/colores';
import { SelectorCartera } from '../transacciones/SelectorCartera';
import { pendienteDe, validarAbono } from './calculos';
import { cuotasDe, montoDeCuota, proximaCuota } from './cuotas';
import { hoyISO } from '../transacciones/fechas';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaTexto(fecha: Date): string {
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function fechaISO(fecha: Date): string {
  const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
  const dia = `${fecha.getDate()}`.padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

type Props = {
  visible: boolean;
  alCerrar: () => void;
  compromiso: CompromisoDoc;
  transacciones: Transaccion[];
};

// Modal a pantalla completa sin navbar (excepción de la T006, igual que el
// del +): registra un cobro o un pago (#134). El monto arranca con el
// pendiente, o con el de la próxima cuota si hay plan (#139); el tope sigue
// siendo el pendiente total. La cartera arranca con la del origen y la
// fecha con hoy.
export function ModalAbono({ visible, alCerrar, compromiso, transacciones }: Props) {
  const margenes = useSafeAreaInsets();
  const { carteras } = useCarteras();
  const { categorias } = useCategorias();
  const pendiente = pendienteDe(compromiso, transacciones);
  const proxima = proximaCuota(cuotasDe(compromiso, transacciones, hoyISO()));

  const [montoTexto, setMontoTexto] = useState(
    (proxima ? montoDeCuota(proxima) : pendiente).toFixed(2),
  );
  const [fecha, setFecha] = useState(new Date());
  const [carteraId, setCarteraId] = useState<string | undefined>(compromiso.cartera_id);
  const [categoriaId, setCategoriaId] = useState<string | undefined>(compromiso.categoria_id);
  const [notaTexto, setNotaTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [elegirCartera, setElegirCartera] = useState(false);

  const esCobro = compromiso.direccion === 'me_deben';
  const compra = compromiso.naturaleza === 'compra';
  // En una compra el abono sí es movimiento real: gasto si debés, ingreso si
  // te deben, así que la lista de categorías sale de ese tipo.
  const tipoCategoria: TipoCategoria = compra ? (esCobro ? 'ingreso' : 'gasto') : 'gasto';
  const categoriasValidas = categorias.filter((categoria) => categoria.tipo === tipoCategoria);
  const categoriaElegida = categorias.find((categoria) => categoria.id === categoriaId);
  const carteraElegida = carteras.find((cartera) => cartera.id === carteraId);

  const montoValido = /^\d+(\.\d{1,2})?$/.test(montoTexto) && Number(montoTexto) > 0;
  const validacion = montoValido ? validarAbono(Number(montoTexto), pendiente) : undefined;
  const listo = montoValido && validacion === 'ok' && !!carteraId && (!compra || !!categoriaId);

  async function guardar() {
    if (!listo || guardando) {
      return;
    }
    setGuardando(true);
    try {
      const monto = Number(montoTexto);
      await registrarAbono(compromiso, {
        monto,
        fecha: fechaISO(fecha),
        cartera_id: carteraId as string,
        categoria_id: compra ? categoriaId : undefined,
        nota: notaTexto.trim() ? notaTexto.trim() : undefined,
      });
      const queda = Math.round((pendiente - monto) * 100);
      mostrarAviso({
        mensaje:
          queda <= 0
            ? esCobro
              ? `${compromiso.contraparte} te pagó todo`
              : `Le pagaste todo a ${compromiso.contraparte}`
            : esCobro
              ? `Cobro de $ ${monto.toFixed(2)} registrado`
              : `Pago de $ ${monto.toFixed(2)} registrado`,
        tipo: 'exito',
      });
      alCerrar();
    } catch (error) {
      console.error('No se pudo registrar el abono:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={alCerrar}>
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
        <View style={estilos.cabecera}>
          <View style={estilos.ranura}>
            <Pressable
              style={estilos.cerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={alCerrar}
              hitSlop={8}
            >
              <Text style={[estilos.cerrarTexto, { color: paleta.texto }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>
            {esCobro ? 'Registrar cobro' : 'Registrar pago'}
          </Text>
          <View style={estilos.ranura} />
        </View>

        <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
          <Pressable
            style={estilos.fila}
            accessibilityRole="button"
            accessibilityLabel={carteraElegida ? carteraElegida.nombre : 'Seleccione cartera'}
            onPress={() => setElegirCartera(true)}
          >
            {carteraElegida ? (
              <IconoCartera />
            ) : (
              <View style={estilos.billetera}>
                <View style={estilos.billeteraMoneda} />
              </View>
            )}
            <Text
              style={[
                estilos.filaTexto,
                { color: carteraElegida ? paleta.texto : paleta.textoSuave, flex: 1 },
              ]}
            >
              {carteraElegida ? carteraElegida.nombre : 'Seleccione cartera'}
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
              onChangeText={setMontoTexto}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={paleta.textoSuave}
              accessibilityLabel="Monto"
            />
          </View>
          <Text style={[estilos.linea, { color: paleta.textoSuave }]}>Pendiente: $ {pendiente.toFixed(2)}</Text>
          {validacion === 'excede' ? (
            <Text style={[estilos.linea, { color: paleta.rojoMonto }]}>
              No puede pasar de lo pendiente ($ {pendiente.toFixed(2)})
            </Text>
          ) : null}

          <View style={estilos.fila}>
            <Text style={[estilos.filaTexto, { color: paleta.texto }]}>
              {fechaTexto(fecha)}
            </Text>
            <View style={estilos.flechas}>
              <Pressable
                style={estilos.flecha}
                accessibilityRole="button"
                accessibilityLabel="Día anterior"
                onPress={() => {
                  const nueva = new Date(fecha);
                  nueva.setDate(nueva.getDate() - 1);
                  setFecha(nueva);
                }}
              >
                <Text style={[estilos.flechaTexto, { color: paleta.texto }]}>{'<'}</Text>
              </Pressable>
              <Pressable
                style={estilos.flecha}
                accessibilityRole="button"
                accessibilityLabel="Día siguiente"
                onPress={() => {
                  const nueva = new Date(fecha);
                  nueva.setDate(nueva.getDate() + 1);
                  setFecha(nueva);
                }}
              >
                <Text style={[estilos.flechaTexto, { color: paleta.texto }]}>{'>'}</Text>
              </Pressable>
            </View>
          </View>

          {compra ? (
            <View style={estilos.seccion}>
              <Text style={[estilos.etiquetaSeccion, { color: paleta.textoSuave }]}>Categoría</Text>
              {categoriasValidas.map((categoria) => (
                <Pressable
                  key={categoria.id}
                  style={estilos.fila}
                  accessibilityRole="button"
                  accessibilityState={{ selected: categoria.id === categoriaId }}
                  accessibilityLabel={categoria.nombre}
                  onPress={() => setCategoriaId(categoria.id)}
                >
                  <GlifoCategoria nombre={categoria.nombre} />
                  <Text
                    style={[
                      estilos.filaTexto,
                      { color: categoria.id === categoriaId ? paleta.texto : paleta.textoSuave, flex: 1 },
                    ]}
                  >
                    {categoria.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <TextInput
            style={[estilos.notaEntrada, { color: paleta.texto }]}
            value={notaTexto}
            onChangeText={setNotaTexto}
            placeholder="Escribir una nota"
            placeholderTextColor={paleta.textoSuave}
            accessibilityLabel="Nota"
          />
        </ScrollView>

        <Pressable
          style={[
            estilos.guardar,
            {
              backgroundColor: listo && !guardando ? paleta.verdeLogin : paleta.superficie,
              marginBottom: 24 + margenes.bottom,
            },
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
              { color: listo && !guardando ? paleta.texto : paleta.textoSuave },
            ]}
          >
            Guardar
          </Text>
        </Pressable>

        <SelectorCartera
          visible={elegirCartera}
          carteras={carteras}
          transacciones={transacciones}
          seleccionadaId={carteraId}
          alCerrar={() => setElegirCartera(false)}
          alSeleccionar={(id) => {
            if (id) {
              setCarteraId(id);
            }
            setElegirCartera(false);
          }}
        />
      </View>
    </Modal>
  );
}

type TipoCategoria = 'gasto' | 'ingreso';

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
  cerrar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarTexto: {
    fontSize: 20,
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  contenido: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  filaTexto: {
    fontSize: 16,
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '-45deg' }],
  },
  billetera: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: paleta.texto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billeteraMoneda: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: paleta.texto,
  },
  monto: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 16,
  },
  badge: {
    backgroundColor: paleta.superficie,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  badgeTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  montoEntrada: {
    flex: 1,
    fontSize: 40,
    fontWeight: 'bold',
    borderBottomWidth: 2,
    borderBottomColor: paleta.verdeMonto,
    paddingVertical: 4,
  },
  linea: {
    fontSize: 14,
    paddingVertical: 4,
  },
  flechas: {
    flexDirection: 'row',
    gap: 8,
  },
  flecha: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaTexto: {
    fontSize: 20,
  },
  seccion: {
    paddingTop: 12,
  },
  etiquetaSeccion: {
    fontSize: 13,
    paddingBottom: 4,
  },
  notaEntrada: {
    backgroundColor: paleta.superficie,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    minHeight: 44,
  },
  guardar: {
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  guardarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
});
