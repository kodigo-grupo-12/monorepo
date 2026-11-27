import { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Esqueleto } from '../animaciones/Esqueleto';
import { useCarteras } from '../datos/useCarteras';
import { useCompromisos } from '../datos/useCompromisos';
import { useTransacciones } from '../datos/useTransacciones';
import { cerrarCompromiso, reabrirCompromiso, borrarCompromiso } from '../datos/compromisos';
import { mostrarAviso } from '../avisos/avisos';
import { deISO, hoyISO } from '../transacciones/fechas';
import { enlaceWhatsApp, mensajeRecordatorio } from './recordatorio';
import { ModalAgregarTransaccion } from '../transacciones/ModalAgregarTransaccion';
import { paleta } from '../tema/colores';
import { abonadoDe, abonosDe, amarradasA, diasDeAtraso, estadoDe, pendienteDe, montoBaseDe } from './calculos';
import { cuotasDe, montoDeCuota, proximaCuota } from './cuotas';
import type { Cuota } from './cuotas';
import { ModalAbono } from './ModalAbono';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const TEXTO_ESTADO: Record<string, string> = {
  activo: 'Vigente',
  vencido: 'Vencido',
  cerrado: 'Pagado',
  perdonado: 'Perdonado',
  cancelado: 'Cancelado',
};

function diaLargo(iso: string): string {
  const fecha = deISO(iso);
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

function diaCorto(iso: string): string {
  const fecha = deISO(iso);
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

// El estado de una cuota en el calendario (#139): «Pagada» con check,
// «Parcial $15 de $20», «Pendiente» o «Atrasada · N días» en rojo.
function estadoDeCuota(cuota: Cuota): { texto: string; color: string } {
  if (cuota.estado === 'pagada') {
    return { texto: '✓ Pagada', color: paleta.verdeLogin };
  }
  if (cuota.estado === 'parcial') {
    return {
      texto: `Parcial $ ${cuota.pagado.toFixed(2)} de $ ${(cuota.esperado ?? cuota.referencia).toFixed(2)}`,
      color: paleta.texto,
    };
  }
  if (cuota.estado === 'atrasada') {
    const dias = cuota.diasAtraso === 1 ? '1 día' : `${cuota.diasAtraso} días`;
    return { texto: `Atrasada · ${dias}`, color: paleta.rojoMonto };
  }
  return { texto: 'Pendiente', color: paleta.textoSuave };
}

// Detalle de un compromiso (spec #130, issue #133): todo en vivo, sin
// escribir nada. Los botones llegan en #134, #135 y #137.
export function PantallaDetalleCompromiso({ id }: { id: string }) {
  const [modalAbono, setModalAbono] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dialogo, setDialogo] = useState<'perdonar' | 'cancelar' | 'borrar'>();
  const [trabajando, setTrabajando] = useState(false);
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { compromisos, cargando } = useCompromisos();
  const { transacciones, cargando: cargandoTransacciones } = useTransacciones();
  const { carteras } = useCarteras();
  const hoy = hoyISO();

  const compromiso = compromisos.find((candidato) => candidato.id === id);
  const ocupado = cargando || cargandoTransacciones;

  if (ocupado) {
    return (
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
        <View style={estilos.contenido}>
          <Esqueleto ancho="60%" alto={24} margen={8} />
          <Esqueleto ancho="100%" alto={90} margen={10} />
          <Esqueleto ancho="100%" alto={54} margen={10} />
          <Esqueleto ancho="100%" alto={54} margen={10} />
        </View>
      </View>
    );
  }

  if (!compromiso) {
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
          <View style={estilos.ranura} />
        </View>
        <View style={estilos.contenido}>
          <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>
            Este compromiso ya no existe.
          </Text>
        </View>
      </View>
    );
  }

  const estado = estadoDe(compromiso, transacciones, hoy);
  const abonado = abonadoDe(compromiso.id ?? '', transacciones);
  const pendiente = pendienteDe(compromiso, transacciones);
  // Con plan (#139): desglose de cuotas y la próxima por venir.
  const cuotas = compromiso.plan ? cuotasDe(compromiso, transacciones, hoy) : [];
  const proxima = proximaCuota(cuotas);
  const pagadas = cuotas.filter((cuota) => cuota.estado === 'pagada').length;
  const progreso = compromiso.monto > 0 ? Math.min(1, abonado / compromiso.monto) : 0;
  const origen = transacciones.find((t) => t.compromiso_id === compromiso.id && t.rol === 'origen');
  const carteraOrigen = origen?.cartera_id
    ? carteras.find((cartera) => cartera.id === origen.cartera_id)
    : undefined;
  const abonos = abonosDe(compromiso.id ?? '', transacciones).slice().reverse();
  const vencido = estado === 'vencido';
  const abierto = estado === 'activo' || estado === 'vencido';
  // El botón «Recordarle» (#137) solo tiene sentido cuando a mí me deben
  // y el compromiso sigue abierto: con «debo» no se muestra.
  const recuerda = abierto && compromiso.direccion === 'me_deben';
  const amarradas = amarradasA(compromiso.id ?? '', transacciones);
  // Alias estrechado: las funciones asíncronas no heredan el estrechamiento.
  const compromisoActual = compromiso;

  async function perdonar() {
    if (!compromisoActual.id || trabajando) {
      return;
    }
    setTrabajando(true);
    try {
      await cerrarCompromiso(compromisoActual.id, 'perdonado');
      mostrarAviso({ mensaje: 'Compromiso perdonado', tipo: 'exito' });
      setDialogo(undefined);
    } catch (error) {
      console.error('No se pudo perdonar el compromiso:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setTrabajando(false);
    }
  }

  async function cancelar() {
    if (!compromisoActual.id || trabajando) {
      return;
    }
    setTrabajando(true);
    try {
      await cerrarCompromiso(compromisoActual.id, 'cancelado');
      mostrarAviso({ mensaje: 'Compromiso cancelado', tipo: 'exito' });
      setDialogo(undefined);
    } catch (error) {
      console.error('No se pudo cancelar el compromiso:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setTrabajando(false);
    }
  }

  async function reabrir() {
    if (!compromisoActual.id || trabajando) {
      return;
    }
    setTrabajando(true);
    try {
      await reabrirCompromiso(compromisoActual.id);
      mostrarAviso({ mensaje: 'Compromiso reabierto', tipo: 'exito' });
    } catch (error) {
      console.error('No se pudo reabrir el compromiso:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setTrabajando(false);
    }
  }

  async function borrar(modo: 'todo' | 'soltar') {
    if (!compromisoActual.id || trabajando) {
      return;
    }
    setTrabajando(true);
    try {
      await borrarCompromiso(compromisoActual, amarradas, modo);
      mostrarAviso({ mensaje: 'Compromiso borrado', tipo: 'exito' });
      setDialogo(undefined);
      enrutador.back();
    } catch (error) {
      console.error('No se pudo borrar el compromiso:', error);
      mostrarAviso({ mensaje: 'No se pudo guardar', tipo: 'error' });
    } finally {
      setTrabajando(false);
    }
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
        <Text style={[estilos.titulo, { color: paleta.texto }]} numberOfLines={1}>
          {compromiso.contraparte}
        </Text>
        <View style={estilos.ranura}>
          <Pressable
            style={estilos.atras}
            accessibilityRole="button"
            accessibilityLabel="Más acciones"
            onPress={() => setMenu(true)}
            hitSlop={8}
          >
            <Text style={[estilos.menuPuntos, { color: paleta.texto }]}>⋯</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.contenidoLista}>
        <View style={estilos.lineaDatos}>
          <Text style={[estilos.dato, { color: paleta.texto }]}>
            {compromiso.direccion === 'me_deben' ? 'Te debe' : 'Le debés'}
          </Text>
          <Text style={[estilos.dato, { color: paleta.textoSuave }]}>
            {compromiso.naturaleza === 'dinero' ? 'Préstamo' : 'Compra'}
          </Text>
          <View style={[estilos.chipEstado, vencido && { backgroundColor: paleta.rojoMonto }]}>
            <Text style={estilos.chipEstadoTexto}>{TEXTO_ESTADO[estado]}</Text>
          </View>
        </View>

        <View style={estilos.montos}>
          <View style={estilos.montoCaja}>
            <Text style={[estilos.montoEtiqueta, { color: paleta.textoSuave }]}>Monto</Text>
            <Text style={[estilos.montoValor, { color: paleta.texto }]}>$ {montoBaseDe(compromiso).toFixed(2)}</Text>
          </View>
          <View style={estilos.montoCaja}>
            <Text style={[estilos.montoEtiqueta, { color: paleta.textoSuave }]}>Abonado</Text>
            <Text style={[estilos.montoValor, { color: paleta.azulMonto }]}>$ {abonado.toFixed(2)}</Text>
          </View>
          <View style={estilos.montoCaja}>
            <Text style={[estilos.montoEtiqueta, { color: paleta.textoSuave }]}>Pendiente</Text>
            <Text style={[estilos.montoValor, { color: paleta.rojoMonto }]}>$ {pendiente.toFixed(2)}</Text>
          </View>
        </View>

        <View style={estilos.barra}>
          <View style={[estilos.barraLlena, { width: `${Math.round(progreso * 100)}%`, backgroundColor: paleta.verdeLogin }]} />
        </View>

        {compromiso.plan ? (
          <Text style={[estilos.linea, { color: paleta.texto }]}>
            {`Cuotas: ${pagadas} de ${cuotas.length} pagadas`}
            {proxima
              ? ` · Próxima: ${diaCorto(proxima.vence)} · $ ${montoDeCuota(proxima).toFixed(2)}`
              : ''}
          </Text>
        ) : (
          <Text style={[estilos.linea, { color: paleta.textoSuave }]}>
            {compromiso.vence ? `Vence: ${diaLargo(compromiso.vence)}` : 'Sin fecha'}
            {vencido ? ` · Atrasado · ${diasDeAtraso(compromiso.vence ?? hoy, hoy)} días` : ''}
          </Text>
        )}

        {cuotas.length ? (
          <>
            <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>Calendario de cuotas</Text>
            {cuotas.map((cuota) => {
              const estadoCuota = estadoDeCuota(cuota);
              return (
                <View key={cuota.numero} style={estilos.filaAbono}>
                  <Text style={[estilos.abonoFecha, { color: paleta.textoSuave }]} numberOfLines={1}>
                    {`${cuota.numero} · ${diaCorto(cuota.vence)} · $ ${(cuota.esperado ?? cuota.referencia).toFixed(2)}`}
                    {cuota.pagado > 0 && cuota.estado !== 'pagada' ? ` · pagado $ ${cuota.pagado.toFixed(2)}` : ''}
                  </Text>
                  <Text style={[estilos.abonoCartera, { color: estadoCuota.color }]} numberOfLines={1}>
                    {estadoCuota.texto}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}

        {carteraOrigen ? (
          <Text style={[estilos.linea, { color: paleta.textoSuave }]}>
            {compromiso.direccion === 'me_deben' ? 'Salió de' : 'Entró a'} {carteraOrigen.nombre}
          </Text>
        ) : null}

        <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>Historial de abonos</Text>
        {abonos.length === 0 ? (
          <Text style={[estilos.linea, { color: paleta.textoSuave }]}>Todavía no hay abonos.</Text>
        ) : (
          abonos.map((abono, indice) => {
            const cartera = abono.cartera_id
              ? carteras.find((candidata) => candidata.id === abono.cartera_id)
              : undefined;
            return (
              <View key={abono.id ?? indice} style={estilos.filaAbono}>
                <Text style={[estilos.abonoFecha, { color: paleta.textoSuave }]}>
                  {diaLargo(abono.fecha)}
                </Text>
                <Text style={[estilos.abonoMonto, { color: paleta.texto }]}>
                  $ {abono.monto.toFixed(2)}
                </Text>
                <Text style={[estilos.abonoCartera, { color: paleta.textoSuave }]} numberOfLines={1}>
                  {cartera ? cartera.nombre : ''}
                </Text>
              </View>
            );
          })
        )}

        {compromiso.nota ? (
          <>
            <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>Nota</Text>
            <Text style={[estilos.linea, { color: paleta.texto }]}>{compromiso.nota}</Text>
          </>
        ) : null}
      </ScrollView>

      {abierto ? (
        <Pressable
          style={[estilos.accion, { backgroundColor: paleta.verdeAccion, marginBottom: recuerda ? 10 : 24 + margenes.bottom }]}
          accessibilityRole="button"
          accessibilityLabel={compromiso.direccion === 'me_deben' ? 'Registrar cobro' : 'Registrar pago'}
          onPress={() => setModalAbono(true)}
        >
          <Text style={estilos.accionTexto}>
            {compromiso.direccion === 'me_deben' ? 'Registrar cobro' : 'Registrar pago'}
          </Text>
        </Pressable>
      ) : null}

      {recuerda ? (
        <Pressable
          style={[estilos.accion, { backgroundColor: paleta.dialogoBoton, marginBottom: 24 + margenes.bottom }]}
          accessibilityRole="button"
          accessibilityLabel="Recordarle por WhatsApp"
          onPress={() => {
            void Linking.openURL(
              enlaceWhatsApp(compromiso.telefono, mensajeRecordatorio(compromiso, pendiente, hoy)),
            );
          }}
        >
          <Text style={[estilos.accionTexto, { color: paleta.texto }]}>Recordarle</Text>
        </Pressable>
      ) : null}

      <ModalAbono
        visible={modalAbono}
        alCerrar={() => setModalAbono(false)}
        compromiso={compromiso}
        transacciones={transacciones}
      />

      <Modal
        visible={menu}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMenu(false)}
      >
        <View style={estilos.fondoDialogo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cerrar"
            onPress={() => setMenu(false)}
          />
          <View style={estilos.tarjetaMenu}>
            <Pressable
              style={estilos.itemMenu}
              accessibilityRole="button"
              accessibilityLabel="Editar"
              onPress={() => {
                setMenu(false);
                setModalEditar(true);
              }}
            >
              <Text style={[estilos.itemMenuTexto, { color: paleta.texto }]}>Editar</Text>
            </Pressable>
            {compromiso.direccion === 'me_deben' && abierto ? (
              <Pressable
                style={estilos.itemMenu}
                accessibilityRole="button"
                accessibilityLabel="Perdonar lo pendiente"
                onPress={() => {
                  setMenu(false);
                  setDialogo('perdonar');
                }}
              >
                <Text style={[estilos.itemMenuTexto, { color: paleta.texto }]}>Perdonar lo pendiente</Text>
              </Pressable>
            ) : null}
            {abierto ? (
              <Pressable
                style={estilos.itemMenu}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                onPress={() => {
                  setMenu(false);
                  setDialogo('cancelar');
                }}
              >
                <Text style={[estilos.itemMenuTexto, { color: paleta.texto }]}>Cancelar</Text>
              </Pressable>
            ) : null}
            {compromiso.cierre ? (
              <Pressable
                style={estilos.itemMenu}
                accessibilityRole="button"
                accessibilityLabel="Reabrir"
                disabled={trabajando}
                onPress={reabrir}
              >
                <Text style={[estilos.itemMenuTexto, { color: paleta.texto }]}>Reabrir</Text>
              </Pressable>
            ) : null}
            <View style={[estilos.lineaMenu, { backgroundColor: paleta.separador }]} />
            <Pressable
              style={estilos.itemMenu}
              accessibilityRole="button"
              accessibilityLabel="Borrar"
              onPress={() => {
                setMenu(false);
                setDialogo('borrar');
              }}
            >
              <Text style={[estilos.itemMenuTexto, { color: paleta.rojoMonto }]}>Borrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!dialogo}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDialogo(undefined)}
      >
        <View style={estilos.fondoDialogo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cerrar"
            onPress={() => setDialogo(undefined)}
          />
          <View style={estilos.tarjetaDialogo}>
            {dialogo === 'perdonar' ? (
              <>
                <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>
                  ¿Perdonar los $ {pendiente.toFixed(2)} que te debe {compromiso.contraparte}? El
                  préstamo se cierra y tu saldo no cambia.
                </Text>
                <View style={estilos.botonesDialogo}>
                  <Pressable
                    style={[estilos.botonDialogo, { backgroundColor: paleta.verdeAccion }]}
                    accessibilityRole="button"
                    accessibilityLabel="Perdonar"
                    disabled={trabajando}
                    onPress={perdonar}
                  >
                    <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Perdonar</Text>
                  </Pressable>
                  <Pressable
                    style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    disabled={trabajando}
                    onPress={() => setDialogo(undefined)}
                  >
                    <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Volver</Text>
                  </Pressable>
                </View>
              </>
            ) : dialogo === 'cancelar' ? (
              <>
                <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>
                  ¿Cancelar este compromiso? Se guarda en Cerrados con su historial.
                </Text>
                <View style={estilos.botonesDialogo}>
                  <Pressable
                    style={[estilos.botonDialogo, { backgroundColor: paleta.naranjaCartera }]}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar compromiso"
                    disabled={trabajando}
                    onPress={cancelar}
                  >
                    <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>
                      Cancelar compromiso
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    disabled={trabajando}
                    onPress={() => setDialogo(undefined)}
                  >
                    <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Volver</Text>
                  </Pressable>
                </View>
              </>
            ) : dialogo === 'borrar' ? (
              <>
                <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>
                  ¿Borrar el compromiso con {compromiso.contraparte}? Tiene {amarradas.length}{' '}
                  {amarradas.length === 1 ? 'transacción' : 'transacciones'}.
                </Text>
                <View style={estilos.botonesDialogo}>
                  {amarradas.length > 0 ? (
                    <Pressable
                      style={[estilos.botonDialogo, { backgroundColor: paleta.rojo }]}
                      accessibilityRole="button"
                      accessibilityLabel="Borrar también las transacciones"
                      disabled={trabajando}
                      onPress={() => borrar('todo')}
                    >
                      <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>
                        Borrar también las transacciones
                      </Text>
                    </Pressable>
                  ) : null}
                  {amarradas.length > 0 ? (
                    <Pressable
                      style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                      accessibilityRole="button"
                      accessibilityLabel="Dejar las transacciones"
                      disabled={trabajando}
                      onPress={() => borrar('soltar')}
                    >
                      <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>
                        Dejar las transacciones
                      </Text>
                    </Pressable>
                  ) : null}
                  {amarradas.length === 0 ? (
                    <Pressable
                      style={[estilos.botonDialogo, { backgroundColor: paleta.rojo }]}
                      accessibilityRole="button"
                      accessibilityLabel="Borrar"
                      disabled={trabajando}
                      onPress={() => borrar('soltar')}
                    >
                      <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Borrar</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    disabled={trabajando}
                    onPress={() => setDialogo(undefined)}
                  >
                    <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Volver</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <ModalAgregarTransaccion
        visible={modalEditar}
        alCerrar={() => setModalEditar(false)}
        compromiso={compromiso}
      />
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
  contenido: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contenidoLista: {
    paddingHorizontal: 20,
    paddingBottom: 96,
  },
  lineaDatos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  dato: {
    fontSize: 15,
  },
  chipEstado: {
    backgroundColor: paleta.superficie,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  chipEstadoTexto: {
    color: paleta.texto,
    fontSize: 12,
    fontWeight: '600',
  },
  montos: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  montoCaja: {
    flex: 1,
    backgroundColor: paleta.superficie,
    borderRadius: 12,
    padding: 12,
  },
  montoEtiqueta: {
    fontSize: 12,
  },
  montoValor: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  barra: {
    height: 8,
    borderRadius: 4,
    backgroundColor: paleta.barraFantasma,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barraLlena: {
    height: '100%',
    borderRadius: 4,
  },
  linea: {
    fontSize: 14,
    paddingVertical: 4,
  },
  seccion: {
    fontSize: 13,
    paddingTop: 14,
    paddingBottom: 6,
  },
  filaAbono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  abonoFecha: {
    fontSize: 13,
    flex: 1,
  },
  abonoMonto: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  abonoCartera: {
    fontSize: 13,
    maxWidth: 120,
  },
  vacio: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 24,
  },
  menuPuntos: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  fondoDialogo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
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
  botonesDialogo: {
    gap: 12,
    marginTop: 20,
  },
  botonDialogo: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDialogoTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
  tarjetaMenu: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 14,
    backgroundColor: paleta.dialogo,
    paddingVertical: 6,
  },
  itemMenu: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  itemMenuTexto: {
    fontSize: 15,
  },
  lineaMenu: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  accion: {
    borderRadius: 14,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  accionTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
