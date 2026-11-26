import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Esqueleto } from '../animaciones/Esqueleto';
import { useCarteras } from '../datos/useCarteras';
import { useCompromisos } from '../datos/useCompromisos';
import { useTransacciones } from '../datos/useTransacciones';
import { deISO, hoyISO } from '../transacciones/fechas';
import { paleta } from '../tema/colores';
import { abonadoDe, abonosDe, diasDeAtraso, estadoDe, pendienteDe } from './calculos';
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

// Detalle de un compromiso (spec #130, issue #133): todo en vivo, sin
// escribir nada. Los botones llegan en #134, #135 y #137.
export function PantallaDetalleCompromiso({ id }: { id: string }) {
  const [modalAbono, setModalAbono] = useState(false);
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
  const progreso = compromiso.monto > 0 ? Math.min(1, abonado / compromiso.monto) : 0;
  const origen = transacciones.find((t) => t.compromiso_id === compromiso.id && t.rol === 'origen');
  const carteraOrigen = origen?.cartera_id
    ? carteras.find((cartera) => cartera.id === origen.cartera_id)
    : undefined;
  const abonos = abonosDe(compromiso.id ?? '', transacciones).slice().reverse();
  const vencido = estado === 'vencido';
  const abierto = estado === 'activo' || estado === 'vencido';

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
        <View style={estilos.ranura} />
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
            <Text style={[estilos.montoValor, { color: paleta.texto }]}>$ {compromiso.monto.toFixed(2)}</Text>
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

        <Text style={[estilos.linea, { color: paleta.textoSuave }]}>
          {compromiso.vence ? `Vence: ${diaLargo(compromiso.vence)}` : 'Sin fecha'}
          {vencido ? ` · Atrasado · ${diasDeAtraso(compromiso.vence ?? hoy, hoy)} días` : ''}
        </Text>

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
          style={[estilos.accion, { backgroundColor: paleta.verdeAccion, marginBottom: 24 + margenes.bottom }]}
          accessibilityRole="button"
          accessibilityLabel={compromiso.direccion === 'me_deben' ? 'Registrar cobro' : 'Registrar pago'}
          onPress={() => setModalAbono(true)}
        >
          <Text style={estilos.accionTexto}>
            {compromiso.direccion === 'me_deben' ? 'Registrar cobro' : 'Registrar pago'}
          </Text>
        </Pressable>
      ) : null}

      <ModalAbono
        visible={modalAbono}
        alCerrar={() => setModalAbono(false)}
        compromiso={compromiso}
        transacciones={transacciones}
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
