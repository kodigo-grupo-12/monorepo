import { defineConfig } from 'vitest/config';

// Las pruebas del Agente (T011, #113) corren solas, sin red ni emulador:
// funciones puras y orquestador con un modelo falso.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
