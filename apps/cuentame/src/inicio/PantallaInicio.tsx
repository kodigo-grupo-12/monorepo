import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useTransacciones } from '../datos/useTransacciones';
import { useCategorias } from '../datos/useCategorias';
import { useCarteras } from '../datos/useCarteras';
import { eliminarTransaccion } from '../datos/transacciones';
import type { Transaccion } from '../datos/transacciones';
import { ModalAgregarTransaccion } from '../transacciones/ModalAgregarTransaccion';
import { IconoBilletera } from '../carteras/IconoBilletera';
import { GlifoCategoria } from '../categorias/GlifoCategoria';
import { MESES, aISO, deISO } from '../transacciones/fechas';

type Periodo = 'semana' | 'mes';

const MONTOS_OCULTOS = '$ *****';
const DURACION_MS = 180;
const VISIBLE_MS = 2000;
const controladorNativo = Platform.OS !== 'web';

export function PantallaInicio() {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando } = useTransacciones();
  const { categorias } = useCategorias();
  const { carteras } = useCarteras();
  const nombresDeCategoria = new Map(categorias.map((categoria) => [categoria.id, categoria.nombre]));

  // El ojito (T010): alterna montos ↔ ***** en todo el Inicio por
  // privacidad. Estado local de sesión, nunca guardado.
  const [montosVisibles, setMontosVisibles] = useState(true);
  const [periodoGrafico, setPeriodoGrafico] = useState<Periodo>('semana');
  const [periodoGasto, setPeriodoGasto] = useState<Periodo>('mes');

  // La papelera marca la transacción; el diálogo decide. Cancelar no toca
  // nada y no hay deshacer (ADR-0012).
  const [pendiente, setPendiente] = useState<Transaccion>();
  const [eliminando, setEliminando] = useState(false);
  // Tocar la fila (fuera de la papelera) abre el modal en modo edición con
  // el documento precargado (ADR-0012).
  const [seleccionada, setSeleccionada] = useState<Transaccion>();

  // Toast «En desarrollo» (T005), para los enlaces que no construyen
  // pantalla en esta pasada.
  const opacidadToast = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);

  function lanzarToast() {
    setToastVisible(true);
    opacidadToast.setValue(0);
    Animated.timing(opacidadToast, {
      toValue: 1,
      duration: DURACION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: controladorNativo,
    }).start();
    setTimeout(() => {
      Animated.timing(opacidadToast, {
        toValue: 0,
        duration: DURACION_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: controladorNativo,
      }).start(() => setToastVisible(false));
    }, VISIBLE_MS);
  }

  async function confirmarEliminacion() {
    if (!pendiente?.id || eliminando) {
      return;
    }
    setEliminando(true);
    try {
      await eliminarTransaccion(pendiente.id);
      setPendiente(undefined);
    } finally {
      setEliminando(false);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => suscripcion.remove();
    }

    if (typeof window === 'undefined') {
      return;
    }

    const quedarse = () => {
      if (window.location.pathname.includes('login')) {
        enrutador.replace('/');
      }
    };

    window.addEventListener('popstate', quedarse);

    return () => {
      window.removeEventListener('popstate', quedarse);
    };
  }, [enrutador]);

  // ADR-0011: el saldo nunca vive en el documento, se agrega en vivo desde
  // el snapshot. Balance total = todas las transacciones; cada cartera, las
  // suyas.
  const saldoTotal = transacciones.reduce(
    (total, transaccion) => total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto),
    0,
  );
  const saldoDeCartera = (carteraId: string): number =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.cartera_id === carteraId
          ? total + (transaccion.tipo === 'ingreso' ? transaccion.monto : -transaccion.monto)
          : total,
      0,
    );
  // Períodos del gráfico y del Mayor gasto (T010): la semana en curso
  // (lunes a domingo, 7 barras) y el mes en curso (una barra por día). El
  // período anterior es el mismo rango corrido atrás, para el porcentaje.
  const diasDe = (periodo: Periodo, base: Date): string[] => {
    if (periodo === 'semana') {
      const desplazamiento = (base.getDay() + 6) % 7;
      const lunes = new Date(base.getFullYear(), base.getMonth(), base.getDate() - desplazamiento);
      return Array.from({ length: 7 }, (_, indice) =>
        aISO(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + indice)),
      );
    }
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, indice) =>
      aISO(new Date(base.getFullYear(), base.getMonth(), indice + 1)),
    );
  };
  const dias = diasDe(periodoGrafico, new Date());
  const diasAnteriores = diasDe(
    periodoGrafico,
    periodoGrafico === 'semana'
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
  );
  const enConjunto = new Set(dias);
  const enConjuntoAnterior = new Set(diasAnteriores);
  const gastoEn = (conjunto: Set<string>): number =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.tipo === 'gasto' && conjunto.has(transaccion.fecha) ? total + transaccion.monto : total,
      0,
    );
  const gastoActual = gastoEn(enConjunto);
  const gastoAnterior = gastoEn(enConjuntoAnterior);
  const gastoPorDia = dias.map((iso) =>
    transacciones.reduce(
      (total, transaccion) =>
        transaccion.tipo === 'gasto' && transaccion.fecha === iso ? total + transaccion.monto : total,
      0,
    ),
  );
  const topeDia = Math.max(...gastoPorDia, 0);
  // Sin datos previos el modelo muestra − 0%: mismo tratamiento cuando el
  // porcentaje da cero.
  const porcentaje = gastoAnterior > 0 ? Math.round(((gastoActual - gastoAnterior) / gastoAnterior) * 100) : 0;
  const textoPorcentaje = porcentaje > 0 ? `+ ${porcentaje}%` : `− ${Math.abs(porcentaje)}%`;

  // Mayor gasto: top 3 de categorías por porcentaje del gasto del período.
  const conjuntoGasto = new Set(diasDe(periodoGasto, new Date()));
  const gastoPorCategoria = new Map<string, number>();
  let gastoTotalGasto = 0;
  for (const transaccion of transacciones) {
    if (transaccion.tipo !== 'gasto' || !conjuntoGasto.has(transaccion.fecha)) {
      continue;
    }
    const clave = transaccion.categoria_id ?? transaccion.categoria ?? 'Otros gastos';
    gastoPorCategoria.set(clave, (gastoPorCategoria.get(clave) ?? 0) + transaccion.monto);
    gastoTotalGasto += transaccion.monto;
  }
  const mayorGasto = [...gastoPorCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([clave, monto]) => ({
      nombre:
        (clave.includes('-') ? nombresDeCategoria.get(clave) : undefined) ?? clave,
      porcentaje: gastoTotalGasto > 0 ? Math.round((monto / gastoTotalGasto) * 100) : 0,
    }));

  const recientes = transacciones.slice(0, 5);

  const saldoTexto = (monto: number): string =>
    montosVisibles ? `$ ${monto < 0 ? '-' : ''}${Math.abs(monto).toFixed(2)}` : MONTOS_OCULTOS;

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <ScrollView contentContainerStyle={estilos.lista}>
        {/* Header: saldo real de hoy con el ojito a la derecha y Balance
            total debajo. SIN lupa y SIN campana (fuera por tiempo). */}
        <View style={estilos.encabezado}>
          <Text style={[estilos.saldo, { color: paleta.texto }]}>{saldoTexto(saldoTotal)}</Text>
          <Pressable
            style={estilos.ojitoBoton}
            accessibilityRole="button"
            accessibilityLabel={montosVisibles ? 'Ocultar montos' : 'Mostrar montos'}
            accessibilityState={{ selected: !montosVisibles }}
            onPress={() => setMontosVisibles(!montosVisibles)}
            hitSlop={8}
          >
            <GlifoOjo />
          </Pressable>
        </View>
        <Text style={[estilos.balanceTexto, { color: paleta.textoSuave }]}>Balance total</Text>

        {/* Tarjeta Mis carteras: una fila por cartera con su icono, nombre
            y saldo. Ver todo navega a la pantalla Mis carteras de Cuenta
            (T007). */}
        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <View style={estilos.tarjetaCabecera}>
            <Text style={[estilos.tarjetaTitulo, { color: paleta.texto }]}>Mis carteras</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver todo, Mis carteras"
              onPress={() => enrutador.push('/carteras')}
              hitSlop={6}
            >
              <Text style={[estilos.enlace, { color: paleta.verdeAccion }]}>Ver todo</Text>
            </Pressable>
          </View>
          <View style={[estilos.divisor, { backgroundColor: paleta.dialogo }]} />
          {carteras.map((cartera) => (
            <View key={cartera.id ?? cartera.nombre} style={estilos.filaCartera}>
              <View style={estilos.iconoCartera}>
                <IconoBilletera fondo={paleta.naranjaCartera} />
              </View>
              <Text style={[estilos.nombreCartera, { color: paleta.texto }]} numberOfLines={1}>
                {cartera.nombre}
              </Text>
              <Text style={[estilos.saldoCartera, { color: paleta.texto }]}>
                {saldoTexto(saldoDeCartera(cartera.id ?? ''))}
              </Text>
            </View>
          ))}
        </View>

        {/* Reportar este mes: el enlace lanza el toast global; no hay
            pantalla de informes en esta pasada. */}
        <View style={estilos.seccionCabecera}>
          <Text style={[estilos.seccionTitulo, { color: paleta.textoSuave }]}>Reportar este mes</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver informes"
            onPress={lanzarToast}
            hitSlop={6}
          >
            <Text style={[estilos.enlace, { color: paleta.verdeAccion }]}>Ver informes</Text>
          </Pressable>
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <ToggleSegmentado valor={periodoGrafico} alCambiar={setPeriodoGrafico} />
          <Text style={[estilos.graficoTotal, { color: paleta.texto }]}>
            {montosVisibles ? `$ ${gastoActual.toFixed(2)}` : MONTOS_OCULTOS}
          </Text>
          <View style={estilos.graficoFila}>
            <Text style={[estilos.graficoEtiqueta, { color: paleta.textoSuave }]}>
              Total gastado {periodoGrafico === 'semana' ? 'esta semana' : 'este mes'}
            </Text>
            <Text style={[estilos.graficoPorcentaje, { color: paleta.amarilloCambio }]}>
              {textoPorcentaje}
            </Text>
          </View>
          {/* Vacío, como en el modelo: barras fantasma y el texto de
              invitación. Con datos, una barra verde por día. */}
          {gastoActual === 0 ? (
            <View style={estilos.graficoVacio}>
              <View style={estilos.graficoFantasmas}>
                <View style={[estilos.graficoFantasma, { backgroundColor: paleta.barraFantasma }]} />
                <View style={[estilos.graficoFantasma, { backgroundColor: paleta.barraFantasma }]} />
              </View>
              <Text style={[estilos.graficoVacioTexto, { color: paleta.textoSuave }]}>
                Introduzca las transacciones para ver el informe
              </Text>
            </View>
          ) : (
            <View style={estilos.graficoBarras}>
              {gastoPorDia.map((gasto, indice) => (
                <View
                  key={dias[indice]}
                  style={[
                    estilos.graficoBarra,
                    { height: topeDia > 0 ? Math.max(3, (gasto / topeDia) * 72) : 3, backgroundColor: paleta.verdeAccion },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Mayor gasto: top 3 de categorías con glifo y color del mapa fijo
            de la T007 y porcentaje en rojo. Ver detalles es toast. */}
        <View style={estilos.seccionCabecera}>
          <Text style={[estilos.seccionTitulo, { color: paleta.textoSuave }]}>Mayor gasto</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver detalles"
            onPress={lanzarToast}
            hitSlop={6}
          >
            <Text style={[estilos.enlace, { color: paleta.verdeAccion }]}>Ver detalles</Text>
          </Pressable>
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
          <ToggleSegmentado valor={periodoGasto} alCambiar={setPeriodoGasto} />
          {mayorGasto.map((entrada) => (
            <View key={entrada.nombre} style={estilos.filaGasto}>
              <GlifoCategoria nombre={entrada.nombre} />
              <Text style={[estilos.nombreGasto, { color: paleta.texto }]} numberOfLines={1}>
                {entrada.nombre}
              </Text>
              <Text style={[estilos.porcentajeGasto, { color: paleta.rojoMonto }]}>
                {entrada.porcentaje}%
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {toastVisible ? (
        <Animated.View style={[estilos.toast, { opacity: opacidadToast }]} pointerEvents="none">
          <Text style={[estilos.toastTexto, { color: paleta.texto }]}>En desarrollo</Text>
        </Animated.View>
      ) : null}

      <Modal
        visible={!!pendiente}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPendiente(undefined)}
      >
        <Pressable
          style={estilos.fondoDialogo}
          accessibilityLabel="Cerrar"
          onPress={() => setPendiente(undefined)}
        >
          <Pressable style={estilos.tarjetaDialogo}>
            <Text style={[estilos.tituloDialogo, { color: paleta.texto }]}>¿Eliminar transacción?</Text>
            {pendiente ? (
              <Text style={[estilos.detalleDialogo, { color: paleta.textoSuave }]} numberOfLines={1}>
                {pendiente.nota ?? (pendiente.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')} · ${pendiente.monto.toFixed(2)}
              </Text>
            ) : null}
            <View style={estilos.botonesDialogo}>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.rojo }]}
                accessibilityRole="button"
                accessibilityLabel="Eliminar"
                accessibilityState={{ disabled: eliminando }}
                disabled={eliminando}
                onPress={confirmarEliminacion}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Eliminar</Text>
              </Pressable>
              <Pressable
                style={[estilos.botonDialogo, { backgroundColor: paleta.dialogoBoton }]}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                accessibilityState={{ disabled: eliminando }}
                disabled={eliminando}
                onPress={() => setPendiente(undefined)}
              >
                <Text style={[estilos.botonDialogoTexto, { color: paleta.texto }]}>Cancelar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ModalAgregarTransaccion
        visible={!!seleccionada}
        alCerrar={() => setSeleccionada(undefined)}
        transaccion={seleccionada}
      />
    </View>
  );
}

// Toggle segmentado Semana/Mes (T010): el segmento activo lleva la pastilla
// clara sobre la tarjeta, como en el modelo.
function ToggleSegmentado({
  valor,
  alCambiar,
}: {
  valor: Periodo;
  alCambiar: (periodo: Periodo) => void;
}) {
  return (
    <View style={estilos.toggle}>
      {(['semana', 'mes'] as const).map((periodo) => (
        <Pressable
          key={periodo}
          style={[estilos.toggleSegmento, periodo === valor && { backgroundColor: paleta.dialogo }]}
          accessibilityRole="button"
          accessibilityLabel={periodo === 'semana' ? 'Semana' : 'Mes'}
          accessibilityState={{ selected: periodo === valor }}
          onPress={() => alCambiar(periodo)}
        >
          <Text
            style={[
              estilos.toggleTexto,
              { color: periodo === valor ? paleta.texto : paleta.textoSuave },
            ]}
          >
            {periodo === 'semana' ? 'Semana' : 'Mes'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// Ojito dibujado con vistas, como el resto de los glifos (T004): Expo SDK
// 58 ya no trae un set de iconos y no se agrega ninguna dependencia nueva.
function GlifoOjo() {
  return (
    <View style={estilos.ojito}>
      <View style={[estilos.ojitoPestana, { borderColor: paleta.textoSuave }]} />
      <View style={[estilos.ojitoPupila, { backgroundColor: paleta.textoSuave }]} />
    </View>
  );
}

// Fila de Transacciones recientes: círculo con glifo y color de la
// categoría (mapa fijo T007), título = categoría, subtítulo = fecha de la
// transacción y monto coloreado como MoneyLover (ingresos azul, gastos
// rojo). Con el ojito oculto el monto pasa a ***** conservando su color.
function FilaReciente({
  transaccion,
  nombreCategoria,
  montosVisibles,
  alEditar,
  alEliminar,
}: {
  transaccion: Transaccion;
  nombreCategoria?: string;
  montosVisibles: boolean;
  alEditar: () => void;
  alEliminar: () => void;
}) {
  const fecha = deISO(transaccion.fecha);

  return (
    <Pressable
      style={estilos.filaReciente}
      accessibilityRole="button"
      accessibilityLabel="Editar transacción"
      onPress={alEditar}
    >
      <GlifoCategoria nombre={nombreCategoria ?? transaccion.nota ?? ''} />
      <View style={estilos.detallesReciente}>
        <Text style={[estilos.tituloReciente, { color: paleta.texto }]} numberOfLines={1}>
          {nombreCategoria ?? transaccion.nota ?? (transaccion.tipo === 'ingreso' ? 'Ingreso' : 'Gasto')}
        </Text>
        <Text style={[estilos.fechaReciente, { color: paleta.textoSuave }]}>
          {fecha.getDate()} {MESES[fecha.getMonth()]} {fecha.getFullYear()}
        </Text>
      </View>
      <Pressable
        style={estilos.papeleraReciente}
        accessibilityRole="button"
        accessibilityLabel="Eliminar transacción"
        onPress={alEliminar}
        hitSlop={6}
      >
        <GlifoPapelera />
      </Pressable>
      <Text
        style={[
          estilos.montoReciente,
          { color: transaccion.tipo === 'ingreso' ? paleta.azulMonto : paleta.rojoMonto },
        ]}
      >
        {montosVisibles ? `$${transaccion.monto.toFixed(2)}` : MONTOS_OCULTOS}
      </Text>
    </Pressable>
  );
}

// Papelera dibujada con vistas, como quedó en la T004: Expo SDK 58 ya no
// trae un set de iconos y no se agrega ninguna dependencia nueva.
function GlifoPapelera() {
  const verde = paleta.verdeAccion;

  return (
    <View style={estilos.papelera}>
      <View style={[estilos.papeleraAsa, { backgroundColor: verde }]} />
      <View style={[estilos.papeleraTapa, { backgroundColor: verde }]} />
      <View style={[estilos.papeleraCuerpo, { borderColor: verde }]} />
      <View style={[estilos.papeleraLinea, { backgroundColor: verde, left: 7 }]} />
      <View style={[estilos.papeleraLinea, { backgroundColor: verde, left: 11 }]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  lista: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  saldo: {
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ojitoBoton: {
    marginLeft: 16,
    padding: 6,
  },
  ojito: {
    width: 24,
    height: 14,
  },
  ojitoPestana: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
  ojitoPupila: {
    position: 'absolute',
    left: 9,
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  balanceTexto: {
    fontSize: 15,
    marginTop: 2,
  },
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
  filaCartera: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  iconoCartera: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreCartera: {
    flex: 1,
    fontSize: 17,
    marginLeft: 10,
  },
  saldoCartera: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  seccionCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  seccionTitulo: {
    fontSize: 17,
  },
  toggle: {
    flexDirection: 'row',
    marginTop: 10,
  },
  toggleSegmento: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  toggleTexto: {
    fontSize: 16,
    fontWeight: '700',
  },
  graficoTotal: {
    fontSize: 36,
    fontWeight: '700',
    marginTop: 14,
    fontVariant: ['tabular-nums'],
  },
  graficoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  graficoEtiqueta: {
    flex: 1,
    fontSize: 15,
  },
  graficoPorcentaje: {
    fontSize: 16,
    fontWeight: '700',
  },
  graficoVacio: {
    alignItems: 'center',
    marginTop: 16,
  },
  graficoFantasmas: {
    flexDirection: 'row',
    gap: 26,
  },
  graficoFantasma: {
    width: 100,
    height: 64,
    borderRadius: 16,
  },
  graficoVacioTexto: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  graficoBarras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 76,
    marginTop: 16,
  },
  graficoBarra: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  filaGasto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  nombreGasto: {
    flex: 1,
    fontSize: 17,
    marginLeft: 12,
  },
  porcentajeGasto: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filaReciente: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  detallesReciente: {
    flex: 1,
    marginLeft: 10,
  },
  tituloReciente: {
    fontSize: 16,
    fontWeight: '700',
  },
  fechaReciente: {
    fontSize: 13,
    marginTop: 2,
  },
  papeleraReciente: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  montoReciente: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  papelera: {
    width: 20,
    height: 22,
  },
  papeleraAsa: {
    position: 'absolute',
    top: 0,
    left: 7,
    width: 6,
    height: 2,
    borderRadius: 1,
  },
  papeleraTapa: {
    position: 'absolute',
    top: 3,
    left: 0,
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  papeleraCuerpo: {
    position: 'absolute',
    top: 6,
    left: 3,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  papeleraLinea: {
    position: 'absolute',
    top: 9,
    width: 2,
    height: 7,
  },
  fondoDialogo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
  detalleDialogo: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  botonesDialogo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  botonDialogo: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDialogoTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
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
