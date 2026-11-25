import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { crearCartera } from '../datos/carteras';
import { paleta } from '../tema/colores';
import { IconoBilletera } from './IconoBilletera';

// Anatomía de Assets/carteras/referencia-pantalla-nueva-cartera.png con las
// adaptaciones del spec #54: SIN campo Moneda (USD implícito), SIN saldo
// inicial (choca con el saldo calculado), SIN toggles de notificaciones y
// «Excluir del total», SIN «Conectar cuenta».
export function PantallaNuevaCartera() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const nombreValido = nombre.trim().length > 0;

  async function guardar() {
    if (!nombreValido || guardando) {
      return;
    }
    setGuardando(true);
    try {
      await crearCartera(nombre.trim());
      enrutador.back();
    } finally {
      setGuardando(false);
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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Nueva cartera</Text>
        <View style={estilos.ranura} />
      </View>

      <View style={[estilos.cuerpo, { paddingBottom: margenes.bottom + 24 }]}>
        <View style={estilos.filaNombre}>
          <IconoBilletera />
          <TextInput
            style={[estilos.entrada, { color: paleta.texto }]}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre de la cartera"
            placeholderTextColor={paleta.textoSuave}
            accessibilityLabel="Nombre de la cartera"
          />
        </View>

        <View style={estilos.espacio} />
        <Pressable
          style={[estilos.guardar, nombreValido ? { backgroundColor: paleta.verdeLogin } : { backgroundColor: paleta.superficie }]}
          accessibilityRole="button"
          accessibilityLabel="Guardar"
          accessibilityState={{ disabled: !nombreValido || guardando }}
          disabled={!nombreValido || guardando}
          onPress={guardar}
        >
          <Text style={[estilos.guardarTexto, { color: nombreValido ? paleta.texto : paleta.textoSuave }]}>
            Guardar
          </Text>
        </Pressable>
      </View>
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
  cuerpo: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: paleta.superficie,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  entrada: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  espacio: {
    flex: 1,
  },
  guardar: {
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardarTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
});
