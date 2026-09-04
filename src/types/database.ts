/**
 * Representa la tipificación oficial para la base de datos de Planillas Preoperacionales.
 */

export interface InspeccionesPreoperacional {
  id_inspeccion?: string; // UUID autogenerado como llave primaria
  vehiculo_id: string; // Relación externa UUID
  operador_id: string; // Relación externa UUID
  kilometraje: number; // Registro del odómetro actual
  hora_inicio?: string | null; // Timestamp ISO-8601 de inicio de la inspección
  observaciones_hallazgos?: string | null; // Comentarios opcionales de hallazgos
  fecha_registro?: string; // Timestamp ISO-8601 autogenerado en BD
  
  // Relaciones e identificadores de ruta
  id_ruta?: string | null;
  ruta_id?: string | null;
  ruta_asignada?: string | null;

  // Fechas de vencimiento de extintores
  exp_extintor_1?: string | null;
  exp_extintor_2?: string | null;
  vencimiento_extintor_1?: string | null;
  vencimiento_extintor_2?: string | null;

  // 1. Datos del Operador
  estado_salud: boolean;

  // 2. Lista de Chequeo — Condición del Vehículo (21 campos)
  // Exterior
  estado_llantas_guardapolvos: boolean;

  // Motor
  motor_correas_radiador_mangueras: boolean;
  niveles_liquidos: boolean;
  fugas_fluidos: boolean;

  // Frenos
  presion_fugas_aire: boolean;
  estado_frenos: boolean;

  // Luces y Visibilidad
  luces_bocina: boolean;
  parabrisas: boolean;

  // Cabina
  espejos: boolean;
  switch_alarma_retroceso: boolean;
  elementos_retencion: boolean;
  luces_tablero_testigos: boolean;

  // Carrocería
  puertas_vidrios: boolean;
  rampa_pmr: boolean;
  timbre_senalizacion: boolean;

  // Seguridad y Emergencias
  angel_guardian: boolean;
  equipos_prevencion: boolean;
  martillos_salidas_emergencia: boolean;

  // Recaudo
  equipos_recaudo: boolean;

  // Documentos
  documentos: boolean;

  // Chasis
  estado_suspension_direccion: boolean;

  // NUEVO: Identificador secuencial amigable autogenerado en la base de datos
  // Es readonly ya que solo lectura desde el lado del cliente React y es generado en Supabase
  readonly codigo_preoperacional?: string; 
}

/**
 * Representa la vista relacional unificada 'v_preoperacionales_completos' 
 * que une inspecciones, vehículos y conductores.
 */
export interface VPreoperacionalCompleto extends InspeccionesPreoperacional {
  // Campos complementarios provistos por la vista relacional extendida
  placa_bus?: string;
  nombre_conductor?: string;
  cedula_conductor?: string;
  tc_bus?: string;
}
