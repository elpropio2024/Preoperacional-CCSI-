import { supabase } from '../lib/apiClients';

export interface RelacionDespacho {
  vehiculo_id?: string | number | null;
  operador_id?: string | number | null;
  nombre_ruta?: string | null;
  movil?: string | null;
  tc?: string | null;
  numero_bus?: string | null;
  placa?: string | null;
  operador_nombre?: string | null;
  nombres_apellidos?: string | null;
  operador_cedula?: string | null;
  identificacion?: string | null;
  cedula?: string | null;
  hora_registro?: string | null;
  hora_salida?: string | null;
  created_at?: string | null;
  fecha_registro?: string | null;
  revisiones?: number | string | null;
  cantidad_revisiones?: number | string | null;
  estado_autorizacion?: string | null;
  vehiculos?: {
    id?: string | number | null;
    tc?: string | null;
    placa?: string | null;
    [key: string]: any;
  } | null;
  operadores?: {
    id?: string | number | null;
    nombres_apellidos?: string | null;
    identificacion?: string | null;
    cedula?: string | null;
    nombre?: string | null;
    [key: string]: any;
  } | null;
  rutas?: {
    id?: string | number | null;
    nume_ruta?: string | null;
    nombre_ruta?: string | null;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export interface VehiculoUnico {
  tc: string;
  placa: string;
}

export interface OperadorUnico {
  nombre: string;
  identificacion: string;
}

export interface MetricasDespacho {
  registros: RelacionDespacho[];
  totalVehiculosUnicos: number;
  totalOperadoresUnicos: number;
  listaVehiculosUnicos: VehiculoUnico[];
  listaOperadoresUnicos: OperadorUnico[];
}

/**
 * Procesa una lista de registros planos y/o anidados agrupando vehículos y operadores únicos mediante Map
 */
function procesarMetricasDespacho(registros: RelacionDespacho[]): MetricasDespacho {
  const vehiculosMap = new Map<string, VehiculoUnico>();
  const operadoresMap = new Map<string, OperadorUnico>();

  registros.forEach((item: any) => {
    // Extraer y agrupar Vehículos Únicos
    const vKey = item.vehiculos?.id ?? item.vehiculo_id ?? item.vehiculos?.tc ?? item.tc ?? item.movil ?? item.vehiculos?.placa ?? item.placa;
    if (vKey !== undefined && vKey !== null && String(vKey).trim() !== '') {
      const key = String(vKey).trim();
      if (!vehiculosMap.has(key)) {
        const tc = String(item.vehiculos?.tc ?? item.tc ?? item.movil ?? item.numero_bus ?? item.vehiculo_id ?? 'N/D');
        const placa = String(item.vehiculos?.placa ?? item.placa ?? item.vehiculo_placa ?? 'N/D');
        vehiculosMap.set(key, { tc, placa });
      }
    }

    // Extraer y agrupar Operadores Únicos
    const oKey = item.operadores?.id ?? item.operador_id ?? item.operadores?.identificacion ?? item.operador_cedula ?? item.identificacion ?? item.cedula;
    if (oKey !== undefined && oKey !== null && String(oKey).trim() !== '') {
      const key = String(oKey).trim();
      if (!operadoresMap.has(key)) {
        const nombre = String(item.operadores?.nombres_apellidos ?? item.operadores?.nombre ?? item.operador_nombre ?? item.nombres_apellidos ?? item.nombre ?? 'Operador Registrado');
        const identificacion = String(item.operadores?.identificacion ?? item.operadores?.cedula ?? item.operador_cedula ?? item.identificacion ?? item.cedula ?? item.operador_id ?? 'N/D');
        operadoresMap.set(key, { nombre, identificacion });
      }
    }
  });

  const listaVehiculosUnicos = Array.from(vehiculosMap.values());
  const listaOperadoresUnicos = Array.from(operadoresMap.values());

  return {
    registros,
    totalVehiculosUnicos: listaVehiculosUnicos.length,
    totalOperadoresUnicos: listaOperadoresUnicos.length,
    listaVehiculosUnicos,
    listaOperadoresUnicos
  };
}

/**
 * Extrae la fecha exacta en formato YYYY-MM-DD forzando la zona horaria de Colombia
 */
export const obtenerFechaLocal = (fechaString: string) => {
  if (!fechaString) return '';
  const date = new Date(fechaString);
  if (isNaN(date.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}/.test(String(fechaString))) {
      return String(fechaString).slice(0, 10);
    }
    return '';
  }
  // 'en-CA' formatea la fecha nativamente como YYYY-MM-DD
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

/**
 * Consulta de contingencia a tablas Supabase con matching estricto de IDs para evitar cruces de datos
 */
async function fallbackDirectQueryDespacho(fecha_consulta: string): Promise<MetricasDespacho> {
  console.info(`[dashboardService] Ejecutando consulta de respaldo para la fecha: ${fecha_consulta}`);

  // Consultar inspecciones, operadores, vehículos y rutas en paralelo
  const [inspRes, opRes, vehRes, rutRes] = await Promise.all([
    supabase
      .from('inspecciones_preoperacionales')
      .select('*')
      .order('fecha', { ascending: false }),
    supabase.from('operadores').select('*'),
    supabase.from('vehiculos').select('*'),
    supabase.from('rutas').select('*')
  ]);

  if (inspRes.error) {
    throw inspRes.error;
  }

  const inspecciones = inspRes.data || [];
  const operadores = opRes.data || [];
  const vehiculos = vehRes.data || [];
  const rutas = rutRes.data || [];

  // Filtrar registros extrayendo la fecha en zona horaria de Colombia (YYYY-MM-DD)
  const targetDateStr = (fecha_consulta || '').trim().slice(0, 10);
  const inspeccionesDelDia = inspecciones.filter((ins: any) => {
    const rawDate = ins.created_at || ins.fecha_registro || ins.fecha || ins.fecha_creacion || '';
    return obtenerFechaLocal(rawDate) === targetDateStr;
  });

  // Solo procesar los registros que coincidan exactamente con la fecha consultada
  const pool = inspeccionesDelDia;

  // Mapear cada inspección con matching estricto de IDs sin cruzar vehículos con operadores
  const registros: RelacionDespacho[] = pool.map((ins: any) => {
    // Buscar operador estrictamente por ID primario o cédula
    const op = operadores.find((o: any) => {
      if (ins.operador_id && (o.id === ins.operador_id || o.operador_id === ins.operador_id)) return true;
      if (ins.conductor_cedula && (o.identificacion === ins.conductor_cedula || o.cedula === ins.conductor_cedula)) return true;
      return false;
    });

    // Buscar vehículo estrictamente por ID primario o placa o TC
    const veh = vehiculos.find((v: any) => {
      if (ins.vehiculo_id && (v.id === ins.vehiculo_id || v.vehiculo_id === ins.vehiculo_id)) return true;
      if (ins.vehiculo_placa && v.placa === ins.vehiculo_placa) return true;
      if (ins.vehiculo_tc && (v.tc === ins.vehiculo_tc || v.numero_interno === ins.vehiculo_tc)) return true;
      return false;
    });

    // Buscar ruta
    const rut = rutas.find((r: any) => 
      (ins.ruta_asignada && (r.id_ruta === ins.ruta_asignada || r.id === ins.ruta_asignada || r.nume_ruta === ins.ruta_asignada)) ||
      (ins.ruta && (r.nume_ruta === ins.ruta || r.id_ruta === ins.ruta)) ||
      (ins.nombre_ruta && (r.nume_ruta === ins.nombre_ruta || r.nombre_ruta === ins.nombre_ruta))
    );

    const tc = veh?.tc ?? veh?.numero_interno ?? ins.vehiculo_tc ?? ins.tc ?? ins.movil ?? ins.numero_bus ?? 'N/D';
    const placa = veh?.placa ?? ins.vehiculo_placa ?? ins.placa ?? 'N/D';
    const operadorNombre = op?.nombres_apellidos ?? op?.nombre ?? ins.conductor_nombre ?? ins.operador_nombre ?? 'Operador Registrado';
    const operadorCedula = op?.identificacion ?? op?.cedula ?? ins.conductor_cedula ?? ins.operador_cedula ?? ins.operador_id ?? 'N/D';
    const nombreRuta = ins.nombre_ruta ?? rut?.nume_ruta ?? rut?.nombre_ruta ?? ins.nume_ruta ?? ins.ruta_asignada ?? 'X101';
    const horaSalida = ins.hora_salida ?? ins.hora_registro ?? ins.created_at ?? ins.fecha;

    return {
      ...ins,
      vehiculos: veh ? { id: veh.id, tc, placa } : (ins.vehiculos ?? null),
      operadores: op ? { id: op.id, nombres_apellidos: operadorNombre, identificacion: operadorCedula } : (ins.operadores ?? null),
      rutas: rut ? { id: rut.id, nume_ruta: nombreRuta } : (ins.rutas ?? null),
      vehiculo_id: veh?.id ?? ins.vehiculo_id ?? tc,
      operador_id: op?.id ?? ins.operador_id ?? operadorCedula,
      nombre_ruta: nombreRuta,
      movil: tc,
      tc: tc,
      numero_bus: tc,
      placa: placa,
      operador_nombre: operadorNombre,
      nombres_apellidos: operadorNombre,
      operador_cedula: operadorCedula,
      identificacion: operadorCedula,
      cedula: operadorCedula,
      hora_registro: horaSalida,
      hora_salida: horaSalida,
      created_at: ins.created_at || ins.fecha,
      fecha_registro: ins.fecha || ins.created_at,
      revisiones: ins.revisiones || 1,
      cantidad_revisiones: ins.cantidad_revisiones || 1,
      estado_autorizacion: ins.estado_autorizacion || 'Autorizado'
    };
  });

  return procesarMetricasDespacho(registros);
}

/**
 * Consulta la relación de despacho diario mediante consulta relacional directa con JOINs estructurados a Supabase.
 * Permite preservar objetos anidados (item.vehiculos, item.operadores, item.rutas) y campos planos.
 * 
 * @param fecha_consulta Fecha en formato 'YYYY-MM-DD'
 */
export async function obtenerRelacionDespachoDiario(fecha_consulta: string): Promise<MetricasDespacho> {
  const targetDateStr = (fecha_consulta || '').trim();

  try {
    // 1. Consulta relacional directa con JOINs estructurados hacia tablas vehiculos, operadores y rutas
    let queryResult = await supabase
      .from('inspecciones_preoperacionales')
      .select(`
        *,
        vehiculos:vehiculos!inspecciones_preoperacionales_vehiculo_id_fkey (
          id,
          tc,
          placa
        ),
        operadores:operadores!inspecciones_preoperacionales_operador_id_fkey (
          id,
          nombres_apellidos,
          identificacion
        ),
        rutas (
          id,
          nume_ruta
        )
      `)
      .order('fecha', { ascending: false });

    // Si la clave foránea no tiene ese nombre específico en Postgres, intentar relación estándar automática
    if (queryResult.error) {
      queryResult = await supabase
        .from('inspecciones_preoperacionales')
        .select(`
          *,
          vehiculos (
            id,
            tc,
            placa
          ),
          operadores (
            id,
            nombres_apellidos,
            identificacion
          ),
          rutas (
            id,
            nume_ruta
          )
        `)
        .order('fecha', { ascending: false });
    }

    if (!queryResult.error && queryResult.data) {
      const data = queryResult.data;
      const inspeccionesDelDia = data.filter((ins: any) => {
        const rawDate = ins.created_at || ins.fecha_registro || ins.fecha || ins.fecha_creacion || '';
        return obtenerFechaLocal(rawDate) === targetDateStr;
      });

      // Solo procesar los registros que correspondan exactamente a la fecha consultada
      const pool = inspeccionesDelDia;

      const registros: RelacionDespacho[] = pool.map((ins: any) => {
        const vehObj = Array.isArray(ins.vehiculos) ? ins.vehiculos[0] : ins.vehiculos;
        const opObj = Array.isArray(ins.operadores) ? ins.operadores[0] : ins.operadores;
        const rutObj = Array.isArray(ins.rutas) ? ins.rutas[0] : ins.rutas;

        const tc = vehObj?.tc ?? ins.vehiculo_tc ?? ins.tc ?? ins.movil ?? ins.numero_bus ?? ins.vehiculo_id ?? 'N/D';
        const placa = vehObj?.placa ?? ins.vehiculo_placa ?? ins.placa ?? 'N/D';
        const operadorNombre = opObj?.nombres_apellidos ?? opObj?.nombre ?? ins.operador_nombre ?? ins.nombres_apellidos ?? ins.conductor_nombre ?? 'Operador Registrado';
        const operadorCedula = opObj?.identificacion ?? opObj?.cedula ?? ins.operador_cedula ?? ins.identificacion ?? ins.conductor_cedula ?? ins.operador_id ?? 'N/D';
        const nombreRuta = rutObj?.nume_ruta ?? rutObj?.nombre_ruta ?? ins.nombre_ruta ?? ins.ruta_asignada ?? ins.nume_ruta ?? ins.ruta ?? 'X101';
        const horaSalida = ins.hora_salida ?? ins.hora_registro ?? ins.created_at ?? ins.fecha;

        return {
          ...ins,
          vehiculos: vehObj ? { id: vehObj.id, tc, placa } : (ins.vehiculos ?? null),
          operadores: opObj ? { id: opObj.id, nombres_apellidos: operadorNombre, identificacion: operadorCedula } : (ins.operadores ?? null),
          rutas: rutObj ? { id: rutObj.id, nume_ruta: nombreRuta } : (ins.rutas ?? null),
          vehiculo_id: vehObj?.id ?? ins.vehiculo_id ?? tc,
          operador_id: opObj?.id ?? ins.operador_id ?? operadorCedula,
          nombre_ruta: nombreRuta,
          movil: tc,
          tc: tc,
          numero_bus: tc,
          placa: placa,
          operador_nombre: operadorNombre,
          nombres_apellidos: operadorNombre,
          operador_cedula: operadorCedula,
          identificacion: operadorCedula,
          cedula: operadorCedula,
          hora_registro: horaSalida,
          hora_salida: horaSalida,
          created_at: ins.created_at || ins.fecha,
          fecha_registro: ins.fecha || ins.created_at,
          revisiones: ins.revisiones || 1,
          cantidad_revisiones: ins.cantidad_revisiones || 1,
          estado_autorizacion: ins.estado_autorizacion || 'Autorizado'
        };
      });

      return procesarMetricasDespacho(registros);
    }

    // 2. Si la consulta relacional no tuvo datos o tuvo error, usar RPC o fallback directo
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('obtener_relacion_despacho_diario', {
        fecha_consulta
      });
      if (!rpcError && rpcData) {
        const registros: RelacionDespacho[] = Array.isArray(rpcData) ? rpcData : [rpcData];
        return procesarMetricasDespacho(registros);
      }
    } catch (_) {}

    return await fallbackDirectQueryDespacho(fecha_consulta);
  } catch (err: any) {
    console.warn('Error en obtenerRelacionDespachoDiario, ejecutando fallback de consulta:', err);
    return await fallbackDirectQueryDespacho(fecha_consulta);
  }
}

