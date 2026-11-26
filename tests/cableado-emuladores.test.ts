import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Prueba estática, sin emulador y sin red: el cableado de emuladores solo se
// activa con EXPO_PUBLIC_USAR_EMULADORES=1, Pages nunca lo activa y ningún
// workflow despliega nada a producción.

const raiz = resolve(import.meta.dirname, '..');

function bloqueDelGuardia(fuente: string): string {
  const lineas = fuente.split('\n');
  const inicio = lineas.findIndex((linea) => linea.includes('if (USAR_EMULADORES) {'));
  expect(inicio).toBeGreaterThanOrEqual(0);
  let abiertas = 0;
  for (let i = inicio; i < lineas.length; i += 1) {
    abiertas += (lineas[i].match(/\{/g) ?? []).length;
    abiertas -= (lineas[i].match(/\}/g) ?? []).length;
    if (i > inicio && abiertas === 0) {
      return lineas.slice(inicio, i + 1).join('\n');
    }
  }
  throw new Error('No se encontró el cierre del guardia de emuladores');
}

function llamadaDentroDelGuardia(archivo: string, llamada: string): void {
  const fuente = readFileSync(resolve(raiz, archivo), 'utf8');
  expect(
    fuente.includes("process.env.EXPO_PUBLIC_USAR_EMULADORES === '1'"),
    `${archivo} debe leer la variable de forma estática`,
  ).toBe(true);
  const llamadaIndex = fuente.indexOf(llamada);
  expect(llamadaIndex, `${archivo} debe llamar a ${llamada}`).toBeGreaterThan(-1);
  expect(bloqueDelGuardia(fuente)).toContain(llamada);
}

describe('Cableado de emuladores', () => {
  it('firebase.ts solo conecta al emulador dentro del guardia de la variable', () => {
    llamadaDentroDelGuardia('apps/cuentame/src/datos/firebase.ts', 'connectFirestoreEmulator(');
  });

  it('auth.ts solo conecta al emulador dentro del guardia de la variable', () => {
    llamadaDentroDelGuardia('apps/cuentame/src/sesion/auth.ts', 'connectAuthEmulator(');
  });

  it('el workflow de Pages no menciona EXPO_PUBLIC_USAR_EMULADORES', () => {
    const paginas = readFileSync(resolve(raiz, '.github/workflows/paginas.yml'), 'utf8');
    expect(paginas).not.toContain('EXPO_PUBLIC_USAR_EMULADORES');
  });

  it('ningún workflow despliega a producción', () => {
    const carpeta = resolve(raiz, '.github/workflows');
    const archivos = readdirSync(carpeta).filter((nombre) => nombre.endsWith('.yml') || nombre.endsWith('.yaml'));
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      const texto = readFileSync(join(carpeta, archivo), 'utf8');
      expect(texto, `${archivo} no debe desplegar Firebase`).not.toMatch(/firebase deploy|deploy-firestore/);
    }
  });
});
