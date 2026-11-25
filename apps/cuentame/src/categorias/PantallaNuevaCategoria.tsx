import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { crearCategoria } from '../datos/categorias';
import type { TipoCategoria } from '../datos/categorias';
import { paleta } from '../tema/colores';
import { GlifoCategoria } from './GlifoCategoria';

// Anatomía de Assets/categorias/referencia-pantalla-nueva-categoria.png con
// las adaptaciones del spec #54: sin «Categoría madre», sin moneda ni saldo
// inicial, y el círculo del icono es fijo (el gris de «…»). El radio
// Gasto/Ingreso arranca preseleccionado según el tab del que se vino.
export function PantallaNuevaCategoria({ tipoInicial = 'gasto' }: { tipoInicial?: TipoCategoria }) {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoCategoria>(tipoInicial);
  const [guardando, setGuardando] = useState(false);

  const nombreValido = nombre.trim().length > 0;

  async function guardar() {
    if (!nombreValido || guardando) {
      return;
    }
    setGuardando(true);
    try {
      await crearCategoria(nombre.trim(), tipo);
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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Nueva categoría</Text>
        <View style={estilos.ranura} />
      </View>

      <View style={[estilos.cuerpo, { paddingBottom: margenes.bottom + 24 }]}>
        <View style={estilos.filaNombre}>
          <GlifoCategoria nombre="Otros gastos" />
          <TextInput
            style={[estilos.entrada, { color: paleta.texto }]}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre de la categoría"
            placeholderTextColor={paleta.textoSuave}
            accessibilityLabel="Nombre de la categoría"
          />
        </View>

        <View style={estilos.radios}>
          {(['gasto', 'ingreso'] as const).map((valor) => (
            <Pressable
              key={valor}
              style={estilos.radio}
              accessibilityRole="radio"
              accessibilityLabel={valor === 'gasto' ? 'Gasto' : 'Ingreso'}
              accessibilityState={{ selected: tipo === valor }}
              onPress={() => setTipo(valor)}
            >
              <View
                style={[
                  estilos.radioCirculo,
                  tipo === valor
                    ? { borderColor: paleta.verdeLogin, alignItems: 'center', justifyContent: 'center' }
                    : { borderColor: paleta.textoSuave },
                ]}
              >
                {tipo === valor ? (
                  <View style={[estilos.radioPunto, { backgroundColor: paleta.verdeLogin }]} />
                ) : null}
              </View>
              <Text style={[estilos.radioTexto, { color: paleta.texto }]}>{valor === 'gasto' ? 'Gasto' : 'Ingreso'}</Text>
            </Pressable>
          ))}
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
  radios: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  radio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCirculo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  radioPunto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioTexto: {
    fontSize: 15,
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
