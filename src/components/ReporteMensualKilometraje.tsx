import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gauge, 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  X, 
  FileSpreadsheet, 
  Truck,
  Fuel,
  Info
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';

export interface RegistroKilometrajeMensual {
  id?: string | number;
  tc?: string | number;
  movil?: string | number;
  placa?: string;
  km_inicial?: number | null;
  kilometraje_inicial?: number | null;
  km_final?: number | null;
  kilometraje_final?: number | null;
  recorrido_total?: number | null;
  total_recorrido?: number | null;
  recorrido?: number | null;
  [key: string]: any;
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export default function ReporteMensualKilometraje() {
  // Estado para mes y año seleccionados (por defecto el actual)
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(dayjs().month() + 1); // 1-12
  const [anioSeleccionado, setAnioSeleccionado] = useState<number>(dayjs().year());
  
  // Estado para los datos del reporte
  const [reporte, setReporte] = useState<RegistroKilometrajeMensual[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');

  // Generar lista de años dinámicos (últimos 5 años)
  const aniosDisponibles = useMemo(() => {
    const anioActual = dayjs().year();
    return [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];
  }, []);

  // Función para consultar la función RPC en Supabase
  const fetchReporteKilometraje = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('reporte_kilometraje_mensual', {
        mes_consulta: Number(mesSeleccionado),
        anio_consulta: Number(anioSeleccionado)
      });

      if (rpcError) {
        console.error('Error al ejecutar RPC reporte_kilometraje_mensual:', rpcError);
        throw new Error(rpcError.message || 'No se pudo generar el reporte de kilometraje mensual.');
      }

      // Si data viene como string JSON o array estructurado
      let parsedData: RegistroKilometrajeMensual[] = [];
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch {
          parsedData = [];
        }
      } else if (Array.isArray(data)) {
        parsedData = data;
      }

      setReporte(parsedData || []);
    } catch (err: any) {
      console.error('Error en fetchReporteKilometraje:', err);
      setError(err.message || 'Error de comunicación al consultar el reporte.');
      setReporte([]);
    } finally {
      setCargando(false);
    }
  };

  // Ejecutar consulta cada vez que cambie el mes o año
  useEffect(() => {
    fetchReporteKilometraje();
  }, [mesSeleccionado, anioSeleccionado]);

  // Filtrar reporte por búsqueda de TC o Placa
  const reporteFiltrado = useMemo(() => {
    if (!busqueda.trim()) return reporte;
    const term = busqueda.toLowerCase().trim();
    return reporte.filter((item) => {
      const tcVal = String(item.tc || item.movil || '');
      const placaVal = String(item.placa || '');
      return tcVal.toLowerCase().includes(term) || placaVal.toLowerCase().includes(term);
    });
  }, [reporte, busqueda]);

  // Resumen estadístico del mes
  const metricas = useMemo(() => {
    const totalVehiculos = reporte.length;
    let totalKmRecorridos = 0;
    let vehiculosAlerta = 0;

    reporte.forEach((item) => {
      const rec = Number(item.recorrido_total ?? item.total_recorrido ?? item.recorrido ?? 0);
      totalKmRecorridos += rec > 0 ? rec : 0;
      if (rec > 5000) {
        vehiculosAlerta += 1;
      }
    });

    return {
      totalVehiculos,
      totalKmRecorridos,
      vehiculosAlerta
    };
  }, [reporte]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8" id="reporte-kilometraje-view">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado Principal */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 border border-amber-500/30 p-3.5 rounded-2xl text-amber-400 shrink-0">
              <Gauge className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Reporte Mensual de Kilometraje
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Seguimiento de odómetro y análisis de desgaste operativo por vehículo.
              </p>
            </div>
          </div>

          {/* Selector de Mes y Año */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Select Mes */}
            <div className="relative">
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                className="appearance-none bg-gray-900 border border-gray-700 hover:border-gray-600 text-gray-100 text-sm font-semibold rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
              >
                {MESES.map((mes) => (
                  <option key={mes.value} value={mes.value} className="bg-gray-900 text-gray-100">
                    {mes.label}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Select Año */}
            <div className="relative">
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                className="appearance-none bg-gray-900 border border-gray-700 hover:border-gray-600 text-gray-100 text-sm font-semibold rounded-xl px-4 py-2.5 pr-9 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer"
              >
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio} className="bg-gray-900 text-gray-100">
                    {anio}
                  </option>
                ))}
              </select>
              <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Botón Refrescar */}
            <button
              onClick={fetchReporteKilometraje}
              disabled={cargando}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 border border-gray-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              title="Recargar reporte"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">{cargando ? 'Calculando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Total Vehículos Reportados</p>
              <p className="text-2xl font-bold text-white mt-1">{metricas.totalVehiculos}</p>
            </div>
            <div className="p-3 bg-gray-900 border border-gray-700 rounded-xl text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Recorrido Total Flota</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {metricas.totalKmRecorridos.toLocaleString('es-CO')} <span className="text-xs text-gray-400">km</span>
              </p>
            </div>
            <div className="p-3 bg-gray-900 border border-gray-700 rounded-xl text-purple-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Alerta Recorrido (+5.000 km)</p>
              <p className={`text-2xl font-bold mt-1 ${metricas.vehiculosAlerta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metricas.vehiculosAlerta} <span className="text-xs text-gray-400">buses</span>
              </p>
            </div>
            <div className={`p-3 bg-gray-900 border rounded-xl ${metricas.vehiculosAlerta > 0 ? 'border-rose-700/50 text-rose-400' : 'border-emerald-700/50 text-emerald-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Notificación de Error */}
        {error && (
          <div className="bg-rose-950/70 border border-rose-700/60 rounded-xl p-4 flex items-center gap-3 text-rose-200 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Error al obtener reporte</p>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Barra de Filtro de Búsqueda */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por TC o Placa..."
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

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Período: <strong className="text-gray-200">{MESES.find(m => m.value === mesSeleccionado)?.label} {anioSeleccionado}</strong>
            </span>
          </div>
        </div>

        {/* Tabla de Reporte */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/90 text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-700">
                <tr>
                  <th className="px-5 py-4">Móvil (TC)</th>
                  <th className="px-5 py-4">Placa</th>
                  <th className="px-5 py-4 text-right">KM Inicial (Mes)</th>
                  <th className="px-5 py-4 text-right">KM Final (Mes)</th>
                  <th className="px-5 py-4 text-right">Recorrido Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60 font-sans">
                {cargando ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                      <p className="font-medium">Calculando kilometraje mensual...</p>
                    </td>
                  </tr>
                ) : reporteFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      <FileSpreadsheet className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-300">No hay registros de recorrido</p>
                      <p className="text-xs text-gray-500 mt-1">
                        No se registraron planillas o lecturas de odómetro en {MESES.find(m => m.value === mesSeleccionado)?.label} {anioSeleccionado}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  reporteFiltrado.map((item, index) => {
                    const movilTc = item.tc || item.movil || 'N/D';
                    const placa = item.placa || 'SIN PLACA';
                    const kmInicial = item.km_inicial ?? item.kilometraje_inicial ?? 0;
                    const kmFinal = item.km_final ?? item.kilometraje_final ?? 0;
                    const recorrido = Number(item.recorrido_total ?? item.total_recorrido ?? item.recorrido ?? (kmFinal - kmInicial));
                    
                    const superaLimiteAlerta = recorrido > 5000;

                    return (
                      <tr 
                        key={item.id || `rep-${movilTc}-${placa}-${index}`}
                        className="hover:bg-gray-700/40 transition-colors"
                      >
                        {/* Móvil (TC) */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                              {movilTc}
                            </div>
                          </div>
                        </td>

                        {/* Placa */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs tracking-wider">
                            {placa}
                          </span>
                        </td>

                        {/* KM Inicial */}
                        <td className="px-5 py-4 whitespace-nowrap text-right font-mono text-gray-300">
                          {Number(kmInicial).toLocaleString('es-CO')} <span className="text-xs text-gray-500">km</span>
                        </td>

                        {/* KM Final */}
                        <td className="px-5 py-4 whitespace-nowrap text-right font-mono text-gray-300">
                          {Number(kmFinal).toLocaleString('es-CO')} <span className="text-xs text-gray-500">km</span>
                        </td>

                        {/* Recorrido Total */}
                        <td className="px-5 py-4 whitespace-nowrap text-right font-mono">
                          <div className="inline-flex items-center justify-end gap-2">
                            {superaLimiteAlerta && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                <AlertTriangle className="w-3 h-3" /> Cambio Aceite
                              </span>
                            )}
                            <span className={`text-base font-bold ${
                              superaLimiteAlerta ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {recorrido > 0 ? `+${recorrido.toLocaleString('es-CO')}` : recorrido.toLocaleString('es-CO')}
                            </span>
                            <span className="text-xs text-gray-500">km</span>
                          </div>
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
