import { useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTRASENA_DEMO, CORREO_DEMO } from '../sesion/guardarSesion';
import { usarSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

const AVISO_DEMO = 'Ese correo o esa contraseña no son los de la cuenta demo.';
const AVISO_ETAPA = 'En esta etapa solo entra la cuenta demo.';

export function PantallaLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entrar } = usarSesion();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [correo, setCorreo] = useState(CORREO_DEMO);
  const [contrasena, setContrasena] = useState(CONTRASENA_DEMO);
  const [oculta, setOculta] = useState(true);
  const [aviso, setAviso] = useState('');

  const irAlBoton = () => {
    scroll.current?.scrollToEnd({ animated: true });
  };

  const iniciar = async () => {
    if (correo !== CORREO_DEMO || contrasena !== CONTRASENA_DEMO) {
      setAviso(AVISO_DEMO);
      return;
    }

    await entrar();
    router.back();
  };

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: paleta.fondo }}
      contentContainerStyle={[
        estilos.contenido,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="atrás"
        onPress={() => router.back()}
        style={estilos.atras}
      >
        <Text style={[estilos.flecha, { color: paleta.texto }]}>←</Text>
      </Pressable>

      <Text style={[estilos.titulo, { color: paleta.texto }]}>Inicio de sesión</Text>

      <Text style={[estilos.etiqueta, { color: paleta.textoSuave }]}>E-mail</Text>
      <TextInput
        value={correo}
        onChangeText={setCorreo}
        onFocus={irAlBoton}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        accessibilityLabel="E-mail"
        style={[estilos.campo, { color: paleta.texto, borderBottomColor: paleta.textoSuave }]}
      />

      <Text style={[estilos.etiqueta, estilos.espacio, { color: paleta.textoSuave }]}>Contraseña</Text>
      <View style={[estilos.filaClave, { borderBottomColor: paleta.textoSuave }]}>
        <TextInput
          value={contrasena}
          onChangeText={setContrasena}
          onFocus={irAlBoton}
          secureTextEntry={oculta}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Contraseña"
          style={[estilos.clave, { color: paleta.texto }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={oculta ? 'mostrar contraseña' : 'ocultar contraseña'}
          onPress={() => setOculta((valor) => !valor)}
          hitSlop={8}
        >
          <Text style={[estilos.ojo, { color: paleta.textoSuave }]}>{oculta ? '◉' : '◎'}</Text>
        </Pressable>
      </View>

      {aviso ? (
        <Text accessibilityLiveRegion="polite" style={estilos.aviso}>
          {aviso}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="INICIO DE SESIÓN"
        onPress={() => {
          void iniciar();
        }}
        style={[estilos.boton, { backgroundColor: paleta.verdeLogin }]}
      >
        <Text style={estilos.botonTexto}>INICIO DE SESIÓN</Text>
      </Pressable>

      <View style={estilos.enlaces}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrarse"
          onPress={() => setAviso(AVISO_ETAPA)}
        >
          <Text style={[estilos.enlace, { color: paleta.verdeLogin }]}>Registrarse</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="¿Ha olvidado su contraseña?"
          onPress={() => setAviso(AVISO_ETAPA)}
        >
          <Text style={[estilos.enlace, { color: paleta.verdeLogin }]}>
            ¿Ha olvidado su contraseña?
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  atras: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  flecha: {
    fontSize: 28,
  },
  titulo: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 36,
  },
  etiqueta: {
    fontSize: 16,
  },
  espacio: {
    marginTop: 28,
  },
  campo: {
    borderBottomWidth: 1,
    fontSize: 18,
    paddingVertical: 10,
  },
  filaClave: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  clave: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 10,
  },
  ojo: {
    fontSize: 22,
    paddingHorizontal: 8,
  },
  aviso: {
    color: '#F2D27A',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 16,
  },
  boton: {
    marginTop: 28,
    borderRadius: 8,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  enlaces: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  enlace: {
    fontSize: 15,
    fontWeight: '600',
  },
});
