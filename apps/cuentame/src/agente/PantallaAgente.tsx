import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { paleta } from '../tema/colores';
import { useCategorias } from '../datos/useCategorias';
import { useTransacciones } from '../datos/useTransacciones';
import { hoyEnElSalvador } from './fechas';
import type { MensajeAgente } from './modelo';
import { crearModeloFirebaseAI } from './modeloFirebaseAI';
import { preguntar } from './orquestador';

const PREGUNTAS_EJEMPLO = [
  '¿En qué día gasté más en Comida y bebida?',
  '¿Cuánto gasté en Transporte en todo el año?',
  'Háblame de mis ingresos del último mes',
];

const AVISO_DATOS_DEMO = 'Usa la capa gratis de Gemini: úsalo solo con datos de demo.';
const TEXTO_CARGANDO = 'Cargando tus transacciones…';
const TEXTO_PENSANDO = 'El Agente está pensando…';
const MENSAJE_BORRADOR = 'El Agente todavía no respondió. Probá de nuevo.';

// El chat del Agente (spec #107): burbujas para la persona y para el Agente,
// con el chat vacío 3 preguntas de ejemplo tocables. Los errores llegan como
// mensaje del Agente y el texto del campo siempre va a un nuevo borrador.
export function PantallaAgente() {
  const margenes = useSafeAreaInsets();
  const { transacciones, cargando: cargandoTransacciones } = useTransacciones();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const cargando = cargandoTransacciones || cargandoCategorias;
  const [mensajes, setMensajes] = useState<MensajeAgente[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const modelo = useMemo(() => crearModeloFirebaseAI(), []);
  const lista = useRef<ScrollViewInstance>(null);

  // La lista baja sola al último mensaje, sin librerías.
  useEffect(() => {
    lista.current?.scrollToEnd({ animated: true });
  }, [mensajes, pensando]);

  const enviar = async (pregunta: string): Promise<void> => {
    const preguntaLimpia = pregunta.trim();
    if (preguntaLimpia === '' || pensando || cargando) {
      return;
    }
    setTexto('');
    setPensando(true);
    try {
      const respuesta = await preguntar({
        pregunta: preguntaLimpia,
        historial: mensajes,
        datos: { transacciones, categorias, hoy: hoyEnElSalvador() },
        cargando,
        ahora: new Date(),
        modelo,
      });
      if (respuesta.tipo === 'respuesta') {
        setMensajes(respuesta.historial);
      }
    } catch {
      setMensajes([...mensajes, { rol: 'persona', texto: preguntaLimpia }, { rol: 'modelo', texto: MENSAJE_BORRADOR }]);
    } finally {
      setPensando(false);
    }
  };

  const visibles = mensajes.filter(
    (mensaje) => mensaje.rol === 'persona' || (mensaje.rol === 'modelo' && 'texto' in mensaje),
  );
  const vacio = visibles.length === 0 && !pensando;
  const sinTexto = texto.trim() === '';

  return (
    <KeyboardAvoidingView
      style={[estilos.contenedor, { backgroundColor: paleta.fondo, paddingTop: margenes.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={estilos.cabecera}>
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Agente</Text>
        <Text style={[estilos.aviso, { color: paleta.textoSuave }]}>{AVISO_DATOS_DEMO}</Text>
      </View>

      <ScrollView
        ref={lista}
        style={estilos.lista}
        contentContainerStyle={estilos.listaContenido}
        keyboardShouldPersistTaps="handled"
      >
        {vacio ? (
          PREGUNTAS_EJEMPLO.map((pregunta) => (
            <Pressable
              key={pregunta}
              style={[estilos.ejemplo, { backgroundColor: paleta.superficie, borderColor: paleta.separador }]}
              accessibilityRole="button"
              accessibilityLabel={`Preguntar: ${pregunta}`}
              onPress={() => {
                void enviar(pregunta);
              }}
            >
              <Text style={[estilos.ejemploTexto, { color: paleta.texto }]}>{pregunta}</Text>
            </Pressable>
          ))
        ) : (
          visibles.map((mensaje, indice) =>
            mensaje.rol === 'persona' ? (
              <View key={indice} style={estilos.filaPersona}>
                <View style={[estilos.burbuja, estilos.burbujaPersona, { backgroundColor: paleta.verdeAccion }]}>
                  <Text style={[estilos.textoBurbuja, { color: '#FFFFFF' }]}>{mensaje.texto}</Text>
                </View>
              </View>
            ) : (
              <View key={indice} style={estilos.filaAgente}>
                <View style={[estilos.burbuja, estilos.burbujaAgente, { backgroundColor: paleta.superficie }]}>
                  <Text style={[estilos.textoBurbuja, { color: paleta.texto }]}>{mensaje.texto}</Text>
                </View>
              </View>
            ),
          )
        )}
        {pensando ? (
          <View style={estilos.filaAgente}>
            <View style={[estilos.burbuja, estilos.burbujaAgente, { backgroundColor: paleta.superficie }]}>
              <Text style={[estilos.textoBurbuja, { color: paleta.textoSuave }]}>{TEXTO_PENSANDO}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {cargando ? <Text style={[estilos.aviso, { color: paleta.textoSuave }]}>{TEXTO_CARGANDO}</Text> : null}
      <View style={[estilos.entrada, { paddingBottom: margenes.bottom + 24 }]}>
        <TextInput
          style={[estilos.campo, { backgroundColor: paleta.dialogo, borderColor: paleta.separador, color: paleta.texto }]}
          value={texto}
          onChangeText={setTexto}
          placeholder="Pregúntale algo sobre tu dinero…"
          placeholderTextColor={paleta.textoSuave}
          multiline
          // En web Enter envía (react-native-web nunca llama onSubmitEditing
          // en multiline) y Shift+Enter deja el salto de línea; en Android e
          // iOS el Enter sigue insertando salto de línea (#https://github.com/kodigo-grupo-12/monorepo/issues/159).
          onKeyPress={(evento) => {
            if (Platform.OS !== 'web' || evento.nativeEvent.key !== 'Enter') {
              return;
            }
            if ((evento.nativeEvent as unknown as { shiftKey?: boolean }).shiftKey) {
              return;
            }
            evento.preventDefault();
            void enviar(texto);
          }}
          accessibilityLabel="Pregunta para el Agente"
        />
        <Pressable
          style={[estilos.enviar, { backgroundColor: sinTexto || pensando || cargando ? paleta.barraFantasma : paleta.verdeAccion }]}
          accessibilityRole="button"
          accessibilityLabel="Enviar pregunta"
          disabled={sinTexto || pensando || cargando}
          onPress={() => {
            void enviar(texto);
          }}
        >
          <Text style={[estilos.enviarTexto, { color: sinTexto || pensando || cargando ? paleta.textoSuave : '#FFFFFF' }]}>
            Enviar
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  cabecera: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
  },
  titulo: {
    fontSize: 22,
    fontWeight: '600',
  },
  aviso: {
    fontSize: 12,
  },
  lista: {
    flex: 1,
  },
  listaContenido: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  ejemplo: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  ejemploTexto: {
    fontSize: 15,
  },
  filaPersona: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  filaAgente: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  burbuja: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  burbujaPersona: {
    borderBottomRightRadius: 6,
  },
  burbujaAgente: {
    borderBottomLeftRadius: 6,
  },
  textoBurbuja: {
    fontSize: 15,
    lineHeight: 21,
  },
  entrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  campo: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  enviar: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  enviarTexto: {
    fontSize: 15,
    fontWeight: '600',
  },
});
