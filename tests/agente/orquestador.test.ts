import { describe, expect, it } from 'vitest';

import type { Categoria } from '../../apps/cuentame/src/datos/categorias';
import type { Transaccion } from '../../apps/cuentame/src/datos/transacciones';
import { MODELO_AGENTE, TOPE_RONDAS } from '../../apps/cuentame/src/agente/config';
import { mensajeDeErrorDelAgente } from '../../apps/cuentame/src/agente/errores';
import type { DatosAgente } from '../../apps/cuentame/src/agente/herramientas';
import type {
  MensajeAgente,
  ModeloAgente,
  PeticionAlModelo,
  RespuestaModelo,
} from '../../apps/cuentame/src/agente/modelo';
import { preguntar } from '../../apps/cuentame/src/agente/orquestador';

const CATEGORIAS: Categoria[] = [
  { id: 'c-transporte', nombre: 'Transporte', tipo: 'gasto' },
  { id: 'c-salario', nombre: 'Salario', tipo: 'ingreso' },
];

function tx(tipo: 'gasto' | 'ingreso', monto: number, fecha: string, categoriaId?: string): Transaccion {
  return {
    id: `t-${fecha}-${monto}`,
    uid: 'u1',
    tipo,
    monto,
    fecha,
    categoria_id: categoriaId,
    nota: `nota privada de ${fecha}`,
    imagen: 'base64-privado',
  };
}

const AHORA = new Date('2026-12-01T03:00:00Z'); // 21:00 del 30 de noviembre en El Salvador
const DATOS: DatosAgente = {
  transacciones: [
    tx('gasto', 9, '2026-11-15', 'c-transporte'),
    tx('gasto', 4, '2026-11-20', 'c-transporte'),
    tx('gasto', 40, '2026-10-10', 'c-transporte'),
    tx('ingreso', 500, '2026-11-01', 'c-salario'),
  ],
  categorias: CATEGORIAS,
  hoy: '2026-11-30',
};

class ModeloFalso implements ModeloAgente {
  peticiones: PeticionAlModelo[] = [];
  private guion: (RespuestaModelo | Error)[] = [];

  conGuion(...pasos: (RespuestaModelo | Error)[]): this {
    this.guion = [...pasos];
    return this;
  }

  async enviar(peticion: PeticionAlModelo): Promise<RespuestaModelo> {
    this.peticiones.push(peticion);
    const paso = this.guion.shift();
    if (paso instanceof Error) {
      throw paso;
    }
    if (!paso) {
      throw new Error('El guion del modelo falso se quedó sin respuestas.');
    }
    return paso;
  }
}

function herramientas(id: string, nombre: string, argumentos: Record<string, unknown>): RespuestaModelo {
  return { tipo: 'herramientas', llamadas: [{ id, nombre, argumentos }] };
}

function texto(respuesta: string): RespuestaModelo {
  return { tipo: 'texto', texto: respuesta };
}

describe('config', () => {
  it('MODELO_AGENTE y el tope de rondas son los del spec', () => {
    expect(MODELO_AGENTE).toBe('gemini-3.5-flash-lite');
    expect(TOPE_RONDAS).toBe(4);
  });
});

describe('preguntar', () => {
  it('ejecuta resolverCategoria y luego totalPorCategoria y devuelve los resultados con el mismo id', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('llamada-1', 'resolverCategoria', { texto: 'transporte' }),
      herramientas('llamada-2', 'totalPorCategoria', { categoriaId: 'c-transporte', periodo: 'este_mes' }),
      texto('Gastaste 13.00 en Transporte entre el 2026-11-01 y el 2026-11-30, en 2 transacciones.'),
    );

    const respuesta = await preguntar({ pregunta: '¿Cuánto gasté en transporte este mes?', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });

    expect(respuesta.tipo).toBe('respuesta');
    if (respuesta.tipo !== 'respuesta') return;
    expect(respuesta.texto).toContain('13.00');

    const [, , rondaUno, , rondaDos, final] = respuesta.historial;
    if (rondaUno?.rol !== 'herramienta' || rondaDos?.rol !== 'herramienta') {
      throw new Error('Faltan las rondas de herramienta en el historial.');
    }
    expect(rondaUno.resultados[0]).toMatchObject({ id: 'llamada-1', nombre: 'resolverCategoria' });
    expect(rondaUno.resultados[0].resultado).toMatchObject({ estado: 'una' });
    expect(rondaDos.resultados[0]).toMatchObject({ id: 'llamada-2', nombre: 'totalPorCategoria' });
    expect(rondaDos.resultados[0].resultado).toMatchObject({
      total: 13,
      cantidad: 2,
      rango: { desde: '2026-11-01', hasta: '2026-11-30' },
    });
    expect(final).toMatchObject({ rol: 'modelo', texto: respuesta.texto });
  });

  it('convierte periodo a desde/hasta antes de llamar a la herramienta, con el hoy de El Salvador', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('p1', 'totalPorCategoria', { categoriaId: 'c-transporte', periodo: 'este_mes' }),
      texto('listo'),
    );
    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });
    expect(respuesta.tipo).toBe('respuesta');
    // 2026-12-01T03:00:00Z son las 21:00 del 30 de noviembre en El Salvador:
    // este_mes es noviembre completo.
    const ronda = respuesta.historial.find((mensaje) => mensaje.rol === 'herramienta');
    if (ronda?.rol !== 'herramienta') throw new Error('Falta la ronda de herramienta.');
    expect(ronda.resultados[0].resultado).toMatchObject({ rango: { desde: '2026-11-01', hasta: '2026-11-30' } });
  });

  it('un modelo que pide herramientas en 5 rondas recibe 4 rondas de resultados y el mensaje de tope', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('r1', 'resolverCategoria', { texto: 'x' }),
      herramientas('r2', 'resolverCategoria', { texto: 'x' }),
      herramientas('r3', 'resolverCategoria', { texto: 'x' }),
      herramientas('r4', 'resolverCategoria', { texto: 'x' }),
      herramientas('r5', 'resolverCategoria', { texto: 'x' }),
    );

    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });

    expect(respuesta).toMatchObject({ tipo: 'respuesta', texto: 'No pude calcularlo con mis herramientas. Probá con una pregunta más concreta.' });
    expect(modelo.peticiones.length).toBe(5);
    const rondasDeResultados = (mensaje: MensajeAgente): boolean => mensaje.rol === 'herramienta';
    expect(modelo.peticiones[4].mensajes.filter(rondasDeResultados).length).toBe(4);
    expect(respuesta.historial.at(-1)).toEqual({ rol: 'modelo', texto: 'No pude calcularlo con mis herramientas. Probá con una pregunta más concreta.' });
  });

  it('al modelo nunca llegan notas, imágenes, fotos ni transacciones crudas', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('r1', 'totalPorCategoria', { categoriaId: 'c-transporte' }),
      herramientas('r2', 'resumenIngresos', {}),
      texto('listo'),
    );
    await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });

    for (const peticion of modelo.peticiones) {
      const revisar = (valor: unknown): void => {
        if (Array.isArray(valor)) {
          // Ningún arreglo se ve como una lista de transacciones.
          if (
            valor.length > 0 &&
            valor.every(
              (elemento) =>
                elemento && typeof elemento === 'object' && 'tipo' in elemento && 'monto' in elemento && 'fecha' in elemento,
            )
          ) {
            throw new Error('El modelo recibió una lista con forma de transacciones.');
          }
          valor.forEach(revisar);
          return;
        }
        if (valor && typeof valor === 'object') {
          for (const [clave, contenido] of Object.entries(valor)) {
            expect(['nota', 'imagen', 'foto']).not.toContain(clave);
            revisar(contenido);
          }
        }
      };
      revisar(JSON.parse(JSON.stringify(peticion)));
    }
  });

  it.each([
    ['cuota', Object.assign(new Error('429 RESOURCE_EXHAUSTED: quota exceeded'), { code: 429 }), 'Se acabó la cuota gratis del Agente por ahora. Intentá de nuevo en un rato.'],
    ['app check', Object.assign(new Error('App Check rejected the call: app-check token was invalid'), { code: 'failed-precondition' }), 'El Agente no está disponible por ahora (App Check rechazó la llamada). Avisale al equipo.'],
    ['red', Object.assign(new TypeError('fetch failed'), { code: 'FETCH_ERROR' }), 'No hay conexión. Revisá la red e intentá de nuevo.'],
    ['api no activada', Object.assign(new Error('API target not enabled'), { code: 'API_NOT_ENABLED' }), 'El Agente todavía no está activado en el proyecto. Avisale al equipo.'],
  ])('un error de %s termina en su mensaje en español, sin códigos', async (_nombre, error, esperado) => {
    const modelo = new ModeloFalso().conGuion(error);
    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });
    expect(respuesta).toMatchObject({ tipo: 'respuesta', texto: esperado });
  });

  it('mensajeDeErrorDelAgente no muestra códigos crudos en ningún caso', () => {
    for (const error of [
      new Error('what ever went wrong'),
      Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { code: 429 }),
      new TypeError('fetch failed'),
      Object.assign(new Error('App Check rejected'), { code: 'failed-precondition' }),
    ]) {
      expect(mensajeDeErrorDelAgente(error)).not.toMatch(/429|RESOURCE_EXHAUSTED|FETCH_ERROR|API_NOT_ENABLED/);
    }
  });

  it('cuando el modelo falla, el error llega como burbuja del Agente en el historial', async () => {
    const error = new Error('se cayó la red');
    const modelo = new ModeloFalso().conGuion(error);

    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });

    expect(respuesta.tipo).toBe('respuesta');
    if (respuesta.tipo !== 'respuesta') {
      throw new Error('Debió devolver una respuesta.');
    }
    expect(respuesta.historial.at(-1)).toEqual({ rol: 'modelo', texto: mensajeDeErrorDelAgente(error) });
    expect(respuesta.historial).toContainEqual({ rol: 'persona', texto: 'x' });
  });

  it('con cargando en true devuelve esperando y el modelo no recibe ninguna llamada', async () => {
    const modelo = new ModeloFalso().conGuion(texto('no debería llegar'));
    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: true, ahora: AHORA, modelo });
    expect(respuesta).toEqual({ tipo: 'esperando' });
    expect(modelo.peticiones.length).toBe(0);
  });

  it('una herramienta desconocida devuelve un error en español y la conversación sigue', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('x1', 'sacarDinero', {}),
      texto('no puedo con eso'),
    );
    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });
    const ronda = respuesta.historial.find((mensaje) => mensaje.rol === 'herramienta');
    if (ronda?.rol !== 'herramienta') throw new Error('Falta la ronda de herramienta.');
    expect(ronda.resultados[0].resultado).toMatchObject({ error: expect.stringContaining('No conozco esa herramienta') });
  });

  it('argumentos inválidos devuelven error en español en vez de lanzar', async () => {
    const modelo = new ModeloFalso().conGuion(
      herramientas('x1', 'resolverCategoria', {}),
      herramientas('x2', 'totalPorCategoria', { periodo: 'la_semana' }),
      herramientas('x3', 'resumenIngresos', { desde: 'ayer' }),
      texto('ok'),
    );
    const respuesta = await preguntar({ pregunta: 'x', historial: [], datos: DATOS, cargando: false, ahora: AHORA, modelo });
    const rondas = respuesta.historial.filter((mensaje) => mensaje.rol === 'herramienta');
    if (rondas.length !== 3) throw new Error('Faltan rondas de herramienta.');
    for (const ronda of rondas) {
      if (ronda.rol !== 'herramienta') continue;
      expect(ronda.resultados[0].resultado).toMatchObject({ error: expect.any(String) });
    }
  });

  it('el historial previo llega al modelo antes de la pregunta', async () => {
    const modelo = new ModeloFalso().conGuion(texto('ok'));
    const historialPrevio: MensajeAgente[] = [
      { rol: 'persona', texto: '¿Cuánto gasté en Transporte este mes?' },
      { rol: 'modelo', texto: '13.00 en noviembre.' },
    ];
    await preguntar({ pregunta: '¿y en octubre?', historial: historialPrevio, datos: DATOS, cargando: false, ahora: AHORA, modelo });
    expect(modelo.peticiones[0].mensajes).toEqual([...historialPrevio, { rol: 'persona', texto: '¿y en octubre?' }]);
  });
});
