import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';

import { PantallaBienvenida } from '../bienvenida/PantallaBienvenida';
import { sembrarArranque, type OpcionArranque } from '../datos/arranque';
import { COLECCION_CARTERAS, COLECCION_TRANSACCIONES } from '../datos/consultas';
import { db } from '../datos/firebase';
import { necesitaArranque } from '../datos/historialEjemplo';
import { entrarConGoogle, observarAuth, salirDeAuth } from './auth';
import type { UsuarioSesion } from './usuario';

type EstadoDeSesion = {
  cargando: boolean;
  activa: boolean;
  usuario: UsuarioSesion | null;
  entrar: () => Promise<void>;
  salir: () => Promise<void>;
};

// La cuenta recién creada aún no eligió cómo arrancar: 'verificando' mientras
// llegan las escuchas, 'elegir' con la cuenta totalmente vacía y 'listo' en
// cuanto tiene una cartera o una transacción.
type EstadoArranque = 'verificando' | 'elegir' | 'listo';

const Contexto = createContext<EstadoDeSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [arranque, setArranque] = useState<EstadoArranque>('verificando');
  const [sembrando, setSembrando] = useState(false);

  useEffect(() => {
    const dejar = observarAuth((siguiente) => {
      setUsuario(siguiente);
      setCargando(false);
    });
    return dejar;
  }, []);

  // La pantalla de bienvenida (T015) reemplaza el sembrado automático: se
  // pregunta solo si la cuenta no tiene ni carteras ni transacciones. Las
  // dos escuchas viven: tras elegir (o tras el reset de Configuración) el
  // estado cambia solo y la pantalla aparece o desaparece.
  const uid = usuario?.uid;
  useEffect(() => {
    if (!uid) {
      setArranque('verificando');
      setSembrando(false);
      return;
    }
    setArranque('verificando');
    let carterasVacias: boolean | null = null;
    let transaccionesVacias: boolean | null = null;
    const evaluar = () => {
      if (carterasVacias === null || transaccionesVacias === null) {
        return;
      }
      // Un error de escucha cuenta como «tiene datos»: sin prueba no se
      // repregunta, y el error queda en consola.
      setArranque(
        necesitaArranque(carterasVacias ? 0 : 1, transaccionesVacias ? 0 : 1)
          ? 'elegir'
          : 'listo',
      );
    };
    const escuchar = (
      coleccion: string,
      poner: (vacio: boolean) => void,
    ) =>
      onSnapshot(
        query(collection(db, coleccion), where('uid', '==', uid), limit(1)),
        (instantanea) => {
          poner(instantanea.empty);
          evaluar();
        },
        (error) => {
          console.error(`No se pudo escuchar ${coleccion}:`, error);
          poner(false);
          evaluar();
        },
      );
    const dejarCarteras = escuchar(COLECCION_CARTERAS, (vacio) => {
      carterasVacias = vacio;
    });
    const dejarTransacciones = escuchar(COLECCION_TRANSACCIONES, (vacio) => {
      transaccionesVacias = vacio;
    });
    return () => {
      dejarCarteras();
      dejarTransacciones();
    };
  }, [uid]);

  const entrar = async () => {
    const siguiente = await entrarConGoogle();
    setUsuario(siguiente);
  };

  const salir = async () => {
    await salirDeAuth();
    setUsuario(null);
  };

  // Elige la persona una vez: siembra en un lote y la escucha viva cierra la
  // pantalla en cuanto aterriza. Falla en silencio (console.error) para no
  // bloquear la sesión; la guardia de sembrarArranque evita doble siembra.
  const elegirArranque = async (opcion: OpcionArranque) => {
    if (!uid || sembrando) {
      return;
    }
    setSembrando(true);
    try {
      await sembrarArranque(db, uid, opcion);
    } catch (error) {
      console.error('No se pudo preparar la cuenta:', error);
    } finally {
      setSembrando(false);
    }
  };

  return (
    <Contexto.Provider
      value={{ cargando, activa: usuario !== null, usuario, entrar, salir }}
    >
      {children}
      {usuario && arranque === 'elegir' ? (
        <PantallaBienvenida
          sembrando={sembrando}
          alElegir={(opcion) => {
            void elegirArranque(opcion);
          }}
        />
      ) : null}
    </Contexto.Provider>
  );
}

export function useSesion(): EstadoDeSesion {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('useSesion va dentro de ProveedorSesion');
  }
  return valor;
}
