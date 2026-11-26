import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import type { Transaccion } from '../datos/transacciones';
import { MESES, aISO, deISO, hoyISO } from './fechas';

type Props = {
  visible: boolean;
  diaISO: string;
  transacciones: Transaccion[];
  alCerrar: () => void;
  alSeleccionar: (iso: string) => void;
};

// Calendario del mes (T009), copiado de
// Assets/transacciones/modelo-pantalla-calendario-transacciones.png
// (kodigo-grupo-12/.github): modal a pantalla completa sin navbar, segunda
// excepción a la regla de la T005 junto con el modal del +. La X cierra sin
// elegir nada; tocar un día lo selecciona y regresa a Transacciones. Punto
// azul = día con ingreso, rojo = con gasto; hoy lleva anillo verde y el día
// seleccionado va en círculo verde. «Ver informes» queda fuera de la tarea.
export function CalendarioTransacciones({
  visible,
  diaISO,
  transacciones,
  alCerrar,
  alSeleccionar,
}: Props) {
  const margenes = useSafeAreaInsets();
  // El mes que se muestra arranca en el mes del día seleccionado cada vez
  // que el calendario se abre.
  const [mes, setMes] = useState(() => {
    const fecha = deISO(diaISO);
    return { anio: fecha.getFullYear(), indice: fecha.getMonth() };
  });

  useEffect(() => {
    if (visible) {
      const fecha = deISO(diaISO);
      setMes({ anio: fecha.getFullYear(), indice: fecha.getMonth() });
    }
  }, [visible, diaISO]);

  function moverMes(delta: number) {
    setMes((actual) => {
      const indice = actual.indice + delta;
      if (indice < 0) {
        return { anio: actual.anio - 1, indice: 11 };
      }
      if (indice > 11) {
        return { anio: actual.anio + 1, indice: 0 };
      }
      return { anio: actual.anio, indice };
    });
  }

  // Marcadores del filtro actual (la pantalla ya entrega la lista de la
  // cartera elegida): un día puede tener los dos puntos.
  const conIngreso = new Set(
    transacciones.filter((transaccion) => transaccion.tipo === 'ingreso').map((t) => t.fecha),
  );
  const conGasto = new Set(
    transacciones.filter((transaccion) => transaccion.tipo === 'gasto').map((t) => t.fecha),
  );

  // Cuadrícula del mes, lunes primero como en el modelo (L M M J V S D).
  const offset = (new Date(mes.anio, mes.indice, 1).getDay() + 6) % 7;
  const totalDias = new Date(mes.anio, mes.indice + 1, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: totalDias }, (_, indice) => aISO(new Date(mes.anio, mes.indice, indice + 1))),
  ];
  const hoy = hoyISO();

  return (
    <Modal visible={visible} statusBarTranslucent>
      <View style={[estilos.raiz, { backgroundColor: paleta.fondo, paddingTop: margenes.top + 8 }]}>
        <View style={estilos.cabecera}>
          <Pressable
            style={estilos.cerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={alCerrar}
            hitSlop={8}
          >
            <View style={estilos.aspaUno} />
            <View style={estilos.aspaDos} />
          </Pressable>
          <Text style={[estilos.titulo, { color: paleta.texto }]}>Calendario</Text>
          <View style={estilos.ranura} />
        </View>

        <View style={estilos.mesFila}>
          <Pressable
            style={estilos.flecha}
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => moverMes(-1)}
            hitSlop={8}
          >
            <View style={estilos.puntaIzquierda} />
          </Pressable>
          <Text style={[estilos.mesTexto, { color: paleta.texto }]}>
            {MESES[mes.indice]} {mes.anio}
          </Text>
          <Pressable
            style={estilos.flecha}
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => moverMes(1)}
            hitSlop={8}
          >
            <View style={estilos.puntaDerecha} />
          </Pressable>
        </View>

        <View style={estilos.semana}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((letra, indice) => (
            <Text key={`${letra}-${indice}`} style={[estilos.semanaLetra, { color: paleta.textoSuave }]}>
              {letra}
            </Text>
          ))}
        </View>

        <View style={estilos.cuadricula}>
          {celdas.map((iso, indice) =>
            iso === null ? (
              <View key={`vacio-${indice}`} style={estilos.celda} />
            ) : (
              <View key={iso} style={estilos.celda}>
                <Pressable
                  style={estilos.diaBoton}
                  accessibilityRole="button"
                  accessibilityLabel={`Día ${iso}`}
                  accessibilityState={{ selected: iso === diaISO }}
                  onPress={() => alSeleccionar(iso)}
                >
                  <View
                    style={[
                      estilos.diaCirculo,
                      iso === diaISO && { backgroundColor: paleta.verdeAccion },
                      iso !== diaISO && iso === hoy && {
                        borderWidth: 1.5,
                        borderColor: paleta.verdeAccion,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.diaNumero,
                        { color: paleta.texto },
                        iso === diaISO && estilos.diaNumeroActivo,
                      ]}
                    >
                      {deISO(iso).getDate()}
                    </Text>
                  </View>
                </Pressable>
                <View style={estilos.diaMarcas}>
                  {conIngreso.has(iso) ? (
                    <View style={[estilos.marca, { backgroundColor: paleta.azulMonto }]} />
                  ) : null}
                  {conGasto.has(iso) ? (
                    <View style={[estilos.marca, { backgroundColor: paleta.rojoMonto }]} />
                  ) : null}
                </View>
              </View>
            ),
          )}
        </View>
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
  cerrar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspaUno: {
    position: 'absolute',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '45deg' }],
  },
  aspaDos: {
    position: 'absolute',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: paleta.texto,
    transform: [{ rotate: '-45deg' }],
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  ranura: {
    width: 40,
  },
  mesFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  flecha: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puntaIzquierda: {
    width: 11,
    height: 11,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
  puntaDerecha: {
    width: 11,
    height: 11,
    borderRightWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
  mesTexto: {
    fontSize: 20,
    fontWeight: '700',
    minWidth: 220,
    textAlign: 'center',
  },
  semana: {
    flexDirection: 'row',
    marginTop: 18,
  },
  semanaLetra: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  cuadricula: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  celda: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  diaBoton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaNumero: {
    fontSize: 17,
  },
  diaNumeroActivo: {
    fontWeight: '700',
  },
  diaMarcas: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    marginTop: 2,
    alignItems: 'center',
  },
  marca: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
