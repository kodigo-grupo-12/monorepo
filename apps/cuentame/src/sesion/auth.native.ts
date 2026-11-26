import type { UsuarioSesion } from './usuario';

export function observarAuth(escucha: (usuario: UsuarioSesion | null) => void): () => void {
  escucha(null);
  return () => {};
}

export async function entrarConGoogle(): Promise<UsuarioSesion> {
  const error = new Error('Por ahora Cuéntame se usa en el navegador.') as Error & {
    code: string;
  };
  error.code = 'cuentame/solo-web';
  throw error;
}

export async function salirDeAuth(): Promise<void> {}
