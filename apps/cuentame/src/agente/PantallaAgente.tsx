import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useTransacciones } from '../datos/useTransacciones';
import { useCategorias } from '../datos/useCategorias';
import { crearModeloFirebaseAI } from './modeloFirebaseAI';
import { preguntar } from './orquestador';
import type { MensajeAgente, ModeloAgente } from './modelo';

// El chat del Agente (T011, #115). El historial vive en memoria dentro de
// este componente: se borra al cerrar sesión porque la ruta lo remonta
// con una key distinta, y no se guarda en Firestore ni entre aparatos.

const PREGUNTAS_EJEMPLO = [
  '¿En qué día gasté más en Comida y bebida?',
  '¿Cuánto gasté en Transporte en todo el año?',
  'Háblame de mis ingresos del último mes',
];

interface Burbuja {
  rol: 'persona' | 'agente';
  texto: string;
}

export function PantallaAgente() {
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando: cargandoTransacciones } = useTransacciones();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [historial, setHistorial] = useState<MensajeAgente[]>([]);
  const [borrador, setBorrador] = useState('');
  const [pensando, setPensando] = useState(false);
  const modelo = useMemo<ModeloAgente>(() => crearModeloFirebaseAI(), []);
  const lista = useRef<ScrollViewInstance | null>(null);

  const cargandoDatos = cargandoTransacciones || cargandoCategorias;

  useEffect(() => {
    lista.current?.scrollToEnd({ animated: true });
  }, [burbujas.length, pensando]);

  async function mandar(pregunta: string) {
    const limpia = pregunta.trim();
    if (limpia === '' || pensando || cargandoDatos) return;
    setBurbujas((prev) => [...prev, { rol: 'persona', texto: limpia }]);
    setBorrador('');
    setPensando(true);
    try {
      const respuesta = await preguntar({
        pregunta: limpia,
        historial,
        datos: { transacciones, categorias },
        cargando: cargandoDatos,
        ahora: new Date(),
        modelo,
      });
      if (respuesta.tipo === 'respuesta') {
        setBurbujas((prev) => [...prev, { rol: 'agente', texto: respuesta.texto }]);
        setHistorial(respuesta.historial);
      }
    } catch {
      setBurbujas((prev) => [...prev, { rol: 'agente', texto: 'El Agente no pudo responder ahora. Intentá de nuevo.' }]);
    } finally {
      setPensando(false);
    }
  }

  const enviarHabilitado = borrador.trim() !== '' && !pensando && !cargandoDatos;

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}>
      <View style={estilos.encabezado}>
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Agente</Text>
        <Text style={[estilos.aviso, { color: paleta.textoSuave }]}>
          Usa la capa gratis de Gemini: úsalo solo con datos de demo.
        </Text>
      </View>

      <ScrollView
        ref={lista}
        style={estilos.conversacion}
        contentContainerStyle={estilos.conversacionContenido}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
      >
        {burbujas.length === 0 && !pensando ? (
          <View style={estilos.vacio}>
            <Image source={require('../../assets/glifos/agente.png')} style={estilos.glifo} resizeMode="contain" />
            <Text style={[estilos.vacioTitulo, { color: paleta.texto }]}>Preguntá sobre tu dinero</Text>
            <Text style={[estilos.vacioTexto, { color: paleta.textoSuave }]}>
              Gastos, categorías e ingresos, con tus datos de la app.
            </Text>
            {PREGUNTAS_EJEMPLO.map((pregunta) => (
              <Pressable
                key={pregunta}
                style={[estilos.ejemplo, { borderColor: paleta.separador }]}
                accessibilityRole="button"
                accessibilityLabel={`Preguntar: ${pregunta}`}
                onPress={() => mandar(pregunta)}
              >
                <Text style={[estilos.ejemploTexto, { color: paleta.texto }]}>{pregunta}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {burbujas.map((burbuja, indice) => (
          <View
            key={`${indice}-${burbuja.rol}`}
            style={[estilos.linea, burbuja.rol === 'persona' ? estilos.lineaPersona : estilos.lineaAgente]}
          >
            <Text
              style={[
                estilos.burbuja,
                burbuja.rol === 'persona' ? estilos.burbujaPersona : estilos.burbujaAgente,
                { color: paleta.texto },
              ]}
              selectable
            >
              {burbuja.texto}
            </Text>
          </View>
        ))}

        {pensando ? (
          <View style={estilos.lineaAgente}>
            <Text style={[estilos.burbuja, estilos.burbujaAgente, estilos.pensando, { color: paleta.textoSuave }]}>
              El Agente está pensando…
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: 12 }]}>
        {cargandoDatos ? (
          <Text style={[estilos.cargando, { color: paleta.textoSuave }]}>Cargando tus transacciones…</Text>
        ) : null}
        <View style={estilos.filaEntrada}>
          <TextInput
            style={[estilos.entrada, { backgroundColor: paleta.superficie, color: paleta.texto }]}
            placeholder="Escribe tu pregunta…"
            placeholderTextColor={paleta.puntoInactivo}
            value={borrador}
            onChangeText={setBorrador}
            onSubmitEditing={() => mandar(borrador)}
            returnKeyType="send"
            editable={!pensando}
          />
          <Pressable
            style={[
              estilos.enviar,
              { backgroundColor: enviarHabilitado ? paleta.verdeAccion : paleta.barraFantasma },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            disabled={!enviarHabilitado}
            onPress={() => mandar(borrador)}
          >
            <Text style={[estilos.enviarTexto, { color: enviarHabilitado ? '#FFFFFF' : paleta.textoSuave }]}>Enviar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
  },
  aviso: {
    fontSize: 13,
    marginTop: 4,
  },
  conversacion: {
    flex: 1,
  },
  conversacionContenido: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  vacio: {
    alignItems: 'center',
    paddingTop: 28,
  },
  glifo: {
    width: 96,
    height: 96,
    marginBottom: 14,
    opacity: 0.9,
  },
  vacioTitulo: {
    fontSize: 19,
    fontWeight: '600',
  },
  vacioTexto: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
    textAlign: 'center',
  },
  ejemplo: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 10,
  },
  ejemploTexto: {
    fontSize: 15,
  },
  linea: {
    maxWidth: '88%',
    marginBottom: 10,
  },
  lineaPersona: {
    alignSelf: 'flex-end',
  },
  lineaAgente: {
    alignSelf: 'flex-start',
  },
  burbuja: {
    fontSize: 15,
    lineHeight: 21,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  burbujaPersona: {
    backgroundColor: paleta.verdeOscuro,
    borderBottomRightRadius: 6,
  },
  burbujaAgente: {
    backgroundColor: paleta.tarjeta,
    borderBottomLeftRadius: 6,
  },
  pensando: {
    fontStyle: 'italic',
  },
  pie: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  cargando: {
    fontSize: 13,
    marginBottom: 6,
  },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entrada: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  enviar: {
    marginLeft: 8,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  enviarTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
});
