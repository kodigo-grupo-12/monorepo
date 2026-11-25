import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cuentaDemo } from '../sesion/cuentaDemo';
import { usarSesion } from '../sesion/ProveedorSesion';
import { paleta } from '../tema/colores';

// Anatomía copiada de Assets/cuenta/modelo-pantalla-cuenta.png
// (kodigo-grupo-12/.github): header con Cuenta y Soporte, perfil de la
// cuenta demo (avatar con la inicial, banner CUENTA DEMO, nombre y correo),
// las listas Mis carteras/Categorías y Soporte/Configuraciones/Acerca, y
// Cerrar sesión en rojo separada del grupo. Se copia el patrón, no los
// assets ni las marcas ajenas. Los iconos van dibujados con vistas: Expo
// SDK 58 ya no trae un set de iconos, no se agrega ninguna dependencia
// nueva ni nada se pide por URL. Los datos del perfil salen de la cuenta
// demo existente.

const inicial = cuentaDemo.nombre.charAt(0).toUpperCase();

function IconoChevron() {
  return <View style={estilos.chevron} />;
}

function IconoSigno({ signo }: { signo: string }) {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.circulo, { borderColor: paleta.texto }]} />
      <Text style={[estilos.signo, { color: paleta.texto }]}>{signo}</Text>
    </View>
  );
}

function IconoCartera() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.cartera, { borderColor: paleta.texto }]} />
      <View style={[estilos.carteraRanura, { borderColor: paleta.texto }]} />
    </View>
  );
}

function IconoCaja() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.caja, { borderColor: paleta.texto }]} />
      <View style={[estilos.cajaTapa, { borderColor: paleta.texto }]} />
      <View style={[estilos.cajaLengüeta, { borderColor: paleta.texto }]} />
    </View>
  );
}

function IconoEngranaje() {
  const marcas = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <View style={estilos.icono}>
      <View style={[estilos.engranajeCentro, { borderColor: paleta.texto }]} />
      {marcas.map((angulo) => (
        <View
          key={angulo}
          style={[
            estilos.engranajeMarca,
            { backgroundColor: paleta.texto, transform: [{ rotate: `${angulo}deg` }, { translateY: -10 }] },
          ]}
        />
      ))}
    </View>
  );
}

function IconoApagado() {
  return (
    <View style={estilos.icono}>
      <View style={[estilos.apagadoLinea, { backgroundColor: paleta.rojo }]} />
      <View style={[estilos.apagadoPunta, { borderTopColor: paleta.rojo }]} />
      <View style={[estilos.apagadoBandeja, { backgroundColor: paleta.rojo }]} />
    </View>
  );
}

function BannerDemo() {
  return (
    <View style={estilos.banner}>
      <View style={[estilos.bannerAlaIzquierda, { borderRightColor: paleta.bannerSombra }]} />
      <View style={[estilos.bannerCuerpo, { backgroundColor: paleta.banner }]}>
        <Text style={estilos.bannerTexto}>CUENTA DEMO</Text>
      </View>
      <View style={[estilos.bannerAlaDerecha, { borderLeftColor: paleta.bannerSombra }]} />
    </View>
  );
}

function Fila({
  etiqueta,
  icono,
  alTocar,
  color = paleta.texto,
}: {
  etiqueta: string;
  icono: ReactNode;
  alTocar?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      style={estilos.fila}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alTocar}
    >
      {icono}
      <Text style={[estilos.filaEtiqueta, { color }]}>{etiqueta}</Text>
      <IconoChevron />
    </Pressable>
  );
}

export function PantallaCuenta() {
  const margenes = useSafeAreaInsets();
  const enrutador = useRouter();
  const { salir } = usarSesion();
  const verDesarrollo = () => enrutador.push('/desarrollo');
  // Enmienda puntual a la T005 (ADR-0011): las filas de esta tarea empujan
  // su pantalla real; el resto de filas sigue con el placeholder.
  const verCategorias = () => enrutador.push('/categorias');

  // Sin confirmación (ADR-0008): al borrar la marca, la guardia del grupo con
  // sesión manda a la entrada y el splash reinicia el recorrido completo.
  const cerrarSesion = async () => {
    await salir();
  };

  return (
    <ScrollView
      style={[estilos.contenedor, { backgroundColor: paleta.fondo }]}
      contentContainerStyle={{ paddingTop: margenes.top, paddingBottom: 24 }}
    >
      <View style={estilos.encabezado}>
        <Text style={[estilos.encabezadoTitulo, { color: paleta.texto }]}>Cuenta</Text>
        <Pressable
          style={estilos.encabezadoSoporte}
          accessibilityRole="button"
          accessibilityLabel="Soporte"
          onPress={verDesarrollo}
        >
          <Text style={[estilos.encabezadoSoporteTexto, { color: paleta.texto }]}>Soporte</Text>
          <IconoSigno signo="?" />
        </Pressable>
      </View>
      <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />

      <Pressable
        style={estilos.perfil}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${cuentaDemo.nombre}`}
        onPress={verDesarrollo}
      >
        <View style={estilos.perfilCentro}>
          <View style={[estilos.avatar, { backgroundColor: paleta.teal }]}>
            <Text style={estilos.avatarInicial}>{inicial}</Text>
          </View>
          <View style={estilos.bannerMontado}>
            <BannerDemo />
          </View>
        </View>
        <View style={estilos.perfilTextos}>
          <Text style={[estilos.perfilNombre, { color: paleta.texto }]}>{cuentaDemo.nombre}</Text>
          <Text style={[estilos.perfilCorreo, { color: paleta.textoSuave }]}>{cuentaDemo.correo}</Text>
        </View>
        <View style={estilos.perfilChevron}>
          <IconoChevron />
        </View>
      </Pressable>

      <View>
        <Fila etiqueta="Mis carteras" icono={<IconoCartera />} alTocar={verDesarrollo} />
        <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
        <Fila etiqueta="Categorías" icono={<IconoCaja />} alTocar={verCategorias} />
        <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
      </View>

      <View style={estilos.grupo}>
        <Fila etiqueta="Soporte" icono={<IconoSigno signo="?" />} alTocar={verDesarrollo} />
        <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
        <Fila etiqueta="Configuraciones" icono={<IconoEngranaje />} alTocar={verDesarrollo} />
        <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
        <Fila etiqueta="Acerca" icono={<IconoSigno signo="i" />} alTocar={verDesarrollo} />
        <View style={[estilos.linea, { backgroundColor: paleta.separador }]} />
      </View>

      <View style={estilos.grupoSalida}>
        <Fila etiqueta="Cerrar sesión" icono={<IconoApagado />} alTocar={cerrarSesion} color={paleta.rojo} />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  encabezadoTitulo: {
    fontSize: 32,
    fontWeight: '700',
  },
  encabezadoSoporte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  encabezadoSoporteTexto: {
    fontSize: 17,
  },
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  perfil: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 30,
  },
  perfilCentro: {
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInicial: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '700',
  },
  bannerMontado: {
    position: 'absolute',
    top: 74,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerAlaIzquierda: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  bannerCuerpo: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  bannerTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bannerAlaDerecha: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  perfilTextos: {
    alignItems: 'center',
    marginTop: 10,
  },
  perfilNombre: {
    fontSize: 22,
    fontWeight: '700',
  },
  perfilCorreo: {
    fontSize: 15,
    marginTop: 4,
  },
  perfilChevron: {
    position: 'absolute',
    right: 20,
    top: 60,
  },
  grupo: {
    marginTop: 24,
  },
  grupoSalida: {
    marginTop: 40,
    paddingBottom: 8,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  filaEtiqueta: {
    flex: 1,
    fontSize: 17,
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paleta.textoSuave,
    transform: [{ rotate: '45deg' }],
  },
  icono: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circulo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  signo: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartera: {
    width: 20,
    height: 15,
    borderRadius: 4,
    borderWidth: 2,
  },
  carteraRanura: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 4,
    height: 7,
    borderRadius: 2,
    borderLeftWidth: 2,
  },
  caja: {
    width: 18,
    height: 16,
    borderWidth: 2,
    borderRadius: 2,
  },
  cajaTapa: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: 18,
    height: 0,
    borderTopWidth: 2,
  },
  cajaLengüeta: {
    position: 'absolute',
    top: 4,
    left: 7,
    width: 4,
    height: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  engranajeCentro: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  engranajeMarca: {
    position: 'absolute',
    left: 10.5,
    top: 9.5,
    width: 3,
    height: 5,
    borderRadius: 1.5,
  },
  apagadoLinea: {
    position: 'absolute',
    top: 3,
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  apagadoPunta: {
    position: 'absolute',
    top: 12,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  apagadoBandeja: {
    position: 'absolute',
    bottom: 2,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
});
