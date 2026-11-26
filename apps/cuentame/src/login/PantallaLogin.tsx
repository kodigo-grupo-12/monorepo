import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mensajeDeErrorDeLogin } from '../sesion/mensajeDeErrorDeLogin';
import { useSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

const AVISO_SOLO_WEB = 'Por ahora Cuéntame se usa en el navegador.';
const enWeb = Platform.OS === 'web';

export function PantallaLogin() {
  const enrutador = useRouter();
  const margenes = useSafeAreaInsets();
  const { entrar, activa } = useSesion();
  const entrando = useRef(false);
  const [aviso, setAviso] = useState(enWeb ? '' : AVISO_SOLO_WEB);

  // Si Auth abre la sesión (aunque entrar() se haya rechazado por un foco
  // prematuro), Login no se queda atrás: va al inicio.
  useEffect(() => {
    if (activa) {
      enrutador.replace('/');
    }
  }, [activa, enrutador]);

  const iniciar = async () => {
    if (!enWeb || entrando.current) {
      return;
    }

    entrando.current = true;
    setAviso('');
    try {
      await entrar();
      enrutador.replace('/');
    } catch (error) {
      setAviso(mensajeDeErrorDeLogin(error));
    } finally {
      entrando.current = false;
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: paleta.fondo }}
      contentContainerStyle={[
        estilos.contenido,
        {
          paddingTop: Math.max(margenes.top, 12),
          paddingBottom: Math.max(margenes.bottom, 24),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="atrás"
        onPress={() => enrutador.back()}
        style={estilos.atras}
      >
        <Text style={[estilos.flecha, { color: paleta.texto }]}>←</Text>
      </Pressable>

      <Text style={[estilos.titulo, { color: paleta.texto }]}>Inicio de sesión</Text>

      {enWeb ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar con Google"
          onPress={() => {
            void iniciar();
          }}
          style={[estilos.boton, { backgroundColor: paleta.verdeLogin }]}
        >
          <Text style={estilos.botonTexto}>Continuar con Google</Text>
        </Pressable>
      ) : null}

      {aviso ? (
        <Text accessibilityLiveRegion="polite" style={estilos.aviso}>
          {aviso}
        </Text>
      ) : null}
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
  aviso: {
    color: '#F2D27A',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 16,
  },
  boton: {
    marginTop: 12,
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
});
