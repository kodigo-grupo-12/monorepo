import {
  connectAuthEmulator,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

import { firebase } from '../datos/firebase';
import type { UsuarioSesion } from './usuario';

// Solo la web local contra los emuladores (pnpm emuladores). Acceso estático
// porque Metro solo inlina process.env.EXPO_PUBLIC_* literales.
const USAR_EMULADORES = process.env.EXPO_PUBLIC_USAR_EMULADORES === '1';

const autenticacion = getAuth(firebase);

// Igual que en firebase.ts: solo con la variable encendida, y nunca desde
// Pages ni el CI (que no definen la variable).
if (USAR_EMULADORES) {
  connectAuthEmulator(autenticacion, 'http://127.0.0.1:9099', { disableWarnings: true });
}
const proveedorGoogle = new GoogleAuthProvider();
proveedorGoogle.setCustomParameters({ prompt: 'select_account' });

const ESPERA_TRAS_FOCO_MS = 2500;
const PULSO_MS = 200;

function errorPopupCerrado(): Error & { code: string } {
  const error = new Error(
    'Cerraste la ventana de Google antes de entrar. Vuelve a intentarlo.',
  ) as Error & { code: string };
  error.code = 'auth/popup-closed-by-user';
  return error;
}

function deUsuarioFirebase(usuario: User): UsuarioSesion {
  const correo = usuario.email ?? '';
  const nombre =
    usuario.displayName?.trim() ||
    correo.split('@')[0] ||
    'Cuenta';

  return {
    uid: usuario.uid,
    nombre,
    correo,
    foto: usuario.photoURL,
  };
}

export function observarAuth(escucha: (usuario: UsuarioSesion | null) => void): () => void {
  return onAuthStateChanged(autenticacion, (usuario) => {
    escucha(usuario ? deUsuarioFirebase(usuario) : null);
  });
}

function usuarioActual(): UsuarioSesion | null {
  return autenticacion.currentUser ? deUsuarioFirebase(autenticacion.currentUser) : null;
}

export function uidDeSesion(): string {
  const usuario = autenticacion.currentUser;
  if (!usuario) {
    throw new Error('No hay sesión activa');
  }
  return usuario.uid;
}

// Chrome con COOP a veces no deja a Firebase leer window.closed. El foco en
// la ventana principal no basta para rechazar: el popup puede haberse cerrado
// porque la persona ya eligió la cuenta y Auth todavía canjea la credencial.
export async function entrarConGoogle(): Promise<UsuarioSesion> {
  return new Promise((resolve, reject) => {
    let listo = false;
    let pulso: ReturnType<typeof setInterval> | undefined;

    let dejarAuth = () => {};

    const terminar = (fn: () => void) => {
      if (listo) {
        return;
      }
      listo = true;
      window.removeEventListener('focus', alFoco);
      if (pulso !== undefined) {
        clearInterval(pulso);
      }
      dejarAuth();
      fn();
    };

    const aceptarSiHaySesion = (): boolean => {
      const usuario = usuarioActual();
      if (!usuario) {
        return false;
      }
      terminar(() => resolve(usuario));
      return true;
    };

    dejarAuth = onAuthStateChanged(autenticacion, (usuario) => {
      if (usuario) {
        terminar(() => resolve(deUsuarioFirebase(usuario)));
      }
    });

    const alFoco = () => {
      if (listo || pulso !== undefined) {
        return;
      }
      const inicio = Date.now();
      pulso = setInterval(() => {
        if (aceptarSiHaySesion()) {
          return;
        }
        if (Date.now() - inicio >= ESPERA_TRAS_FOCO_MS) {
          terminar(() => reject(errorPopupCerrado()));
        }
      }, PULSO_MS);
    };

    window.addEventListener('focus', alFoco);

    signInWithPopup(autenticacion, proveedorGoogle, browserPopupRedirectResolver).then(
      (credencial) => terminar(() => resolve(deUsuarioFirebase(credencial.user))),
      (error) => {
        if (!aceptarSiHaySesion()) {
          terminar(() => reject(error));
        }
      },
    );
  });
}

export async function salirDeAuth(): Promise<void> {
  await signOut(autenticacion);
}
