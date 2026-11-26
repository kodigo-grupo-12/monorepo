import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { useAjustes } from '../ajustes/ProveedorAjustes';

// Contador animado (T013): el número sube hasta su valor al entrar y en
// cada cambio, con easing suave. Respeta el ajuste de animaciones: si
// están apagadas pinta el valor de inmediato. El formato (moneda, ojito,
// signo) lo aporta quien lo usa, así el componente no sabe nada de dinero.
const DURACION = 500;

export function ContadorAnimado({
  valor,
  formatear,
  estilo,
}: {
  valor: number;
  formatear: (n: number) => string;
  estilo?: StyleProp<TextStyle>;
}) {
  const { ajustes, listos } = useAjustes();
  const progreso = useRef(new Animated.Value(0)).current;
  const mostrado = useRef(valor);
  const [texto, setTexto] = useState(() => formatear(valor));

  // El formateador cambia de identidad en cada render del padre; se guarda
  // en ref para que la animación no se reinicie por eso.
  const formatearRef = useRef(formatear);
  formatearRef.current = formatear;

  useEffect(() => {
    if (!ajustes.animaciones || !listos) {
      mostrado.current = valor;
      setTexto(formatearRef.current(valor));
      progreso.setValue(0);
      return;
    }

    const desde = mostrado.current;
    if (desde === valor) {
      return;
    }

    progreso.setValue(0);
    const oyente = progreso.addListener((estado) => {
      const actual = desde + (valor - desde) * estado.value;
      mostrado.current = actual;
      setTexto(formatearRef.current(actual));
    });
    Animated.timing(progreso, {
      toValue: 1,
      duration: DURACION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    return () => progreso.removeListener(oyente);
  }, [valor, ajustes.animaciones, listos, progreso]);

  return <Text style={estilo ?? estilos.base}>{texto}</Text>;
}

const estilos = StyleSheet.create({
  base: {
    color: '#FFFFFF',
  },
});
