import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { paleta } from '../tema/colores';
import { hoyISO } from '../transacciones/fechas';
import { estaAbierto, estadoDe, proximosVencimientos, resumenCompromisos } from './calculos';
import type { Compromiso } from '../datos/compromisos';
import type { Transaccion } from '../datos/transacciones';
import type { Vencimiento } from './calculos';

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type Props = {
  compromisos: Compromiso[];
  transacciones: Transaccion[];
};

// Etiqueta de la fila: «Atrasado · N días» en rojo, «Vence hoy» en
// amarillo o «Vence 19 dic» para lo que viene.
function etiquetaDe(vencimiento: Vencimiento): { texto: string; color: string } {
  if (vencimiento.situacion === 'atrasado') {
    const dias = vencimiento.diasAtraso === 1 ? '1 día' : `${vencimiento.diasAtraso} días`;
    return { texto: `Atrasado · ${dias}`, color: paleta.rojoMonto };
  }
  if (vencimiento.situacion === 'hoy') {
    return { texto: 'Vence hoy', color: paleta.amarilloCambio };
  }
  const [, mes, dia] = vencimiento.fecha.split('-').map(Number);
  return { texto: `Vence ${dia} ${MESES_CORTOS[mes - 1]}`, color: paleta.textoSuave };
}

// Tarjeta de vencimientos de Inicio (#137): lo atrasado, lo que vence hoy y
// lo de los próximos 7 días, en las dos direcciones, con los totales arriba.
// Tocar «Ver todo» abre la lista y cada fila, su detalle. Sin compromisos
// abiertos, la tarjeta entera lleva a /deudas.
export function TarjetaVencimientos({ compromisos, transacciones }: Props) {
  const enrutador = useRouter();
  const hoy = hoyISO();
  const abiertos = compromisos.filter((c) => estaAbierto(estadoDe(c, transacciones, hoy)));
  const resumen = resumenCompromisos(compromisos, transacciones, hoy);
  const vencimientos = proximosVencimientos(compromisos, transacciones, hoy).slice(0, 3);

  return (
    <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
      <View style={estilos.tarjetaCabecera}>
        <Text style={[estilos.tarjetaTitulo, { color: paleta.texto }]}>Deudas y préstamos</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver todo, Deudas y préstamos"
          onPress={() => enrutador.push('/deudas')}
          hitSlop={6}
        >
          <Text style={[estilos.enlace, { color: paleta.verdeAccion }]}>Ver todo</Text>
        </Pressable>
      </View>
      <View style={[estilos.divisor, { backgroundColor: paleta.dialogo }]} />
      {abiertos.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a Deudas y préstamos"
          onPress={() => enrutador.push('/deudas')}
          hitSlop={4}
        >
          <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>
            Sin deudas ni préstamos activos
          </Text>
        </Pressable>
      ) : (
        <>
          <Text style={[estilos.totales, { color: paleta.textoSuave }]}>
            Me deben ${resumen.meDeben.toFixed(2)} · Debo ${resumen.debo.toFixed(2)}
          </Text>
          {vencimientos.length === 0 ? (
            <Text style={[estilos.vacio, { color: paleta.textoSuave }]}>Nada vence esta semana</Text>
          ) : (
            vencimientos.map((vencimiento) => {
              const etiqueta = etiquetaDe(vencimiento);
              return (
                <Pressable
                  key={vencimiento.compromiso.id}
                  style={estilos.fila}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${vencimiento.compromiso.contraparte}`}
                  onPress={() => enrutador.push(`/deudas/${vencimiento.compromiso.id}`)}
                >
                  <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
                    {vencimiento.compromiso.contraparte}
                  </Text>
                  <Text style={[estilos.monto, { color: paleta.texto }]}>
                    {vencimiento.compromiso.direccion === 'me_deben' ? 'Te debe' : 'Le debés'} $
                    {vencimiento.pendiente.toFixed(2)}
                  </Text>
                  <Text style={[estilos.etiqueta, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                </Pressable>
              );
            })
          )}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
  },
  tarjetaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tarjetaTitulo: {
    fontSize: 19,
    fontWeight: '700',
  },
  enlace: {
    fontSize: 16,
    fontWeight: '700',
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  totales: {
    fontSize: 14,
    marginTop: 12,
  },
  vacio: {
    fontSize: 14,
    marginTop: 12,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  nombre: {
    flex: 1,
    fontSize: 15,
  },
  monto: {
    fontSize: 14,
    marginRight: 10,
  },
  etiqueta: {
    fontSize: 13,
    fontWeight: '600',
  },
});
