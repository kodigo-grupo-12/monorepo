import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Prueba estática, sin emulador y sin red (mismo patrón de
// tests/cableado-emuladores.test.ts): el navbar lleva el diseño aprobado
// por el dueño el 2026-11-26 (barra oscura con hairline, activo verde con
// punto, robot en Agente, + prominente elevado, badge de vencimientos y
// contenido centrado en pantallas anchas).

const raiz = resolve(import.meta.dirname, '..');
const navbar = readFileSync(resolve(raiz, 'apps/cuentame/src/nav/Navbar.tsx'), 'utf8');
const inicio = readFileSync(resolve(raiz, 'apps/cuentame/src/inicio/PantallaInicio.tsx'), 'utf8');
const calculos = readFileSync(resolve(raiz, 'apps/cuentame/src/compromisos/calculos.ts'), 'utf8');

describe('Rediseño del navbar', () => {
  it('la barra es oscura con hairline separadora', () => {
    expect(navbar).toContain('backgroundColor: paleta.fondo');
    expect(navbar).toContain('borderTopColor: paleta.separador');
  });

  it('el tab activo pinta verde y lleva el punto debajo de la etiqueta', () => {
    expect(navbar).toContain('activo ? paleta.verdeLogin : paleta.textoSuave');
    expect(navbar).toContain('puntoActivo');
  });

  it('el Agente usa el glifo robot', () => {
    expect(navbar).toContain("require('../../assets/glifos/agente-robot.png')");
  });

  it('el + es prominente y se eleva sobre la barra', () => {
    expect(navbar).toContain('translateY: -18');
    expect(navbar).toContain('width: 64');
  });

  it('el badge de Inicio usa la misma lógica del aviso diario (#137)', () => {
    expect(navbar).toContain('vencimientosApurados');
    expect(navbar).toContain('rojoMonto');
    expect(inicio).toContain('vencimientosApurados');
    expect(calculos).toContain('export function vencimientosApurados');
  });

  it('en pantallas anchas el contenido se centra con un tope de ancho', () => {
    expect(navbar).toContain('ANCHO_CONTENIDO');
    expect(navbar).toContain('contenidoCentrado');
  });
});
