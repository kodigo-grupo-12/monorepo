import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Esqueleto } from '../animaciones/Esqueleto';
import type { Compromiso } from '../datos/compromisos';
import type { Transaccion } from '../datos/transacciones';
import { useCompromisos } from '../datos/useCompromisos';
import { useTransacciones } from '../datos/useTransacciones';
import { deISO, hoyISO } from '../transacciones/fechas';
import { paleta } from '../tema/colores';
import { diasDeAtraso, estadoDe, ordenarParaLista, pendienteDe, resumenCompromisos } from './calculos';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function diaCorto(iso: string): string {
  const fecha = deISO(iso);
  return `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
}

// El texto del grupo Cerrados: pagado completo, perdonado o cancelado.
function textoDeCerrado(compromiso: Compromiso): string {
  if (compromiso.cierre === 'perdonado') {
    return 'Perdonado';
  }
  if (compromiso.cierre === 'cancelado') {
    return 'Cancelado';
  }
  return 'Pagado';
}

// Fila de la lista: contraparte y naturaleza, pendiente a dos decimales y,
// si ya pasó su vencimiento con pendiente, el badge rojo con los días.
function FilaCompromiso({
  compromiso,
  transacciones,
  hoy,
  alTocar,
}: {
  compromiso: Compromiso;
  transacciones: Transaccion[];
  hoy: string;
  alTocar: () => void;
}) {
  const pendiente = pendienteDe(compromiso, transacciones);
  const vencido = estadoDe(compromiso, transacciones, hoy) === 'vencido';
  return (
    <View>
      <Pressable
        style={estilos.fila}
        accessibilityRole="button"
        accessibilityLabel={`Compromiso con ${compromiso.contraparte}`}
        onPress={alTocar}
      >
        <View style={estilos.textos}>
          <View style={estilos.lineaPrincipal}>
            <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
              {compromiso.contraparte}
            </Text>
            <Text style={[estilos.etiqueta, { color: paleta.textoSuave }]}>
              {compromiso.naturaleza === 'dinero' ? 'Préstamo' : 'Compra'}
            </Text>
          </View>
          <Text style={[estilos.vence, { color: paleta.textoSuave }]}>
            {compromiso.vence ? `Vence ${diaCorto(compromiso.vence)}` : 'Sin fecha'}
          </Text>
        </View>
        <View style={estilos.lado}>
          {vencido ? (
            <View style={estilos.badge}>
              <Text style={estilos.badgeTexto}>
                Atrasado · {diasDeAtraso(compromiso.vence ?? hoy, hoy)} días
              </Text>
            </View>
          ) : null}
          <Text style={[estilos.pendiente, { color: paleta.texto }]}>$ {pendiente.toFixed(2)}</Text>
        </View>
      </Pressable>
      <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
    </View>
  );
}

// «Deudas y préstamos» (spec #130, issue #133): pantalla empujada del tab
// Cuenta con el navbar visible. Todo se lee en vivo de los compromisos y las
// transacciones; nada de lo que es suma se guarda (ADR-0019).
export function PantallaDeudas() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { compromisos, cargando } = useCompromisos();
  const { transacciones, cargando: cargandoTransacciones } = useTransacciones();
  const hoy = hoyISO();
  const [cerradosAbiertos, setCerradosAbiertos] = useState(false);

  const ocupado = cargando || cargandoTransacciones;
  const resumen = resumenCompromisos(compromisos, transacciones, hoy);
  const enLista = ordenarParaLista(compromisos, transacciones, hoy);
  const mios = enLista.filter((compromiso) => compromiso.direccion === 'me_deben');
  const ajenos = enLista.filter((compromiso) => compromiso.direccion === 'debo');
  const cerrados = compromisos.filter((compromiso) => {
    const estado = estadoDe(compromiso, transacciones, hoy);
    return estado === 'cerrado' || estado === 'perdonado' || estado === 'cancelado';
  });

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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Deudas y préstamos</Text>
        <View style={estilos.ranura} />
      </View>

      {ocupado ? (
        <View style={estilos.contenido}>
          <Esqueleto ancho="70%" alto={22} margen={8} />
          <Esqueleto ancho="45%" alto={22} margen={8} />
          {[0, 1, 2].map((linea) => (
            <Esqueleto key={linea} ancho="100%" alto={54} margen={10} />
          ))}
        </View>
      ) : compromisos.length === 0 ? (
        <View style={estilos.contenido}>
          <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>
            Sin deudas ni préstamos. Anotalos desde el + con «Deuda/Préstamo».
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={estilos.lista}>
          <View style={estilos.totales}>
            <Text style={[estilos.total, { color: paleta.azulMonto }]}>
              Me deben $ {resumen.meDeben.toFixed(2)}
            </Text>
            <Text style={[estilos.total, { color: paleta.rojoMonto }]}>
              Debo $ {resumen.debo.toFixed(2)}
            </Text>
          </View>

          {mios.length > 0 ? (
            <>
              <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>Me deben</Text>
              {mios.map((compromiso, indice) => (
                <FilaCompromiso
                  key={compromiso.id}
                  compromiso={compromiso}
                  transacciones={transacciones}
                  hoy={hoy}
                  alTocar={() => enrutador.push({ pathname: '/(sesion)/deudas/[id]', params: { id: compromiso.id ?? '' } })}
                />
              ))}
            </>
          ) : null}

          {ajenos.length > 0 ? (
            <>
              <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>Debo</Text>
              {ajenos.map((compromiso, indice) => (
                <FilaCompromiso
                  key={compromiso.id}
                  compromiso={compromiso}
                  transacciones={transacciones}
                  hoy={hoy}
                  alTocar={() => enrutador.push({ pathname: '/(sesion)/deudas/[id]', params: { id: compromiso.id ?? '' } })}
                />
              ))}
            </>
          ) : null}

          {cerrados.length > 0 ? (
            <>
              <Pressable
                style={estilos.cerradosBarra}
                accessibilityRole="button"
                accessibilityState={{ expanded: cerradosAbiertos }}
                accessibilityLabel="Cerrados"
                onPress={() => setCerradosAbiertos((antes) => !antes)}
              >
                <Text style={[estilos.seccion, { color: paleta.textoSuave }]}>
                  Cerrados ({cerrados.length})
                </Text>
                <View style={[estilos.chevron, cerradosAbiertos && { transform: [{ rotate: '90deg' }] }]} />
              </Pressable>
              {cerradosAbiertos
                ? cerrados.map((compromiso) => (
                    <FilaCompromiso
                      key={compromiso.id}
                      compromiso={compromiso}
                      transacciones={transacciones}
                      hoy={hoy}
                      alTocar={() =>
                        enrutador.push({ pathname: '/(sesion)/deudas/[id]', params: { id: compromiso.id ?? '' } })
                      }
                    />
                  ))
                : null}
            </>
          ) : null}
        </ScrollView>
      )}
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
  lista: {
    paddingBottom: 96,
  },
  totales: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  seccion: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  textos: {
    flex: 1,
  },
  lineaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nombre: {
    fontSize: 16,
    flexShrink: 1,
  },
  etiqueta: {
    fontSize: 12,
  },
  vence: {
    fontSize: 13,
    marginTop: 2,
  },
  lado: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    backgroundColor: paleta.rojoMonto,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTexto: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  pendiente: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  cerradosBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '-45deg' }],
  },
  vacio: {
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 24,
  },
});
