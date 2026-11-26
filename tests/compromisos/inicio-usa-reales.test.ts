import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Prueba estática, sin emulador y sin red (mismo patrón de
// tests/cableado-emuladores.test.ts): el análisis de Inicio solo cuenta los
// movimientos reales, y el saldo y lo disponible siguen contando todo
// (ADR-0019).

const raiz = resolve(import.meta.dirname, '..', '..');
const fuente = readFileSync(resolve(raiz, 'apps/cuentame/src/inicio/PantallaInicio.tsx'), 'utf8');

function entre(desde: string, hasta: string): string {
  const inicio = fuente.indexOf(desde);
  const fin = fuente.indexOf(hasta, inicio + 1);
  expect(inicio, `PantallaInicio.tsx debe declarar ${desde}`).toBeGreaterThan(-1);
  expect(fin, `PantallaInicio.tsx debe seguir con ${hasta}`).toBeGreaterThan(inicio);
  return fuente.slice(inicio, fin);
}

describe('Inicio usa reales en el análisis', () => {
  it('reales sale de esMovimientoReal y lleva el comentario de ADR-0019', () => {
    const declaracion = fuente.indexOf('const reales = transacciones.filter(esMovimientoReal)');
    expect(declaracion).toBeGreaterThan(-1);
    expect(fuente.slice(Math.max(0, declaracion - 200), declaracion)).toContain('ADR-0019');
  });

  it('el gráfico y las barras iteran reales', () => {
    expect(entre('const gastoEn', 'const gastoActual')).toContain('reales.reduce');
    expect(entre('const gastoPorDia', 'const topeDia')).toContain('reales.reduce');
  });

  it('el desglose por categoría itera reales', () => {
    expect(entre('const gastoPorCategoria', 'const desglose')).toContain('of reales');
  });

  it('el saldo y lo disponible siguen contando todo', () => {
    expect(entre('const saldoTotal', 'const saldoDeCartera')).not.toContain('reales');
    expect(entre('const saldoDeCartera', '// Seguro para gastar hoy')).not.toContain('reales');
    expect(entre('const delMes', 'const diasRestantes')).not.toContain('reales');
    expect(entre('const recientes', 'const etiquetaDeDia')).not.toContain('reales');
  });
});

// Hallazgo de la corrida de capturas del 2026-11-26: al editar una
// transacción amarrada (ingreso) el segmento quedaba marcado en Gasto porque
// la rama de edición sincronizaba el tipo pero no el segmento.
describe('el modal de edición refleja el tipo en el segmento', () => {
  it('la rama de edición sincroniza el segmento con el tipo de la transacción', () => {
    const modal = readFileSync(resolve(raiz, 'apps/cuentame/src/transacciones/ModalAgregarTransaccion.tsx'), 'utf8');
    expect(modal).toContain('setTipo(transaccion.tipo);');
    expect(modal).toContain('setSegmento(transaccion.tipo);');
  });
});
