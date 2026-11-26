[1mdiff --git a/apps/cuentame/src/carteras/IconoBilletera.tsx b/apps/cuentame/src/carteras/IconoBilletera.tsx[m
[1mdeleted file mode 100644[m
[1mindex 63c77ec..0000000[m
[1m--- a/apps/cuentame/src/carteras/IconoBilletera.tsx[m
[1m+++ /dev/null[m
[36m@@ -1,38 +0,0 @@[m
[31m-import { StyleSheet, View } from 'react-native';[m
[31m-[m
[31m-import { paleta } from '../tema/colores';[m
[31m-[m
[31m-// Glifo de billetera dibujado con vistas, como quedó en la T004: Expo SDK 58[m
[31m-// ya no trae un set de iconos y no se agrega ninguna dependencia nueva.[m
[31m-export function IconoBilletera({ fondo = paleta.teal }: { fondo?: string }) {[m
[31m-  return ([m
[31m-    <View style={[estilos.circulo, { backgroundColor: fondo }]}>[m
[31m-      <View style={estilos.cuerpo} />[m
[31m-      <View style={[estilos.ranura, { backgroundColor: fondo }]} />[m
[31m-    </View>[m
[31m-  );[m
[31m-}[m
[31m-[m
[31m-const estilos = StyleSheet.create({[m
[31m-  circulo: {[m
[31m-    width: 22,[m
[31m-    height: 22,[m
[31m-    borderRadius: 11,[m
[31m-    alignItems: 'center',[m
[31m-    justifyContent: 'center',[m
[31m-  },[m
[31m-  cuerpo: {[m
[31m-    width: 12,[m
[31m-    height: 9,[m
[31m-    borderRadius: 2,[m
[31m-    backgroundColor: '#FFFFFF',[m
[31m-  },[m
[31m-  ranura: {[m
[31m-    position: 'absolute',[m
[31m-    right: 4,[m
[31m-    top: 7.5,[m
[31m-    width: 3,[m
[31m-    height: 4,[m
[31m-    borderRadius: 1,[m
[31m-  },[m
[31m-});[m
[1mdiff --git a/apps/cuentame/src/carteras/PantallaCarteras.tsx b/apps/cuentame/src/carteras/PantallaCarteras.tsx[m
[1mindex f4096e5..7c6c000 100644[m
[1m--- a/apps/cuentame/src/carteras/PantallaCarteras.tsx[m
[1m+++ b/apps/cuentame/src/carteras/PantallaCarteras.tsx[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';[m
[32m+[m[32m﻿import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';[m
 import { useRouter } from 'expo-router';[m
 import { useSafeAreaInsets } from 'react-native-safe-area-context';[m
 [m
[36m@@ -6,7 +6,7 @@[m [mimport { useCarteras } from '../datos/useCarteras';[m
 import type { Cartera } from '../datos/carteras';[m
 import { useTransacciones } from '../datos/useTransacciones';[m
 import { paleta } from '../tema/colores';[m
[31m-import { IconoBilletera } from './IconoBilletera';[m
[32m+[m[32mimport { IconoCartera } from './IconoCartera';[m
 [m
 // Anatomía copiada de Assets/carteras/modelo-pantalla-carteras.png[m
 // (kodigo-grupo-12/.github): header con flecha de atrás y título, encabezado[m
[36m@@ -59,7 +59,7 @@[m [mexport function PantallaCarteras() {[m
         {cargando ? null : carteras.map((cartera, indice) => ([m
           <View key={cartera.id ?? cartera.nombre}>[m
             <View style={estilos.fila}>[m
[31m-              <IconoBilletera />[m
[32m+[m[32m              <IconoCartera />[m
               <View style={estilos.textos}>[m
                 <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>[m
                   {cartera.nombre}[m
[1mdiff --git a/apps/cuentame/src/carteras/PantallaNuevaCartera.tsx b/apps/cuentame/src/carteras/PantallaNuevaCartera.tsx[m
[1mindex 742e6e9..0659da5 100644[m
[1m--- a/apps/cuentame/src/carteras/PantallaNuevaCartera.tsx[m
[1m+++ b/apps/cuentame/src/carteras/PantallaNuevaCartera.tsx[m
[36m@@ -1,11 +1,11 @@[m
[31m-import { useState } from 'react';[m
[32m+[m[32m﻿import { useState } from 'react';[m
 import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';[m
 import { useRouter } from 'expo-router';[m
 import { useSafeAreaInsets } from 'react-native-safe-area-context';[m
 [m
 import { crearCartera } from '../datos/carteras';[m
 import { paleta } from '../tema/colores';[m
[31m-import { IconoBilletera } from './IconoBilletera';[m
[32m+[m[32mimport { IconoCartera } from './IconoCartera';[m
 [m
 // Anatomía de Assets/carteras/referencia-pantalla-nueva-cartera.png con las[m
 // adaptaciones del spec #54: SIN campo Moneda (USD implícito), SIN saldo[m
[36m@@ -52,7 +52,7 @@[m [mexport function PantallaNuevaCartera() {[m
 [m
       <View style={[estilos.cuerpo, { paddingBottom: margenes.bottom + 24 }]}>[m
         <View style={estilos.filaNombre}>[m
[31m-          <IconoBilletera />[m
[32m+[m[32m          <IconoCartera />[m
           <TextInput[m
             style={[estilos.entrada, { color: paleta.texto }]}[m
             value={nombre}[m
[1mdiff --git a/apps/cuentame/src/transacciones/ModalAgregarTransaccion.tsx b/apps/cuentame/src/transacciones/ModalAgregarTransaccion.tsx[m
[1mindex 6ae33cc..2fa1d98 100644[m
[1m--- a/apps/cuentame/src/transacciones/ModalAgregarTransaccion.tsx[m
[1m+++ b/apps/cuentame/src/transacciones/ModalAgregarTransaccion.tsx[m
[36m@@ -1,4 +1,4 @@[m
[31m-import { useEffect, useState } from 'react';[m
[32m+[m[32m﻿import { useEffect, useState } from 'react';[m
 import {[m
   Modal,[m
   Platform,[m
[36m@@ -21,7 +21,7 @@[m [mimport { crearCategoria } from '../datos/categorias';[m
 import { useCategorias } from '../datos/useCategorias';[m
 import { crearCartera } from '../datos/carteras';[m
 import { useCarteras } from '../datos/useCarteras';[m
[31m-import { IconoBilletera } from '../carteras/IconoBilletera';[m
[32m+[m[32mimport { IconoCartera } from '../carteras/IconoCartera';[m
 import { actualizarTransaccion } from '../datos/transacciones';[m
 import type { Transaccion } from '../datos/transacciones';[m
 import { GlifoCategoria } from '../categorias/GlifoCategoria';[m
[36m@@ -349,7 +349,7 @@[m [mexport function ModalAgregarTransaccion({ visible, alCerrar, transaccion }: Prop[m
                     setVista('form');[m
                   }}[m
                 >[m
[31m-                  <IconoBilletera />[m
[32m+[m[32m                  <IconoCartera />[m
                   <Text style={[estilos.filaTexto, { color: paleta.texto, flex: 1 }]} numberOfLines={1}>[m
                     {cartera.nombre}[m
                   </Text>[m
[36m@@ -423,7 +423,7 @@[m [mexport function ModalAgregarTransaccion({ visible, alCerrar, transaccion }: Prop[m
               onPress={() => setVista('cartera')}[m
             >[m
               {carteraSeleccionada ? ([m
[31m-                <IconoBilletera />[m
[32m+[m[32m                <IconoCartera />[m
               ) : ([m
                 <View style={estilos.billetera}>[m
                   <View style={estilos.billeteraMoneda} />[m
