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
  Vibration,
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
import { IconoCartera } from '../carteras/IconoCartera';
import { GlifoCategoria } from '../categorias/GlifoCategoria';
import { DIAS_ABREV, MESES, aISO, deISO, hoyISO } from '../transacciones/fechas';
import { mostrarAviso } from '../avisos/avisos';
import { BannerSincronizacion } from '../avisos/BannerSincronizacion';
import { ContadorAnimado } from '../animaciones/ContadorAnimado';
import { Esqueleto } from '../animaciones/Esqueleto';
import { useAjustes } from '../ajustes/ProveedorAjustes';

type Periodo = 'semana' | 'mes';

const MONTOS_OCULTOS = '$ *****';
const DURACION_MS = 180;
const VISIBLE_MS = 2000;
const controladorNativo = Platform.OS !== 'web';

export function PantallaInicio() {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando, error } = useTransacciones();
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
  // el documento precargado (ADR-0012). El mismo modal, sin precarga,
  // sirve para anotar el primer gasto desde el gráfico vacío (T012, #117).
  const [seleccionada, setSeleccionada] = useState<Transaccion>();
  const [modalAbierto, setModalAbierto] = useState(false);

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
    Vibration.vibrate(10);
    setEliminando(true);
    try {
      await eliminarTransaccion(pendiente.id);
      setPendiente(undefined);
    } catch (error) {
      console.error('No se pudo eliminar la transacción:', error);
      mostrarAviso({
        mensaje: 'No se pudo eliminar',
        tipo: 'error',
        accion: { etiqueta: 'Reintentar', alTocar: () => void confirmarEliminacion() },
      });
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
  // Seguro para gastar hoy (T012, #118): (ingresos del mes − gastos del
  // mes) ÷ días restantes del mes, contando hoy. Un mes sin movimientos
  // da $0.00 y un resultado negativo se pisa en cero: nunca se sugiere
  // gastar dinero que no hay. El último día del mes el divisor es 1.
  const ahora = new Date();
  const inicioMesISO = aISO(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
  const finMesISO = aISO(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0));
  const delMes = transacciones.filter((t) => t.fecha >= inicioMesISO && t.fecha <= finMesISO);
  const ingresosMes = delMes.reduce((total, t) => (t.tipo === 'ingreso' ? total + t.monto : total), 0);
  const gastosMes = delMes.reduce((total, t) => (t.tipo === 'gasto' ? total + t.monto : total), 0);
  const diasRestantes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate() - ahora.getDate() + 1;
  const seguroHoy = Math.max(0, ingresosMes - gastosMes) / diasRestantes;
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
  // Promedio del período para la línea del gráfico (T012, #117).
  const promedioDia = gastoActual / dias.length;
  // Delta real (T012, #116): el gasto del período contra el inmediato
  // anterior de la misma longitud. Si ningún período tiene datos no se
  // inventa número: el delta simplemente no se muestra. Con el período
  // anterior vacío y gasto nuevo, el salto real es +100%.
  const deltaVisible = gastoActual > 0 || gastoAnterior > 0;
  const porcentaje =
    gastoAnterior > 0
      ? Math.round(((gastoActual - gastoAnterior) / gastoAnterior) * 100)
      : gastoActual > 0
        ? 100
        : 0;
  // Subir el gasto es mala noticia (rojo); bajarlo, buena (verde).
  const colorDelta = porcentaje > 0 ? paleta.rojoMonto : porcentaje < 0 ? paleta.verdeMonto : paleta.textoSuave;
  const textoDelta =
    porcentaje > 0 ? `+${porcentaje}%` : porcentaje < 0 ? `−${Math.abs(porcentaje)}%` : '0%';
  const etiquetaDelta = `vs. ${periodoGrafico === 'semana' ? 'semana' : 'mes'} anterior`;

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
      // El lookup va primero sin importar la forma de la clave: los ids de
      // Firestore no llevan guiones y resuelven igual en el mapa.
      nombre: nombresDeCategoria.get(clave) ?? clave,
      porcentaje: gastoTotalGasto > 0 ? Math.round((monto / gastoTotalGasto) * 100) : 0,
    }));

  const recientes = transacciones.slice(0, 5);

  const saldoTexto = (monto: number): string =>
    montosVisibles ? `$ ${monto < 0 ? '-' : ''}${Math.abs(monto).toFixed(2)}` : MONTOS_OCULTOS;

  const { ajustes } = useAjustes();

  // Transición del ojito (T013): al alternar visibilidad, el saldo se
  // desvanece un instante y vuelve, en lugar de cambiar de golpe. Apagable
  // con el ajuste de animaciones.
  const opacidadSaldo = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!ajustes.animaciones) {
      return;
    }
    opacidadSaldo.setValue(0.25);
    Animated.timing(opacidadSaldo, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [montosVisibles, ajustes.animaciones, opacidadSaldo]);

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <ScrollView contentContainerStyle={estilos.lista}>
        {/* Estado de sincronización (T013): una línea discreta encima del
            saldo que dice si los datos están al día o se reintentan. */}
        <BannerSincronizacion visible={!cargando} sincronizado={!error} />

        {/* Header: saldo real de hoy con el ojito a la derecha y Balance
            total debajo. SIN lupa y SIN campana (fuera por tiempo). */}
        <View style={estilos.encabezado}>
          <Animated.View style={{ opacity: opacidadSaldo }}>
            <ContadorAnimado valor={saldoTotal} formatear={saldoTexto} estilo={[estilos.saldo, { color: paleta.texto }]} />
          </Animated.View>
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

        {/* Seguro para gastar hoy (T012, #118): lo que cabe gastar hoy sin
            descuadrar el mes, estilo PocketGuard. El ojito lo enmascara
            con el mismo criterio que el saldo. */}
        <View style={estilos.seguro}>
          <GlifoEscudo />
          <View style={estilos.seguroTextos}>
            <Text style={[estilos.seguroTitulo, { color: paleta.texto }]} numberOfLines={1}>
              Seguro para gastar hoy
            </Text>
            <Text style={[estilos.seguroCaption, { color: paleta.textoSuave }]}>
              Ingresos del mes menos gastos, entre los días que faltan
            </Text>
          </View>
          <Text style={[estilos.seguroMonto, { color: paleta.texto }]}>{saldoTexto(seguroHoy)}</Text>
        </View>

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
                <IconoCartera fondo={paleta.naranjaCartera} />
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
          <ContadorAnimado
            valor={gastoActual}
            formatear={(n) => (montosVisibles ? `$ ${n.toFixed(2)}` : MONTOS_OCULTOS)}
            estilo={[estilos.graficoTotal, { color: paleta.texto }]}
          />
          <View style={estilos.graficoFila}>
            <Text style={[estilos.graficoEtiqueta, { color: paleta.textoSuave }]}>
              Total gastado {periodoGrafico === 'semana' ? 'esta semana' : 'este mes'}
            </Text>
            {deltaVisible ? (
              <>
                <Text style={[estilos.graficoPorcentaje, { color: colorDelta }]}>
                  {montosVisibles ? textoDelta : MONTOS_OCULTOS}
                </Text>
                <Text style={[estilos.deltaEtiqueta, { color: paleta.textoSuave }]}>{etiquetaDelta}</Text>
              </>
            ) : null}
          </View>
          {/* Vacío (T012, #117): el cerdito y la invitación a anotar el
              primer gasto; nunca barras fantasma que parezcan datos. Con
              datos, una barra por día: la de hoy en verde, el resto en
              gris, y el promedio del período marcado con línea. Tocar una
              barra abre Transacciones en ese día. */}
          {gastoActual === 0 ? (
            <View style={estilos.graficoVacio}>
              <GlifoCerdito />
              <Text style={[estilos.graficoVacioTexto, { color: paleta.textoSuave }]}>
                Sin gastos {periodoGrafico === 'semana' ? 'esta semana' : 'este mes'}
              </Text>
              <Pressable
                style={estilos.botonCerdito}
                accessibilityRole="button"
                accessibilityLabel="Anota tu primer gasto"
                onPress={() => setModalAbierto(true)}
              >
                <Text style={estilos.botonCerditoTexto}>Anota tu primer gasto</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={estilos.graficoBarras}>
                {gastoPorDia.map((gasto, indice) => {
                  const iso = dias[indice];
                  return (
                    <Pressable
                      key={iso}
                      style={estilos.graficoBarraZona}
                      accessibilityRole="button"
                      accessibilityLabel={`Gastos del día ${iso}`}
                      onPress={() => enrutador.push(`/transacciones?dia=${iso}`)}
                    >
                      <View
                        style={[
                          estilos.graficoBarra,
                          {
                            height: topeDia > 0 ? Math.max(3, (gasto / topeDia) * 72) : 3,
                            backgroundColor: iso === hoyISO() ? paleta.verdeAccion : paleta.puntoInactivo,
                          },
                        ]}
                      />
                      {periodoGrafico === 'semana' ? (
                        <Text style={[estilos.graficoInicial, { color: paleta.textoSuave }]}>
                          {DIAS_ABREV[deISO(iso).getDay()][0]}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
                {topeDia > 0 ? (
                  <View
                    style={[
                      estilos.graficoPromedio,
                      { bottom: (promedioDia / topeDia) * 72, borderTopColor: paleta.textoSuave },
                    ]}
                  />
                ) : null}
              </View>
              <Text style={[estilos.graficoPromedioTexto, { color: paleta.textoSuave }]}>
                Promedio {montosVisibles ? `$ ${promedioDia.toFixed(2)}` : MONTOS_OCULTOS}
              </Text>
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
        {/* Transacciones recientes: las últimas 5 con FilaReciente; el
            nombre resuelve con el mismo mapa de categorías y con el ojito
            oculto el monto pasa a ***** conservando su color. */}
        {cargando && recientes.length === 0 ? (
          <>
            <View style={estilos.seccionCabecera}>
              <Text style={[estilos.seccionTitulo, { color: paleta.textoSuave }]}>
                Transacciones recientes
              </Text>
            </View>
            <Esqueleto ancho="100%" alto={64} redondeo={14} margen={4} />
            <Esqueleto ancho="100%" alto={64} redondeo={14} margen={4} />
            <Esqueleto ancho="100%" alto={64} redondeo={14} margen={4} />
          </>
        ) : recientes.length > 0 ? (
          <>
            <View style={estilos.seccionCabecera}>
              <Text style={[estilos.seccionTitulo, { color: paleta.textoSuave }]}>
                Transacciones recientes
              </Text>
            </View>
            <View style={[estilos.tarjeta, { backgroundColor: paleta.tarjeta }]}>
              {recientes.map((reciente) => (
                <FilaReciente
                  key={reciente.id ?? `${reciente.fecha}-${reciente.monto}`}
                  transaccion={reciente}
                  nombreCategoria={
                    reciente.categoria_id
                      ? nombresDeCategoria.get(reciente.categoria_id)
                      : undefined
                  }
                  montosVisibles={montosVisibles}
                  alEditar={() => setSeleccionada(reciente)}
                  alEliminar={() => setPendiente(reciente)}
                />
              ))}
            </View>
          </>
        ) : null}
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
        <View style={estilos.fondoDialogo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cerrar"
            onPress={() => setPendiente(undefined)}
          />
          <View style={estilos.tarjetaDialogo}>
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
          </View>
        </View>
      </Modal>

      <ModalAgregarTransaccion
        visible={modalAbierto || !!seleccionada}
        alCerrar={() => {
          setModalAbierto(false);
          setSeleccionada(undefined);
        }}
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

// Cerdito dibujado con vistas (T012, #117): el estado vacío del gráfico
// invita a anotar el primer gasto en vez de fingir barras. Mismo criterio
// del repo: sin dependencias nuevas, nada pedido por URL.
function GlifoCerdito() {
  return (
    <View style={estilos.cerdito}>
      <View style={[estilos.cerditoCuerpo, { borderColor: paleta.verdeAccion }]} />
      <View style={[estilos.cerditoRanura, { backgroundColor: paleta.verdeAccion }]} />
      <View style={[estilos.cerditoHocico, { backgroundColor: paleta.verdeAccion }]} />
      <View style={[estilos.cerditoPata, { backgroundColor: paleta.verdeAccion, left: 14 }]} />
      <View style={[estilos.cerditoPata, { backgroundColor: paleta.verdeAccion, right: 14 }]} />
    </View>
  );
}

// Escudo dibujado con vistas (T012, #118): mismo criterio del repo, sin
// dependencias nuevas y nada pedido por URL.
function GlifoEscudo() {
  return (
    <View style={estilos.escudo}>
      <View style={[estilos.escudoCuerpo, { backgroundColor: paleta.verdeAccion }]} />
      <View style={[estilos.escudoPunta, { borderTopColor: paleta.verdeAccion }]} />
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

  // En web cada Pressable es un <button>. La papelera va como hermana de
  // la zona de edición, no adentro: un botón HTML no puede anidar otro.
  return (
    <View style={estilos.filaReciente}>
      <Pressable
        style={estilos.cuerpoReciente}
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
        <Text
          style={[
            estilos.montoReciente,
            { color: transaccion.tipo === 'ingreso' ? paleta.azulMonto : paleta.rojoMonto },
          ]}
        >
          {montosVisibles ? `$${transaccion.monto.toFixed(2)}` : MONTOS_OCULTOS}
        </Text>
      </Pressable>
      <Pressable
        style={estilos.papeleraReciente}
        accessibilityRole="button"
        accessibilityLabel="Eliminar transacción"
        onPress={alEliminar}
        hitSlop={6}
      >
        <GlifoPapelera />
      </Pressable>
    </View>
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
  seguro: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: paleta.verdeAccion,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  seguroTextos: {
    flex: 1,
    marginLeft: 10,
  },
  seguroTitulo: {
    fontSize: 15,
    fontWeight: '700',
  },
  seguroCaption: {
    fontSize: 12,
    marginTop: 2,
  },
  seguroMonto: {
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginLeft: 10,
  },
  escudo: {
    width: 16,
    alignItems: 'center',
  },
  escudoCuerpo: {
    width: 16,
    height: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  escudoPunta: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
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
    fontVariant: ['tabular-nums'],
  },
  deltaEtiqueta: {
    fontSize: 13,
    marginLeft: 6,
  },
  graficoVacio: {
    alignItems: 'center',
    marginTop: 16,
  },
  graficoVacioTexto: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  botonCerdito: {
    marginTop: 14,
    backgroundColor: paleta.verdeAccion,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  botonCerditoTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cerdito: {
    width: 56,
    height: 44,
    marginTop: 10,
  },
  cerditoCuerpo: {
    position: 'absolute',
    left: 2,
    top: 8,
    width: 50,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  cerditoRanura: {
    position: 'absolute',
    top: 4,
    left: 20,
    width: 14,
    height: 3,
    borderRadius: 1.5,
  },
  cerditoHocico: {
    position: 'absolute',
    top: 18,
    right: 0,
    width: 12,
    height: 10,
    borderRadius: 6,
  },
  cerditoPata: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  graficoBarras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 76,
    marginTop: 16,
    position: 'relative',
  },
  graficoBarraZona: {
    flex: 1,
    alignItems: 'center',
  },
  graficoBarra: {
    alignSelf: 'stretch',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  graficoInicial: {
    fontSize: 11,
    marginTop: 4,
  },
  graficoPromedio: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  graficoPromedioTexto: {
    fontSize: 12,
    marginTop: 6,
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
  cuerpoReciente: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
