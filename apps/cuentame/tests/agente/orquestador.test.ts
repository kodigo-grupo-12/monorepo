import { describe, expect, it } from 'vitest';

import { DECLARACIONES_HERRAMIENTAS } from '../../src/agente/declaraciones';
import { preguntar, type PeticionOrquestador } from '../../src/agente/orquestador';
import type { MensajeAgente, ModeloAgente, RespuestaModelo } from '../../src/agente/modelo';
import type { Transaccion } from '../../src/datos/transacciones';

let contador = 0;
function transaccion(fecha: string, monto: number, categoriaId?: string): Transaccion {
  contador += 1;
  return { id: `t${contador}`, tipo: 'gasto', monto, fecha, cuenta: 'demo', nota: 'secreto', ...(categoriaId === undefined ? {} : { categoria_id: categoriaId }) };
}

const DATOS = {
  transacciones: [
    transaccion('2026-11-15', 12.5, 'c1'),
    transaccion('2026-11-20', 7, 'c1'),
  ],
  categorias: [{ id: 'c1', nombre: 'Comida y bebida', tipo: 'gasto' as const }],
};

// Modelo falso guionado: devuelve la siguiente respuesta del guion y
// guarda todo lo que recibe para inspeccionarlo.
class ModeloFalso implements ModeloAgente {
  guion: RespuestaModelo[] = [];
  envios: { instrucciones: string; herramientas: typeof DECLARACIONES_HERRAMIENTAS; mensajes: MensajeAgente[] }[] = [];
  errores: unknown[] = [];

  async enviar(peticion: { instrucciones: string; herramientas: typeof DECLARACIONES_HERRAMIENTAS; mensajes: MensajeAgente[] }) {
    this.envios.push(peticion);
    if (this.errores.length > 0) throw this.errores.shift();
    return this.guion.shift() ?? { tipo: 'texto', texto: 'fin' };
  }
}

function peticion(modelo: ModeloAgente, extras: Partial<PeticionOrquestador> = {}): PeticionOrquestador {
  return {
    pregunta: '¿Cuánto gasté en Comida y bebida este año?',
    historial: [],
    datos: DATOS,
    cargando: false,
    ahora: new Date('2026-11-26T18:00:00Z'),
    modelo,
    ...extras,
  };
}

describe('orquestador', () => {
  it('ejecuta las herramientas pedidas y devuelve sus resultados al modelo con el mismo id', async () => {
    const modelo = new ModeloFalso();
    modelo.guion = [
      { tipo: 'herramientas', llamadas: [{ id: 'a', nombre: 'resolver_categoria', argumentos: { texto: 'comida' } }] },
      { tipo: 'herramientas', llamadas: [{ id: 'b', nombre: 'total_por_categoria', argumentos: { categoriaId: 'c1', periodo: 'este_anio' } }] },
      { tipo: 'texto', texto: 'Gastaste 19.50 en Comida y bebida en 2026.' },
    ];
    const respuesta = await preguntar(peticion(modelo));
    expect(respuesta).toEqual({
      tipo: 'respuesta',
      texto: 'Gastaste 19.50 en Comida y bebida en 2026.',
      historial: expect.any(Array),
    });
    // La primera herramienta resolvió sobre los datos vivos.
    const resultados1 = modelo.envios[1].mensajes.at(-1);
    expect(resultados1).toMatchObject({ rol: 'herramienta' });
    if (resultados1?.rol === 'herramienta') {
      expect(resultados1.resultados).toEqual([
        { id: 'a', nombre: 'resolver_categoria', resultado: { estado: 'una', categoria: { id: 'c1', nombre: 'Comida y bebida', tipo: 'gasto' } } },
      ]);
    }
    // La segunda volvió con el total real y su id intacto.
    const resultados2 = modelo.envios[2].mensajes.at(-1);
    if (resultados2?.rol === 'herramienta') {
      expect(resultados2.resultados[0]).toMatchObject({ id: 'b', nombre: 'total_por_categoria', resultado: { total: 19.5, cantidad: 2 } });
    }
  });

  it('un modelo que pide herramientas en 5 rondas recibe 4 rondas de resultados y el mensaje de tope', async () => {
    const modelo = new ModeloFalso();
    modelo.guion = Array.from({ length: 5 }, () => ({
      tipo: 'herramientas' as const,
      llamadas: [{ nombre: 'gasto_del_mes', argumentos: {} }],
    }));
    const respuesta = await preguntar(peticion(modelo));
    expect(respuesta.tipo).toBe('respuesta');
    if (respuesta.tipo === 'respuesta') {
      expect(respuesta.texto).toBe('No pude calcularlo con mis herramientas. Probá con una pregunta más concreta.');
    }
    expect(modelo.envios).toHaveLength(5);
    expect(modelo.envios[4].mensajes.filter((mensaje) => mensaje.rol === 'herramienta')).toHaveLength(4);
  });

  it('convierte periodo a desde/hasta con el hoy de El Salvador', async () => {
    const modelo = new ModeloFalso();
    modelo.guion = [
      { tipo: 'herramientas', llamadas: [{ nombre: 'total_por_categoria', argumentos: { categoriaId: 'c1', periodo: 'este_mes' } }] },
      { tipo: 'texto', texto: 'ok' },
    ];
    await preguntar(peticion(modelo, { ahora: new Date('2026-12-01T03:00:00Z') }));
    const resultados = modelo.envios[1].mensajes.at(-1);
    if (resultados?.rol === 'herramienta') {
      expect(resultados.resultados[0]).toMatchObject({
        resultado: { rango: { desde: '2026-11-01', hasta: '2026-11-30' } },
      });
    }
  });

  it('una herramienta desconocida y una con argumentos inválidos devuelven error en español, no lanzan', async () => {
    const modelo = new ModeloFalso();
    modelo.guion = [
      { tipo: 'herramientas', llamadas: [{ nombre: 'borrar_todo', argumentos: {} }, { nombre: 'total_por_categoria', argumentos: { periodo: 'mañana' } }] },
      { tipo: 'texto', texto: 'entendido' },
    ];
    await preguntar(peticion(modelo));
    const resultados = modelo.envios[1].mensajes.at(-1);
    if (resultados?.rol === 'herramienta') {
      expect(resultados.resultados[0]).toMatchObject({ resultado: { error: 'No reconozco esa herramienta.' } });
      expect(resultados.resultados[1]).toMatchObject({ resultado: { error: 'El período no es válido.' } });
    }
  });

  it('con cargando devuelve esperando y el modelo no recibe ninguna llamada', async () => {
    const modelo = new ModeloFalso();
    const respuesta = await preguntar(peticion(modelo, { cargando: true }));
    expect(respuesta).toEqual({ tipo: 'esperando' });
    expect(modelo.envios).toHaveLength(0);
  });

  it('los errores del modelo terminan en mensajes en español sin códigos', async () => {
    const casos: { error: unknown; esperado: string }[] = [
      { error: Object.assign(new Error('Quota exceeded'), { code: 429 }), esperado: 'Se acabó la cuota gratis del Agente por ahora. Intentá de nuevo en un rato.' },
      { error: Object.assign(new Error('fallo'), { code: 'APP_CHECK_REJECTED' }), esperado: 'El Agente no está disponible por ahora (App Check rechazó la llamada). Avisale al equipo.' },
      { error: new TypeError('Failed to fetch'), esperado: 'No hay conexión. Revisá la red e intentá de nuevo.' },
      { error: Object.assign(new Error('off'), { code: 'API_NOT_ENABLED' }), esperado: 'El Agente todavía no está activado en el proyecto. Avisale al equipo.' },
    ];
    for (const caso of casos) {
      const modelo = new ModeloFalso();
      modelo.errores = [caso.error];
      const respuesta = await preguntar(peticion(modelo));
      expect(respuesta).toMatchObject({ tipo: 'respuesta', texto: caso.esperado });
      expect(respuesta.tipo === 'respuesta' ? respuesta.texto : '').not.toMatch(/\b429\b|FETCH_ERROR|API_NOT_ENABLED|APP_CHECK/);
    }
  });

  it('al modelo nunca le llegan notas, adjuntos ni arreglos con forma de transacción', async () => {
    const modelo = new ModeloFalso();
    modelo.guion = [
      { tipo: 'herramientas', llamadas: [{ nombre: 'dia_con_mas_gasto', argumentos: {} }] },
      { tipo: 'texto', texto: 'listo' },
    ];
    await preguntar(peticion(modelo));

    function clavesProhibidas(valor: unknown): string[] {
      if (Array.isArray(valor)) return valor.flatMap(clavesProhibidas);
      if (valor !== null && typeof valor === 'object') {
        return Object.entries(valor as Record<string, unknown>).flatMap(([clave, hijo]) =>
          ['nota', 'imagen', 'foto'].includes(clave) ? [clave] : clavesProhibidas(hijo),
        );
      }
      return [];
    }
    for (const envio of modelo.envios) {
      expect(clavesProhibidas(envio.mensajes)).toEqual([]);
      // Ningún elemento tiene la forma de una transacción.
      for (const mensaje of envio.mensajes) {
        expect(JSON.stringify(mensaje)).not.toMatch(/"cuenta":\s*"demo"/);
        expect(JSON.stringify(mensaje)).not.toMatch(/"tipo":\s*"(gasto|ingreso)"/);
      }
    }
  });
});
