import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  User, 
  Gauge 
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';

export interface IndicadoresData {
  total_preoperacionales: number;
  tasa_cumplimiento: number;
  tiempo_promedio_llenado: number;
  auditoria_lista: Array<{ 
    codigo: string; 
    operador_nombre: string; 
    operador_cc: string; 
    placa: string; 
    tc: string; 
    hora_envio: string; 
    tiempo_llenado_minutos?: number | null;
  }>;
  hallazgos_top: Array<{ 
    nombre_falla: string; 
    cantidad: number; 
  }>;
}

export default function GestionIndicadores() {
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRango, setFilterRango] = useState<'hoy' | '7dias' | 'este_mes'>('hoy');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const REGISTROS_POR_PAGINA = 5;

  // Llamada a la función RPC de Supabase 'obtener_dashboard_indicadores'
  const cargarIndicadores = async () => {
    setLoading(true);
    setError(null);
    try {
      const fechaFin = dayjs().format('YYYY-MM-DD');
      let fechaInicio = fechaFin;
      if (filterRango === '7dias') {
        fechaInicio = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
      } else if (filterRango === 'este_mes') {
        fechaInicio = dayjs().startOf('month').format('YYYY-MM-DD');
      }

      const { data: rpcData, error: rpcError } = await supabase.rpc('obtener_dashboard_indicadores', { 
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });

      if (rpcError) {
        throw rpcError;
      }

      setData(rpcData as IndicadoresData);
    } catch (err: any) {
      console.error('Error al invocar RPC obtener_dashboard_indicadores:', err);
      setError('No se pudo establecer conexión para procesar los indicadores operativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarIndicadores();
  }, [filterRango]);

  // Reiniciar a la primera página si cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Lista de auditoría filtrada por el buscador
  const auditoriaFiltrada = useMemo(() => {
    const lista = data?.auditoria_lista || [];
    if (!searchQuery.trim()) return lista;
    const query = searchQuery.toLowerCase();
    return lista.filter(rec => 
      (rec.operador_nombre || '').toLowerCase().includes(query) ||
      (rec.operador_cc || '').toLowerCase().includes(query) ||
      (rec.placa || '').toLowerCase().includes(query) ||
      (rec.tc || '').toLowerCase().includes(query) ||
      (rec.codigo || '').toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  // Paginación de la tabla de auditoría
  const indexLastItem = currentPage * REGISTROS_POR_PAGINA;
  const indexFirstItem = indexLastItem - REGISTROS_POR_PAGINA;
  const currentAuditItems = auditoriaFiltrada.slice(indexFirstItem, indexLastItem);
  const totalPaginas = Math.max(1, Math.ceil(auditoriaFiltrada.length / REGISTROS_POR_PAGINA));

  // Cálculo de fallas para la sección de hallazgos
  const totalPreoperacionales = data?.total_preoperacionales ?? 0;
  const totalFallasReportadas = useMemo(() => {
    return (data?.hallazgos_top || []).reduce((acc, curr) => acc + (curr.cantidad || 0), 0);
  }, [data]);

  return (
    <div className="space-y-6" id="gestion-indicadores-wrapper">
      
      {/* Header e Indicaciones de Rango Temporal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-800 bg-[#111827] p-6 border border-gray-700 rounded-3xl shadow-none">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold uppercase text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Control de Indicadores Críticos y Calidad de Llenado
          </h3>
          <p className="text-xs text-gray-400 font-semibold">
            Módulo analítico en tiempo real de auditoría sobre tiempos de toma de preoperacionales de operadores.
          </p>
        </div>

        {/* Fila Filtro Rápido de Rango de Fecha */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div className="bg-gray-900 p-1 rounded-xl inline-flex gap-1 border border-gray-700">
            <button
              type="button"
              onClick={() => setFilterRango('hoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRango === 'hoy'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setFilterRango('7dias')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRango === '7dias'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              onClick={() => setFilterRango('este_mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterRango === 'este_mes'
                  ? 'bg-gray-700 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Este Mes
            </button>
          </div>
          
          <button
            type="button"
            onClick={cargarIndicadores}
            className="p-2.5 bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 rounded-xl transition-all cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 bg-gray-800 bg-[#111827] border border-gray-700 rounded-3xl">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-xs text-gray-400 font-mono font-bold uppercase tracking-widest">Ejecutando cálculos de conformidad...</span>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/40 text-rose-300 border border-rose-900/50 rounded-3xl">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="text-sm font-extrabold uppercase">{error}</p>
          <button
            type="button"
            onClick={cargarIndicadores}
            className="mt-3 px-4 py-2 bg-rose-600 text-white font-extrabold text-xs tracking-wider rounded-xl hover:bg-rose-500 transition-all shadow cursor-pointer"
          >
            Reintentar Conexión
          </button>
        </div>
      ) : (
        <>
          {/* Fila de KPIs Clave */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="auditor-kpi-grid">
            
            {/* KPI #1: Total Registros */}
            <div className="bg-gray-800 bg-[#111827] rounded-2xl border border-gray-700 p-5 flex items-center justify-between shadow-none">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Total Preoperacionales</span>
                <span className="text-3xl font-black text-white font-mono block">
                  {data?.total_preoperacionales ?? 0}
                </span>
                <span className="text-[10.5px] text-gray-400 font-semibold block">Registrados en rango filtrado</span>
              </div>
              <div className="bg-indigo-950/50 p-3.5 rounded-2xl border border-indigo-800/40">
                <CheckCircle className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            {/* KPI #2: Tasa estimación cumplimiento */}
            <div className="bg-gray-800 bg-[#111827] rounded-2xl border border-gray-700 p-5 flex items-center justify-between shadow-none">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Tasa de Cumplimiento</span>
                <span className="text-3xl font-black text-emerald-400 font-mono block">
                  {data?.tasa_cumplimiento ?? 0}%
                </span>
                <span className="text-[10.5px] text-gray-400 font-semibold block">Meta diaria: 18 carros listos</span>
              </div>
              <div className="bg-emerald-950/50 p-3.5 rounded-2xl border border-emerald-800/40">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {/* KPI #3: Tiempo promedio de llenado */}
            <div className="bg-gray-800 bg-[#111827] rounded-2xl border border-gray-700 p-5 flex items-center justify-between shadow-none">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Tiempo Promedio Llenado</span>
                <span className="text-3xl font-black text-purple-400 font-mono block">
                  {data?.tiempo_promedio_llenado != null ? `${data.tiempo_promedio_llenado} m` : 'Sin datos'}
                </span>
                <span className="text-[10.5px] text-gray-400 font-semibold block">Promedio de registros en vivo</span>
              </div>
              <div className="bg-purple-950/50 p-3.5 rounded-2xl border border-purple-800/40">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
            </div>

          </div>

          {/* Grid Dual: Tabla de Auditoría (Izquierda) + Ranking de Fallas Críticas (Derecha) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* IZQUIERDA: Tabla de Auditoría (col-span-2) */}
            <div className="lg:col-span-2 bg-gray-800 bg-[#111827] border border-gray-700 rounded-3xl p-6 shadow-none flex flex-col justify-between space-y-4" id="auditoria-operators-panel">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-700">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-400" />
                      Auditoría e Integridad de Operadores
                    </h4>
                    <p className="text-[11px] text-gray-400 font-semibold">
                      Control pormenorizado del comportamiento y tiempo de toma de inspecciones.
                    </p>
                  </div>

                  {/* Input de Búsqueda Integrado */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Búsqueda rápida..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-gray-900 hover:bg-gray-900/80 focus:bg-gray-950 text-xs py-1.5 pl-8 pr-3 border border-gray-700 rounded-xl focus:outline-none focus:border-indigo-500 text-gray-100 placeholder:text-gray-500 font-semibold w-48 sm:w-60 transition-all"
                    />
                  </div>
                </div>

                {auditoriaFiltrada.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs font-bold font-mono">No se encontraron firmas asociadas a su búsqueda.</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto text-xs min-w-[580px]">
                      <thead>
                        <tr className="bg-gray-900 border-b border-gray-700 text-[10px] font-black uppercase text-gray-300">
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Operador</th>
                          <th className="px-4 py-3">Vehículo</th>
                          <th className="px-4 py-3 text-center whitespace-nowrap">Hora Envió</th>
                          <th className="px-4 py-3 text-right whitespace-nowrap">Tiempo Llenado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/60 bg-gray-800 bg-[#111827] font-semibold">
                        {currentAuditItems.map((rec, idx) => {
                          const horaFormateada = rec.hora_envio && dayjs(rec.hora_envio).isValid() 
                            ? dayjs(rec.hora_envio).format('hh:mm a') 
                            : (rec.hora_envio || 'N/D');

                          return (
                            <tr key={`${rec.codigo}-${idx}`} className="hover:bg-gray-700/30 transition-colors font-sans font-semibold text-gray-200 text-xs">
                              <td className="px-4 py-3.5 font-mono text-[11px] text-indigo-400 font-bold">
                                {rec.codigo || 'N/A'}
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-extrabold text-white text-[12.5px]">{rec.operador_nombre || 'N/D'}</span>
                                  <span className="text-[10px] text-gray-400 font-medium font-mono">CC {rec.operador_cc || 'N/D'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-100">{rec.placa || 'N/D'}</span>
                                  <span className="text-[9.5px] text-gray-400 font-bold font-mono">TC {rec.tc || 'N/D'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono text-[11.5px] text-gray-300 font-bold whitespace-nowrap">
                                {horaFormateada}
                              </td>
                              <td className="px-4 py-3.5 text-right font-sans whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 bg-gray-900 text-gray-400 border border-gray-700 px-2.5 py-1 rounded-lg text-[11.5px] font-bold font-mono">
                                  {rec.tiempo_llenado_minutos != null ? `${rec.tiempo_llenado_minutos} m` : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botonera de Desplazamiento Inferior */}
              {auditoriaFiltrada.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-700">
                  <p className="text-xs text-gray-400 font-bold font-mono">
                    Mostrando del {indexFirstItem + 1} al {Math.min(indexLastItem, auditoriaFiltrada.length)} de {auditoriaFiltrada.length} auditados
                  </p>
                  
                  {/* Botonera de paginación de alto contraste en Dark Mode */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-2 bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl font-extrabold text-[11.5px] transition-all shadow-none cursor-pointer inline-flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
                      Anterior
                    </button>
                    <span className="text-xs font-black text-gray-200 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 font-mono">
                      Página {currentPage} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPaginas}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPaginas))}
                      className="px-3.5 py-2 bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl font-extrabold text-[11.5px] transition-all shadow-none cursor-pointer inline-flex items-center gap-1"
                    >
                      Siguiente
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* DERECHA: Ranking de Hallazgos Críticos (col-span-1) */}
            <div className="bg-gray-800 bg-[#111827] border border-gray-700 rounded-3xl p-6 shadow-none flex flex-col justify-between space-y-4" id="ranking-critico-panel">
              <div className="space-y-4">
                <div className="pb-3 border-b border-gray-700 space-y-0.5">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-indigo-400" />
                    Frecuencia de Hallazgos Críticos
                  </h4>
                  <p className="text-[11px] font-semibold text-gray-400">
                    Los sistemas con mayor incidencia de fallas mecánicas detectadas en inspecciones.
                  </p>
                </div>

                {(!data?.hallazgos_top || data.hallazgos_top.length === 0) ? (
                  <div className="py-20 text-center text-gray-400 border border-dashed border-gray-700 rounded-2xl bg-gray-900/60">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-black text-emerald-400 uppercase">Flota en Estado Óptimo</p>
                    <p className="text-[11px] text-gray-400 mt-1">No se detectaron fallas mecánicas en este lapso.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {data.hallazgos_top.map((item, idx) => {
                      const porcentaje = totalPreoperacionales > 0
                        ? Math.min(100, Math.round((item.cantidad / totalPreoperacionales) * 100))
                        : 0;

                      return (
                        <div key={`${item.nombre_falla}-${idx}`} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-gray-200">
                              #{idx + 1} {item.nombre_falla}
                            </span>
                            <span className="font-bold text-gray-300 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-md font-mono text-[10.5px]">
                              {item.cantidad} {item.cantidad === 1 ? 'falla' : 'fallas'} ({porcentaje}%)
                            </span>
                          </div>
                          {/* Barra de progreso interactiva adaptada al Dark Mode */}
                          <div className="w-full bg-gray-700 rounded-full h-3.5 overflow-hidden border border-gray-600/50">
                            <div 
                              className="bg-gradient-to-r from-rose-500 to-amber-500 rounded-full h-full transition-all duration-700" 
                              style={{ width: `${Math.max(4, porcentaje)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Info Adicional / Recomendación de Prevención */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 space-y-2 text-xs">
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-indigo-400 block">Recomendación COPS</span>
                <p className="text-gray-300 font-semibold leading-relaxed text-[10.5px]">
                  {totalFallasReportadas > 0 
                    ? `Se registraron un total de ${totalFallasReportadas} alertas. Programe mantenimientos preventivos inmediatos para el sistema de ${(data?.hallazgos_top[0]?.nombre_falla || 'detección').toLowerCase()}.`
                    : 'Felicidades, las inspecciones reportan que el parque automotor cumple con los niveles de idoneidad requeridos.'}
                </p>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}
