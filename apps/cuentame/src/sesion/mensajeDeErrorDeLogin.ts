const MENSAJES: Record<string, string> = {
  'auth/popup-closed-by-user':
    'Cerraste la ventana de Google antes de entrar. Vuelve a intentarlo.',
  'auth/cancelled-popup-request':
    'Cerraste la ventana de Google antes de entrar. Vuelve a intentarlo.',
  'auth/user-cancelled': 'Cancelaste el acceso con Google. Vuelve a intentarlo.',
  'auth/popup-blocked':
    'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
  'auth/network-request-failed':
    'No hay conexión. Revisa la red e inténtalo de nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada y no puede entrar.',
  'auth/operation-not-allowed':
    'El acceso con Google no está disponible ahora.',
  'auth/configuration-not-found':
    'El acceso con Google no está disponible ahora.',
  'auth/unauthorized-domain':
    'Este sitio no está autorizado para entrar con Google.',
  'auth/too-many-requests':
    'Hay demasiados intentos. Espera un momento e inténtalo de nuevo.',
  'auth/account-exists-with-different-credential':
    'Ese correo ya está asociado a otra forma de entrar.',
  'cuentame/solo-web': 'Por ahora Cuéntame se usa en el navegador.',
};

const GENERICO = 'No se pudo entrar con Google. Inténtalo de nuevo.';

function codigoDeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const codigo = (error as { code: unknown }).code;
    if (typeof codigo === 'string') {
      return codigo;
    }
  }
  return '';
}

function textoDeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const mensaje = (error as { message: unknown }).message;
    if (typeof mensaje === 'string') {
      return mensaje;
    }
  }
  return '';
}

export function mensajeDeErrorDeLogin(error: unknown): string {
  const codigo = codigoDeError(error);
  if (codigo && MENSAJES[codigo]) {
    return MENSAJES[codigo];
  }
  const texto = `${codigo} ${textoDeError(error)}`;
  if (texto.includes('CONFIGURATION_NOT_FOUND')) {
    return MENSAJES['auth/configuration-not-found'];
  }
  return GENERICO;
}
