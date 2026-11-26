import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAjustes } from '../ajustes/ProveedorAjustes';
import { suscribirseAvisos, type Aviso } from './avisos';
import { ToastAviso } from './ToastAviso';

// Receptor único de avisos (T013): se monta una vez en el layout de la
// sesión y pinta el último aviso sobre el navbar. El ajuste de avisos lo
// apaga por completo.
export function AvisosGlobal() {
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const { ajustes } = useAjustes();
  const margenes = useSafeAreaInsets();
  const alOcultar = useCallback(() => setAviso(null), []);

  useEffect(() => suscribirseAvisos((nuevo) => setAviso(nuevo)), []);

  if (!ajustes.avisos || !aviso) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[estilos.zona, { bottom: margenes.bottom + 92 }]}>
      <ToastAviso aviso={aviso} alOcultar={alOcultar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  zona: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
