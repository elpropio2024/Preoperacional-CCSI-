import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { 
  Bus, 
  Users, 
  Calendar, 
  RefreshCw, 
  Search, 
  Loader2, 
  AlertCircle, 
  ClipboardCheck, 
  Clock, 
  FileCheck2,
  ShieldCheck,
  Route
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { 
  obtenerRelacionDespachoDiario, 
  RelacionDespacho, 
  MetricasDespacho,
  VehiculoUnico,
  OperadorUnico
} from '../services/dashboardService';

export default function DashboardMetricas() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Fecha por defecto en formato YYYY-MM-DD en hora local
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [fechaConsulta, setFechaConsulta] = useState<string>(getTodayString());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [metricasData, setMetricasData] = useState<MetricasDespacho>({
    registros: [],
    totalVehiculosUnicos: 0,
    totalOperadoresUnicos: 0,
    listaVehiculosUnicos: [],
    listaOperadoresUnicos: []
  });

  const cargarDatosDespacho = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerRelacionDespachoDiario(fechaConsulta);
      setMetricasData(data);
    } catch (err: any) {
      console.error('Error al cargar la relación de despacho diario:', err);
      setError(err?.message || 'No fue posible obtener los datos de despacho diario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosDespacho();
  }, [fechaConsulta]);

  // Formateador seguro de hora con dayjs para campos TIMESTAMPTZ
  const formatHoraSalida = (timestamp?: string | null): string => {
    if (!timestamp) return '---';
    try {
      const d = dayjs(timestamp);
      if (!d.isValid()) return String(timestamp);
      return d.format('hh:mm A');
    } catch {
      return String(timestamp);
    }
  };

  // Filtrado de la tabla principal por TC, Placa, Nombre, Cédula o Ruta
  const filteredRegistros = useMemo(() => {
    if (!metricasData.registros) return [];
    if (!searchTerm.trim()) return metricasData.registros;

    const term = searchTerm.toLowerCase().trim();
    return metricasData.registros.filter((reg: RelacionDespacho) => {
      const tc = String(reg.tc || reg.movil || reg.numero_bus || reg.vehiculo_id || '').toLowerCase();
      const placa = String(reg.placa || reg.vehiculo_placa || '').toLowerCase();
      const nombre = String(reg.operador_nombre || reg.nombres_apellidos || reg.nombre || '').toLowerCase();
      const cedula = String(reg.operador_cedula || reg.identificacion || reg.cedula || reg.operador_id || '').toLowerCase();
      const ruta = String(reg.nombre_ruta || reg.ruta_asignada || reg.nume_ruta || '').toLowerCase();

      return tc.includes(term) || placa.includes(term) || nombre.includes(term) || cedula.includes(term) || ruta.includes(term);
    });
  }, [metricasData.registros, searchTerm]);

  return (
    <div 
      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
        isLight 
          ? 'bg-white border-slate-200/80 shadow-sm text-slate-900' 
          : 'bg-slate-900/70 border-slate-800/80 shadow-none text-slate-100 dark:bg-slate-900/70 dark:border-slate-800/80 dark:text-slate-100'
      }`} 
      id="dashboard-metricas-despacho-diario"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded px-2 py-0.5 font-bold uppercase tracking-wider font-mono">
              Control Operativo Diario
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Relación de Despacho Diario
          </h2>
          <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
            Supervisión y métricas de vehículos y operadores despachados en turno.
          </p>
        </div>

        {/* Date Filter & Actions */}
        <div className={`flex flex-wrap items-center gap-2.5 p-2 rounded-xl border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800 dark:bg-slate-950/60 dark:border-slate-800'
        }`}>
          <div className="flex items-center gap-1.5 px-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300 dark:text-slate-300'}`}>
              Fecha:
            </span>
          </div>

          <input 
            type="date"
            value={fechaConsulta}
            onChange={(e) => setFechaConsulta(e.target.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all outline-none cursor-pointer ${
              isLight 
                ? 'bg-white text-slate-800 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100' 
                : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700'
            }`}
          />

          <button 
            type="button"
            onClick={cargarDatosDespacho}
            disabled={loading}
            className={`p-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              isLight 
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm' 
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-750 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200'
            }`}
            title="Recargar datos de despacho"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* FILA 1: KPI Cards con padding y escala visual ajustada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        
        {/* KPI 1: Total Buses en Operación */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden transition-all duration-200 ${
          isLight 
            ? 'bg-gradient-to-br from-blue-50/70 via-white to-blue-50/20 border-blue-100 shadow-sm shadow-blue-500/5' 
            : 'bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-950 border-blue-900/30 dark:bg-gradient-to-br dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-950 dark:border-blue-900/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5" />
              Métricas de Flota
            </span>
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
              Total de Buses en Operación
            </h3>
            <p className="text-3xl sm:text-4xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5 tracking-tight">
              {loading ? '...' : metricasData.totalVehiculosUnicos}
            </p>
            <p className={`text-[10px] mt-1 font-medium ${isLight ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
              Vehículos únicos agrupados en la jornada consultada
            </p>
          </div>
        </div>

        {/* KPI 2: Total Operadores Activos */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden transition-all duration-200 ${
          isLight 
            ? 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/20 border-emerald-100 shadow-sm shadow-emerald-500/5' 
            : 'bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-900/30 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950 dark:border-emerald-900/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Talento Operativo
            </span>
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
              Total de Operadores Activos
            </h3>
            <p className="text-3xl sm:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">
              {loading ? '...' : metricasData.totalOperadoresUnicos}
            </p>
            <p className={`text-[10px] mt-1 font-medium ${isLight ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
              Operadores únicos con asignación y despacho en turno
            </p>
          </div>
        </div>

      </div>

      {/* FILA 2: Grid de 2 columnas con Listas Scrolleables (max-h-[300px]) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        
        {/* Columna A: Lista de Vehículos Únicos */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isLight 
            ? 'bg-slate-50/50 border-slate-200/80 shadow-sm' 
            : 'bg-slate-950/40 border-slate-800/80 dark:bg-slate-950/40 dark:border-slate-800/80'
        }`}>
          {/* Header de la Lista */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bus className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight">
                  Vehículos en Operación
                </h3>
                <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
                  Móviles activos despachados hoy
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {loading ? '...' : `${metricasData.listaVehiculosUnicos.length} Buses`}
            </span>
          </div>

          {/* Lista scrolleable con max-h-[300px] */}
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-xs font-semibold">Cargando vehículos...</span>
              </div>
            ) : metricasData.listaVehiculosUnicos.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Bus className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-bold">Sin vehículos registrados</p>
              </div>
            ) : (
              metricasData.listaVehiculosUnicos.map((vehiculo: VehiculoUnico, idx: number) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100/80 border-slate-200/80 shadow-xs text-slate-800' 
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 dark:border-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-black text-[11px] flex items-center justify-center border border-blue-500/20">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      TC-{vehiculo.tc}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md border font-mono font-semibold text-sm uppercase tracking-wider ${
                    isLight 
                      ? 'bg-slate-100 text-slate-800 border-slate-200' 
                      : 'bg-slate-800 text-slate-200 border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                  }`}>
                    {vehiculo.placa}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna B: Lista de Operadores Únicos */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isLight 
            ? 'bg-slate-50/50 border-slate-200/80 shadow-sm' 
            : 'bg-slate-950/40 border-slate-800/80 dark:bg-slate-950/40 dark:border-slate-800/80'
        }`}>
          {/* Header de la Lista */}
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight">
                  Operadores en Turno
                </h3>
                <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
                  Conductores asignados hoy
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {loading ? '...' : `${metricasData.listaOperadoresUnicos.length} Operadores`}
            </span>
          </div>

          {/* Lista scrolleable con max-h-[300px] */}
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                <span className="text-xs font-semibold">Cargando operadores...</span>
              </div>
            ) : metricasData.listaOperadoresUnicos.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs font-bold">Sin operadores registrados</p>
              </div>
            ) : (
              metricasData.listaOperadoresUnicos.map((operador: OperadorUnico, idx: number) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isLight 
                      ? 'bg-white hover:bg-slate-100/80 border-slate-200/80 shadow-xs text-slate-800' 
                      : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-800/60 dark:border-slate-800/80 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-black text-[11px] flex items-center justify-center border border-emerald-500/20 shrink-0">
                      {idx + 1}
                    </span>
                    <p className="font-bold text-sm leading-snug truncate">
                      {operador.nombre}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md border font-mono font-medium text-xs shrink-0 ${
                    isLight 
                      ? 'bg-slate-100 text-slate-700 border-slate-200' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                    C.C. {operador.identificacion}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* FILA 3: Tabla Completa de Relación de Despacho (con Scroll Vertical, Encabezado Sticky y Columna RUTA) */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isLight 
          ? 'bg-slate-50/50 border-slate-200/80 shadow-sm' 
          : 'bg-slate-950/40 border-slate-800/80 dark:bg-slate-950/40 dark:border-slate-800/80'
      }`}>
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                Reporte de Relación de Despacho
              </h3>
              <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
                {filteredRegistros.length} {filteredRegistros.length === 1 ? 'registro encontrado' : 'registros encontrados'}
              </p>
            </div>
          </div>

          {/* Live Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por TC, Placa, Operador o Ruta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-semibold border transition-all outline-none ${
                isLight 
                  ? 'bg-white text-slate-800 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100' 
                  : 'bg-slate-900 text-slate-200 border-slate-700 focus:border-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700'
              }`}
            />
          </div>
        </div>

        {/* State Handling: Loading, Error, Empty, and Data Table con scroll vertical */}
        {loading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2.5">
            <Loader2 className="w-7 h-7 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
              Consultando relación de despacho diario en Supabase...
            </p>
          </div>
        ) : error ? (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isLight ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-rose-950/20 border-rose-900/30 text-rose-300 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-300'
          }`}>
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Error en la consulta del reporte</h4>
              <p className="text-xs leading-relaxed opacity-90">{error}</p>
              <button 
                type="button"
                onClick={cargarDatosDespacho}
                className="mt-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 underline cursor-pointer"
              >
                Reintentar consulta
              </button>
            </div>
          </div>
        ) : filteredRegistros.length === 0 ? (
          <div className="py-12 text-center">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-slate-400/60" />
            <p className="text-xs font-bold">No se encontraron despachos registrados</p>
            <p className={`text-[11px] mt-1 max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'}`}>
              No existen registros de despacho diario para la fecha seleccionada ({fechaConsulta}) o los criterios de búsqueda aplicados.
            </p>
          </div>
        ) : (
          /* Contenedor con Scroll Vertical (max-h-[500px] overflow-y-auto relative) */
          <div className="w-full max-h-[500px] overflow-y-auto overflow-x-auto relative rounded-xl border border-slate-200/80 dark:border-slate-800 custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              {/* Encabezado fijo (sticky top-0 z-10) con la columna RUTA antes de HORA SALIDA */}
              <thead className="sticky top-0 z-10">
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${
                  isLight 
                    ? 'bg-slate-100/95 backdrop-blur-xs text-slate-700 border-slate-200' 
                    : 'bg-slate-900/95 backdrop-blur-xs text-slate-300 border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 dark:border-slate-800'
                }`}>
                  <th className="py-3 px-3.5">Móvil / TC</th>
                  <th className="py-3 px-3.5">Placa</th>
                  <th className="py-3 px-3.5">Operador (Nombre y CC)</th>
                  <th className="py-3 px-3.5">Ruta</th>
                  <th className="py-3 px-3.5">Hora Salida</th>
                  <th className="py-3 px-3.5 text-center">Revisiones</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isLight 
                  ? 'divide-slate-200/60 bg-white' 
                  : 'divide-slate-800/60 bg-slate-900/40 dark:divide-slate-800/60 dark:bg-slate-900/40'
              }`}>
                {filteredRegistros.map((item: RelacionDespacho, idx: number) => {
                  const tc = item.tc || item.movil || item.numero_bus || item.vehiculo_id || 'N/D';
                  const placa = item.placa || item.vehiculo_placa || 'N/D';
                  const nombre = item.operador_nombre || item.nombres_apellidos || item.nombre || 'Operador Registrado';
                  const cedula = item.operador_cedula || item.identificacion || item.cedula || item.operador_id || 'N/D';
                  const rutaVisual = item.nombre_ruta || item.ruta_asignada || item.nume_ruta || item.ruta || 'X101';
                  const rawHora = item.hora_registro || item.hora_salida || item.created_at || item.fecha_registro || item.fecha;
                  const horaFormatted = formatHoraSalida(rawHora);
                  const revisiones = item.revisiones ?? item.cantidad_revisiones ?? 1;

                  return (
                    <tr 
                      key={idx}
                      className={`transition-colors ${
                        isLight 
                          ? 'hover:bg-slate-50/80' 
                          : 'hover:bg-slate-800/40 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Móvil / TC */}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                          <Bus className="w-3 h-3" />
                          TC-{tc}
                        </span>
                      </td>

                      {/* Placa */}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-xs">
                        <span className={`px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                          isLight 
                            ? 'bg-slate-100 text-slate-800 border-slate-200' 
                            : 'bg-slate-800 text-slate-200 border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                        }`}>
                          {placa}
                        </span>
                      </td>

                      {/* Operador (Nombre y CC) */}
                      <td className="py-2.5 px-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs leading-snug">
                            {nombre}
                          </p>
                          <p className={`text-[10px] font-mono font-medium flex items-center gap-1 ${
                            isLight ? 'text-slate-500' : 'text-slate-400 dark:text-slate-400'
                          }`}>
                            <span>C.C.</span>
                            <span>{cedula}</span>
                          </p>
                        </div>
                      </td>

                      {/* Ruta Asignada (Lectura directa de nombre_ruta) */}
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 dark:bg-gray-800 dark:text-cyan-400 dark:border-gray-700">
                          <Route className="w-3 h-3" />
                          {rutaVisual}
                        </span>
                      </td>

                      {/* Hora Salida (Formateada con dayjs) */}
                      <td className="py-2.5 px-3.5">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs">
                          <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className={isLight ? 'text-slate-800' : 'text-slate-200 dark:text-slate-200'}>
                            {horaFormatted}
                          </span>
                        </span>
                      </td>

                      {/* Revisiones */}
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircleIcon className="w-3 h-3" />
                          {revisiones} {Number(revisiones) === 1 ? 'Revisión' : 'Revisiones'}
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

    </div>
  );
}

// Icono auxiliar de verificación
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
