import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useTransacciones } from '../datos/useTransacciones';
import { useCarteras } from '../datos/useCarteras';
import { useCategorias } from '../datos/useCategorias';
import type { Cartera } from '../datos/carteras';
import type { Transaccion } from '../datos/transacciones';
import { GlifoCategoria } from '../categorias/GlifoCategoria';
import { aspectoDe } from '../categorias/mapaCategorias';
import { DIAS_ABREV, DIAS_SEMANA, MESES, aISO, deISO, hoyISO } from './fechas';
import { CalendarioTransacciones } from './CalendarioTransacciones';
import { SelectorCartera } from './SelectorCartera';

// Ancho fijo de cada día de la tira, para poder alinear el día activo.
const ANCHO_DIA = 62;

// Pantalla real del tab Transacciones (T009), copiada de
// Assets/transacciones/modelo-pantalla-transacciones.png
// (kodigo-grupo-12/.github): cabecera con ayuda (?) y selector de cartera en
// pastilla, saldo real y fijo, tira horizontal de días con el botón »»,
// resumen del día (Entrada azul / Salida roja), encabezado del día y filas
// de solo lectura con montos coloreados como MoneyLover. Inicio no se toca:
// editar y eliminar siguen viviendo ahí (ADR-0012).
export function PantallaTransacciones() {
  const margenes = useSafeAreaInsets();
  const { transacciones } = useTransacciones();
  const { carteras } = useCarteras();
  const { categorias } = useCategorias();

  // El día que se está viendo arranca en hoy; la tira y el calendario lo
  // mueven. Sin cartera elegida se ve el Total.
  const [diaISO, setDiaISO] = useState<string>(hoyISO());
  const [carteraId, setCarteraId] = useState<string>();
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const nombresDeCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));

  // Saldo real calculado (regla de la T007): nunca se guarda, se agrega en
  // vivo desde el snapshot. Con cartera elegida vale solo su cartera_id; el
  // Total suma todas las transacciones. Es fijo: navegar entre días no lo
  // toca, porque dice cuánto hay HOY.
  const saldoDe = (cartera: Cartera): number =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.cartera_id === cartera.id
          ? total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto)
          : total,
      0,
    );
  const saldoTotal = transacciones.reduce(
    (total, transaccion) => total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto),
    0,
  );
  const carteraElegida = carteras.find((cartera) => cartera.id === carteraId);
  const saldo = carteraElegida ? saldoDe(carteraElegida) : saldoTotal;

  // Resumen del día seleccionado para el filtro actual.
  const delFiltro = carteraElegida
    ? transacciones.filter((transaccion) => transaccion.cartera_id === carteraElegida.id)
    : transacciones;
  const delDia = delFiltro.filter((transaccion) => transaccion.fecha === diaISO);
  const entrada = delDia
    .filter((transaccion) => transaccion.tipo === 'ingreso')
    .reduce((suma, transaccion) => suma + transaccion.monto, 0);
  const salida = delDia
    .filter((transaccion) => transaccion.tipo === 'gasto')
    .reduce((suma, transaccion) => suma + transaccion.monto, 0);
  const totalDia = entrada - salida;

  // Rango de la tira: de 5 días antes de la última transacción hasta hoy.
  // Un día elegido desde el calendario puede quedar fuera de esa base
  // (ADR-0014): el rango se estira para contenerlo sin mover la base.
  const hoy = hoyISO();
  const hoyFecha = deISO(hoy);
  const elegidoFecha = deISO(diaISO);
  const ultima = transacciones.reduce<string | undefined>(
    (max, transaccion) => (transaccion.fecha > (max ?? '') ? transaccion.fecha : max),
    undefined,
  );
  const ancla = ultima ? deISO(ultima) : hoyFecha;
  const base = new Date(ancla);
  base.setDate(base.getDate() - 5);
  const inicioFecha = base < elegidoFecha ? base : elegidoFecha;
  const inicioAjustado = inicioFecha > hoyFecha ? hoyFecha : inicioFecha;
  const finFecha = elegidoFecha > hoyFecha ? elegidoFecha : hoyFecha;
  const dias: string[] = [];
  for (const cursor = new Date(inicioAjustado); cursor <= finFecha; cursor.setDate(cursor.getDate() + 1)) {
    dias.push(aISO(cursor));
  }

  // La tira se alinea sobre el día activo al cambiar de día.
  const refDias = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    const indice = dias.indexOf(diaISO);
    if (indice >= 0) {
      refDias.current?.scrollTo({ x: indice * ANCHO_DIA, animated: true });
    }
    // La longitud del rango basta: si cambia, el índice del día activo
    // también lo hizo.
  }, [diaISO, dias.length]);

  return (
    <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <View style={estilos.cabecera}>
        {/* El modelo trae la ayuda (?) a la izquierda; sin acción pedida. */}
        <View style={estilos.ayuda}>
          <View style={estilos.ayudaCirculo}>
            <Text style={[estilos.ayudaSigno, { color: paleta.texto }]}>?</Text>
          </View>
        </View>
        <View style={estilos.ranuraCentral}>
          <Pressable
            style={estilos.pastilla}
            accessibilityRole="button"
            accessibilityLabel="Seleccionar cartera"
            onPress={() => setSelectorAbierto(true)}
          >
            <GlifoBilleteraLinea />
            <Text style={[estilos.pastillaTexto, { color: paleta.texto }]} numberOfLines={1}>
              {carteraElegida ? carteraElegida.nombre : 'Total'}
            </Text>
            <View style={estilos.pastillaChevron} />
          </Pressable>
        </View>
        <View style={estilos.ranura} />
      </View>

      <Text style={[estilos.etiquetaSaldo, { color: paleta.textoSuave }]}>Saldo</Text>
      <Text style={[estilos.saldo, { color: paleta.texto }]}>
        {saldo < 0 ? '-' : ''}$ {Math.abs(saldo).toFixed(2)}
      </Text>

      <View style={estilos.filaDias}>
        <ScrollView
          ref={refDias}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.tiraDias}
        >
          {dias.map((iso) => {
            const activo = iso === diaISO;
            const fecha = deISO(iso);
            return (
              <Pressable
                key={iso}
                style={estilos.dia}
                accessibilityRole="button"
                accessibilityLabel={`Día ${iso}`}
                accessibilityState={{ selected: activo }}
                onPress={() => setDiaISO(iso)}
              >
                <Text
                  style={[
                    estilos.diaTexto,
                    {
                      color: activo ? paleta.texto : paleta.textoSuave,
                      fontWeight: activo ? '700' : '400',
                    },
                  ]}
                >
                  {DIAS_ABREV[fecha.getDay()]} {`${fecha.getDate()}`.padStart(2, '0')}
                </Text>
                {activo ? <View style={estilos.diaSubrayado} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          style={estilos.volverHoy}
          accessibilityRole="button"
          accessibilityLabel="Volver a hoy"
          onPress={() => setDiaISO(hoyISO())}
        >
          <Text style={[estilos.volverHoyTexto, { color: paleta.texto }]}>»»</Text>
        </Pressable>
      </View>

      <View style={estilos.resumen}>
        <View style={estilos.filaResumen}>
          <Text style={[estilos.resumenEtiqueta, { color: paleta.textoSuave }]}>Entrada</Text>
          <Text style={[estilos.resumenValor, { color: paleta.azulMonto }]}>{entrada.toFixed(2)}</Text>
        </View>
        <View style={estilos.filaResumen}>
          <Text style={[estilos.resumenEtiqueta, { color: paleta.textoSuave }]}>Salida</Text>
          <Text style={[estilos.resumenValor, { color: paleta.rojoMonto }]}>{salida.toFixed(2)}</Text>
        </View>
        <View style={estilos.lineaResumen} />
        <Text style={[estilos.resumenTotal, { color: paleta.texto }]}>
          {totalDia < 0 ? '-' : ''}
          {Math.abs(totalDia).toFixed(2)}
        </Text>
      </View>

      <Pressable
        style={estilos.calendario}
        accessibilityRole="button"
        accessibilityLabel="Mostrar calendario"
        onPress={() => setCalendarioAbierto(true)}
      >
        <GlifoCalendario />
        <Text style={[estilos.calendarioTexto, { color: paleta.verdeAccion }]}>Mostrar calendario</Text>
      </Pressable>

      <View style={estilos.bloqueDia}>
        <View style={estilos.linea} />
        <View style={estilos.encabezadoDia}>
          <Text style={[estilos.diaNumero, { color: paleta.texto }]}>{deISO(diaISO).getDate()}</Text>
          <View style={estilos.diaLeyenda}>
            <Text style={[estilos.diaSemana, { color: paleta.textoSuave }]}>
              {DIAS_SEMANA[deISO(diaISO).getDay()]}
            </Text>
            <Text style={[estilos.diaMes, { color: paleta.textoSuave }]}>
              {MESES[deISO(diaISO).getMonth()]} {deISO(diaISO).getFullYear()}
            </Text>
          </View>
          <Text style={[estilos.diaTotal, { color: paleta.texto }]}>
            {totalDia < 0 ? '-' : ''}
            {Math.abs(totalDia).toFixed(2)}
          </Text>
        </View>
        <View style={estilos.linea} />
        <ScrollView style={estilos.lista} contentContainerStyle={estilos.listaContenido}>
          {delDia.map((transaccion) => (
            <FilaTransaccion
              key={transaccion.id ?? `${transaccion.fecha}-${transaccion.monto}`}
              transaccion={transaccion}
              nombreCategoria={
                transaccion.categoria_id ? nombresDeCategoria.get(transaccion.categoria_id) : undefined
              }
            />
          ))}
        </ScrollView>
      </View>

      <CalendarioTransacciones
        visible={calendarioAbierto}
        diaISO={diaISO}
        transacciones={delFiltro}
        alCerrar={() => setCalendarioAbierto(false)}
        alSeleccionar={(iso) => {
          setDiaISO(iso);
          setCalendarioAbierto(false);
        }}
      />

      <SelectorCartera
        visible={selectorAbierto}
        carteras={carteras}
        transacciones={transacciones}
        seleccionadaId={carteraId}
        alCerrar={() => setSelectorAbierto(false)}
        alSeleccionar={(id) => {
          setCarteraId(id);
          setSelectorAbierto(false);
        }}
      />
    </View>
  );
}

// Fila de solo lectura (T009): tocarla no hace nada; editar y eliminar
// siguen en Inicio según la T008. Glifo y color vienen del mapa fijo de la
// T007; el monto se colorea como MoneyLover solo en esta pantalla.
function FilaTransaccion({
  transaccion,
  nombreCategoria,
}: {
  transaccion: Transaccion;
  nombreCategoria?: string;
}) {
  const titulo =
    nombreCategoria ?? transaccion.categoria ?? (transaccion.tipo === 'ingreso' ? 'Ingreso' : 'Gasto');

  return (
    <View style={estilos.fila}>
      <View style={estilos.filaCirculo}>
        <View style={estilos.filaGlifoEscala}>
          <GlifoCategoria nombre={titulo} />
        </View>
      </View>
      <View style={estilos.filaTextos}>
        <Text style={[estilos.filaTitulo, { color: paleta.texto }]} numberOfLines={1}>
          {titulo}
        </Text>
        {transaccion.nota ? (
          <Text style={[estilos.filaNota, { color: paleta.textoSuave }]} numberOfLines={1}>
            {transaccion.nota}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          estilos.filaMonto,
          { color: transaccion.tipo === 'ingreso' ? paleta.azulMonto : paleta.rojoMonto },
        ]}
      >
        ${transaccion.monto.toFixed(2)}
      </Text>
    </View>
  );
}

// Calendario mini para la acción verde, dibujado con vistas como el resto
// de los glifos (T004): Expo SDK 58 ya no trae un set de iconos.
function GlifoCalendario() {
  const verde = paleta.verdeAccion;

  return (
    <View style={estilos.calendarioGlifo}>
      <View style={[estilos.calendarioPata, { backgroundColor: verde, left: 4 }]} />
      <View style={[estilos.calendarioPata, { backgroundColor: verde, left: 11 }]} />
      <View style={[estilos.calendarioMarco, { borderColor: verde }]} />
      <View style={[estilos.calendarioLinea, { backgroundColor: verde }]} />
      <View style={[estilos.calendarioPunto, { backgroundColor: verde, left: 3.5 }]} />
      <View style={[estilos.calendarioPunto, { backgroundColor: verde, left: 7.5 }]} />
      <View style={[estilos.calendarioPunto, { backgroundColor: verde, left: 11.5 }]} />
    </View>
  );
}

// Billetera en línea para la pastilla del selector, dibujada con vistas como
// el resto de los glifos (T004): Expo SDK 58 ya no trae un set de iconos.
function GlifoBilleteraLinea() {
  return (
    <View style={estilos.billeteraLinea}>
      <View style={estilos.billeteraCuerpo} />
      <View style={estilos.billeteraPunto} />
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
  },
  ayuda: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayudaCirculo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayudaSigno: {
    fontSize: 16,
    fontWeight: '600',
  },
  ranuraCentral: {
    flex: 1,
    alignItems: 'center',
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: paleta.dialogo,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 16,
    maxWidth: 230,
  },
  pastillaTexto: {
    fontSize: 17,
    fontWeight: '700',
  },
  pastillaChevron: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
    marginTop: -3,
  },
  etiquetaSaldo: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  saldo: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  filaDias: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  tiraDias: {
    paddingHorizontal: 8,
  },
  dia: {
    width: ANCHO_DIA,
    alignItems: 'center',
  },
  diaTexto: {
    fontSize: 16,
  },
  diaSubrayado: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: paleta.texto,
    marginTop: 5,
  },
  volverHoy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: paleta.dialogo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  volverHoyTexto: {
    fontSize: 15,
    fontWeight: '700',
  },
  resumen: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  resumenEtiqueta: {
    fontSize: 17,
  },
  resumenValor: {
    fontSize: 19,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lineaResumen: {
    height: 1.5,
    borderRadius: 1,
    backgroundColor: paleta.lineaResumen,
    width: '55%',
    alignSelf: 'flex-end',
    marginVertical: 6,
  },
  resumenTotal: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  calendario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 22,
  },
  calendarioTexto: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarioGlifo: {
    width: 17,
    height: 15,
  },
  calendarioPata: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 3,
    borderRadius: 1,
  },
  calendarioMarco: {
    position: 'absolute',
    top: 2,
    width: 17,
    height: 13,
    borderRadius: 3,
    borderWidth: 2,
  },
  calendarioLinea: {
    position: 'absolute',
    top: 6,
    left: 2.5,
    width: 12,
    height: 1.5,
  },
  calendarioPunto: {
    position: 'absolute',
    top: 9,
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  bloqueDia: {
    flex: 1,
    marginTop: 24,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: paleta.separador,
  },
  encabezadoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  diaNumero: {
    fontSize: 30,
    fontWeight: '700',
    marginRight: 10,
    fontVariant: ['tabular-nums'],
  },
  diaLeyenda: {
    flex: 1,
  },
  diaSemana: {
    fontSize: 15,
  },
  diaMes: {
    fontSize: 15,
    marginTop: 1,
  },
  diaTotal: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingBottom: 24,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: paleta.separador,
  },
  filaCirculo: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaGlifoEscala: {
    transform: [{ scale: 1.45 }],
  },
  filaTextos: {
    flex: 1,
    marginLeft: 12,
  },
  filaTitulo: {
    fontSize: 17,
    fontWeight: '700',
  },
  filaNota: {
    fontSize: 14,
    marginTop: 2,
  },
  filaMonto: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  billeteraLinea: {
    width: 18,
    height: 13,
  },
  billeteraCuerpo: {
    width: 18,
    height: 12,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: paleta.texto,
  },
  billeteraPunto: {
    position: 'absolute',
    right: 3,
    top: 4.5,
    width: 4,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: paleta.texto,
  },
});
