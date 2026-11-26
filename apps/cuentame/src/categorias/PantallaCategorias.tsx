import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategorias } from '../datos/useCategorias';
import type { TipoCategoria } from '../datos/categorias';
import { paleta } from '../tema/colores';
import { GlifoCategoria } from './GlifoCategoria';

// Anatomía copiada de Assets/categorias/modelo-pantalla-categorias.png
// (kodigo-grupo-12/.github): header con flecha de atrás y título, tabs
// GASTO/INGRESO con el activo en blanco y subrayado, fila verde para crear
// y lista plana con círculo de color y glifo, sin chevron ni sub-niveles.
// Pantalla empujada del tab Cuenta (ADR-0011): el navbar queda visible.
export function PantallaCategorias({ soloLectura = false }: { soloLectura?: boolean }) {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { categorias, cargando } = useCategorias();
  const [tipo, setTipo] = useState<TipoCategoria>('gasto');

  const visibles = categorias.filter((categoria) => categoria.tipo === tipo);

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
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Categorías</Text>
        <View style={estilos.ranura} />
      </View>

      <View style={estilos.tabs}>
        {(['gasto', 'ingreso'] as const).map((valor) => (
          <Pressable
            key={valor}
            style={[estilos.tab, tipo === valor && estilos.tabActivo]}
            accessibilityRole="tab"
            accessibilityLabel={valor === 'gasto' ? 'Gasto' : 'Ingreso'}
            accessibilityState={{ selected: tipo === valor }}
            onPress={() => setTipo(valor)}
          >
            <Text
              style={[
                estilos.tabTexto,
                { color: tipo === valor ? paleta.texto : paleta.textoSuave },
                tipo === valor && { fontWeight: '700' },
              ]}
            >
              {valor === 'gasto' ? 'GASTO' : 'INGRESO'}
            </Text>
          </Pressable>
        ))}
      </View>

      {!soloLectura ? (
        <Pressable
          style={estilos.filaNueva}
          accessibilityRole="button"
          accessibilityLabel="Nueva categoría"
          onPress={() => enrutador.push(`/nueva-categoria?tipo=${tipo}`)}
        >
          <View style={[estilos.circuloNueva, { backgroundColor: paleta.verdeAccion }]}>
            <Text style={estilos.masNueva}>+</Text>
          </View>
          <Text style={[estilos.textoNueva, { color: paleta.verdeAccion }]}>NUEVA CATEGORÍA</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={estilos.lista}>
        {cargando ? null : visibles.map((categoria, indice) => (
          <View key={categoria.id ?? categoria.nombre}>
            <View style={estilos.fila}>
              <GlifoCategoria nombre={categoria.nombre} />
              <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
                {categoria.nombre}
              </Text>
            </View>
            {indice < visibles.length - 1 ? (
              <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
            ) : null}
          </View>
        ))}
      </ScrollView>
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
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 4,
  },
  tab: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActivo: {
    borderBottomColor: paleta.texto,
  },
  tabTexto: {
    fontSize: 15,
    letterSpacing: 1,
  },
  filaNueva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  circuloNueva: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masNueva: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
  },
  textoNueva: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lista: {
    paddingBottom: 24,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  nombre: {
    flex: 1,
    fontSize: 16,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
