import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck2, 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Search, 
  X, 
  ShieldAlert, 
  Truck, 
  FileText,
  AlertCircle
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';

export interface VehiculoDocumentos {
  id: string | number;
  tc: string | number;
  placa: string;
  fecha_soat?: string | null;
  vencimiento_soat?: string | null;
  soat_vencimiento?: string | null;
  fecha_tecno?: string | null;
  rtm_vencimiento?: string | null;
  vencimiento_rtm?: string | null;
  vencimiento_rce?: string | null;
  vencimiento_rcc?: string | null;
  [key: string]: any;
}

type TipoFiltro = 'todos' | 'vencidos' | 'por_vencer';

// Helper para calcular días restantes respecto a hoy
export const calcularDiasRestantes = (fechaStr?: string | null): number | null => {
  if (!fechaStr) return null;
  const fecha = dayjs(fechaStr);
  if (!fecha.isValid()) return null;
  const hoy = dayjs().startOf('day');
  return fecha.startOf('day').diff(hoy, 'day');
};

export default function ControlDocumentacion() {
  const [vehiculos, setVehiculos] = useState<VehiculoDocumentos[]>([]);
  const [filtro, setFiltro] = useState<TipoFiltro>('todos');
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // 1. Cargar vehículos de Supabase
  const fetchVehiculosDocs = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: errQuery } = await supabase
        .from('vehiculos')
        .select('*')
        .order('tc', { ascending: true });

      if (errQuery) {
        console.error('Error al consultar tabla vehiculos:', errQuery);
        throw new Error(errQuery.message || 'No se pudo cargar la documentación de la flota.');
      }

      setVehiculos(data || []);
    } catch (err: any) {
      console.error('Error en fetchVehiculosDocs:', err);
      setError(err.message || 'Error de conexión con la base de datos.');
      setVehiculos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchVehiculosDocs();
  }, []);

  // Extrae y normaliza las 4 fechas por vehículo
  const obtenerFechas = (v: VehiculoDocumentos) => {
    const soat = v.fecha_soat || v.vencimiento_soat || v.soat_vencimiento || null;
    const tecno = v.fecha_tecno || v.rtm_vencimiento || v.vencimiento_rtm || null;
    const rce = v.vencimiento_rce || null;
    const rcc = v.vencimiento_rcc || null;
    return { soat, tecno, rce, rcc };
  };

  // Clasifica el estado general de los documentos de un vehículo
  const evaluarEstadoVehiculo = (v: VehiculoDocumentos): 'vencido' | 'por_vencer' | 'vigente' => {
    const { soat, tecno, rce, rcc } = obtenerFechas(v);
    const diasSoat = calcularDiasRestantes(soat);
    const diasTecno = calcularDiasRestantes(tecno);
    const diasRce = calcularDiasRestantes(rce);
    const diasRcc = calcularDiasRestantes(rcc);

    const listaDias = [diasSoat, diasTecno, diasRce, diasRcc].filter((d): d is number => d !== null);

    // Si tiene al menos un documento vencido (< 0)
    const tieneVencido = listaDias.some(d => d < 0);
    if (tieneVencido) return 'vencido';

    // Si no tiene vencidos, pero tiene al menos uno por vencer (entre 0 y 30 días)
    const tienePorVencer = listaDias.some(d => d >= 0 && d <= 30);
    if (tienePorVencer) return 'por_vencer';

    return 'vigente';
  };

  // Resumen / Conteos
  const conteos = useMemo(() => {
    let totalVencidos = 0;
    let totalPorVencer = 0;
    let totalVigentes = 0;

    vehiculos.forEach(v => {
      const estado = evaluarEstadoVehiculo(v);
      if (estado === 'vencido') totalVencidos++;
      else if (estado === 'por_vencer') totalPorVencer++;
      else totalVigentes++;
    });

    return {
      total: vehiculos.length,
      vencidos: totalVencidos,
      porVencer: totalPorVencer,
      vigentes: totalVigentes
    };
  }, [vehiculos]);

  // 2. Lógica de Filtrado derivada
  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter(v => {
      // Filtro por Tab
      const estado = evaluarEstadoVehiculo(v);
      if (filtro === 'vencidos' && estado !== 'vencido') return false;
      if (filtro === 'por_vencer' && estado !== 'por_vencer') return false;

      // Filtro por búsqueda textual
      if (busqueda.trim()) {
        const term = busqueda.toLowerCase().trim();
        const tcStr = String(v.tc || '').toLowerCase();
        const placaStr = String(v.placa || '').toLowerCase();
        return tcStr.includes(term) || placaStr.includes(term);
      }

      return true;
    });
  }, [vehiculos, filtro, busqueda]);

  // Renderizador de cada celda de documento
  const renderCeldaDocumento = (fechaStr?: string | null, labelDoc: string = 'Doc') => {
    const dias = calcularDiasRestantes(fechaStr);

    if (!fechaStr || dias === null) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-mono italic">Sin registro</span>
          <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
            <AlertCircle className="w-2.5 h-2.5" /> No asignado
          </span>
        </div>
      );
    }

    const fechaFormateada = dayjs(fechaStr).format('DD/MM/YYYY');

    // 1. Vencido (dias < 0)
    if (dias < 0) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-rose-400 font-mono tracking-tight">
            {fechaFormateada}
          </span>
          <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <XCircle className="w-2.5 h-2.5 text-rose-400" />
            Vencido ({Math.abs(dias)}d)
          </span>
        </div>
      );
    }

    // 2. Por vencer (0 a 30 días)
    if (dias <= 30) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-amber-300 font-mono tracking-tight">
            {fechaFormateada}
          </span>
          <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Clock className="w-2.5 h-2.5 text-amber-400" />
            Vence en {dias}d
          </span>
        </div>
      );
    }

    // 3. Vigente (> 30 días)
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-emerald-400 font-mono tracking-tight">
          {fechaFormateada}
        </span>
        <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          Vigente ({dias}d)
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8" id="control-documentacion-view">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado Principal */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 border border-amber-500/30 p-3.5 rounded-2xl text-amber-400 shrink-0">
              <CalendarClock className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Control Legal de Documentación
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Supervisión y auditoría en tiempo real de SOAT, Tecnomecánica (RTM) y Tarjeta de Operación.
              </p>
            </div>
          </div>

          <button
            onClick={fetchVehiculosDocs}
            disabled={cargando}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 border border-gray-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm w-fit"
            title="Recargar datos de documentación"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-amber-400' : ''}`} />
            <span>{cargando ? 'Cargando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="bg-rose-950/70 border border-rose-700/60 rounded-xl p-4 flex items-center gap-3 text-rose-200 shadow-lg animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Error al cargar datos</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs de Filtro + Barra de Búsqueda */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Pills / Tabs de Filtrado */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            
            {/* Tab: Todos */}
            <button
              onClick={() => setFiltro('todos')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filtro === 'todos'
                  ? 'bg-gray-700 text-white border border-gray-500 shadow-md'
                  : 'bg-gray-900/80 text-gray-400 border border-gray-700/70 hover:bg-gray-700/50 hover:text-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Todos</span>
              <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] bg-gray-800 text-gray-300 font-mono">
                {conteos.total}
              </span>
            </button>

            {/* Tab: Vencidos */}
            <button
              onClick={() => setFiltro('vencidos')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filtro === 'vencidos'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-md shadow-rose-950/40'
                  : 'bg-gray-900/80 text-gray-400 border border-gray-700/70 hover:bg-rose-950/30 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Vencidos</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${
                filtro === 'vencidos' ? 'bg-rose-500/30 text-rose-200' : 'bg-gray-800 text-rose-400'
              }`}>
                {conteos.vencidos}
              </span>
            </button>

            {/* Tab: Por Vencer */}
            <button
              onClick={() => setFiltro('por_vencer')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filtro === 'por_vencer'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-950/40'
                  : 'bg-gray-900/80 text-gray-400 border border-gray-700/70 hover:bg-amber-950/30 hover:text-amber-300'
              }`}
            >
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span>Por Vencer (&le; 30d)</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-mono ${
                filtro === 'por_vencer' ? 'bg-amber-500/30 text-amber-200' : 'bg-gray-800 text-amber-400'
              }`}>
                {conteos.porVencer}
              </span>
            </button>

          </div>

          {/* Buscador */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por TC o Placa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Documentación */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/90 text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-700">
                <tr>
                  <th className="px-5 py-4">Móvil (TC)</th>
                  <th className="px-5 py-4">Placa</th>
                  <th className="px-5 py-4">SOAT</th>
                  <th className="px-5 py-4">Tecnomecánica (RTM)</th>
                  <th className="px-5 py-4">VENCIMIENTO RCE</th>
                  <th className="px-5 py-4">VENCIMIENTO RCC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60 font-sans">
                {cargando && vehiculos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                      <p className="font-medium">Consultando estado documental...</p>
                    </td>
                  </tr>
                ) : vehiculosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Truck className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-300">No se encontraron vehículos</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {filtro === 'vencidos' 
                          ? 'Excelente: No hay ningún vehículo con documentos vencidos.' 
                          : filtro === 'por_vencer' 
                          ? 'No hay vehículos con documentos próximos a vencer en los próximos 30 días.'
                          : 'No se encontraron registros con los criterios aplicados.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  vehiculosFiltrados.map((vehiculo, idx) => {
                    const { soat, tecno, rce, rcc } = obtenerFechas(vehiculo);

                    return (
                      <tr 
                        key={vehiculo.id || `doc-${vehiculo.tc}-${vehiculo.placa}-${idx}`}
                        className="hover:bg-gray-700/40 transition-colors"
                      >
                        {/* Móvil (TC) */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                              {vehiculo.tc || 'N/D'}
                            </div>
                            {vehiculo.numero_interno && vehiculo.numero_interno !== vehiculo.tc && (
                              <span className="text-xs text-gray-400 font-mono">
                                (Int: {vehiculo.numero_interno})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Placa */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs tracking-wider">
                            {vehiculo.placa || 'SIN PLACA'}
                          </span>
                        </td>

                        {/* SOAT */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderCeldaDocumento(soat, 'SOAT')}
                        </td>

                        {/* Tecnomecánica */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderCeldaDocumento(tecno, 'RTM')}
                        </td>

                        {/* Vencimiento RCE */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderCeldaDocumento(rce, 'RCE')}
                        </td>

                        {/* Vencimiento RCC */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderCeldaDocumento(rcc, 'RCC')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
