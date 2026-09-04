import React, { useState } from 'react';
import { 
  Calendar, 
  Download, 
  Table, 
  List, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  BarChart3,
  Truck,
  UserCheck
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';

// Interfaces para los tipos de datos de cada RPC
interface RegistroRecorridoDiario {
  tc?: string | number;
  placa?: string;
  fecha?: string;
  km_inicio?: number | null;
  kilometraje_inicio?: number | null;
  km_siguiente?: number | null;
  kilometraje_siguiente?: number | null;
  km_dia_siguiente?: number | null;
  recorrido?: number | null;
  recorrido_real?: number | null;
  total_recorrido?: number | null;
  [key: string]: any;
}

interface RegistroAuditoriaKilometraje {
  tc?: string | number;
  placa?: string;
  id_operador?: string | number;
  operador_id?: string | number;
  cedula_operador?: string | number;
  conductor_id?: string | number;
  fecha_hora?: string;
  fecha?: string;
  created_at?: string;
  kilometraje?: number | null;
  km?: number | null;
  [key: string]: any;
}

export default function ReportesKilometraje() {
  // Tarea 1: Estados Necesarios
  const hoyStr = dayjs().format('YYYY-MM-DD');
  const [fechaInicio, setFechaInicio] = useState<string>(hoyStr);
  const [fechaFin, setFechaFin] = useState<string>(hoyStr);
  const [vistaActiva, setVistaActiva] = useState<'diario' | 'auditoria'>('diario');
  const [datosDiario, setDatosDiario] = useState<RegistroRecorridoDiario[]>([]);
  const [datosAuditoria, setDatosAuditoria] = useState<RegistroAuditoriaKilometraje[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [haBuscado, setHaBuscado] = useState<boolean>(false);

  // Helper para normalizar respuestas RPC que pueden venir como objeto JSON parsed o array
  const normalizarDataRPC = (data: any): any[] => {
    if (!data) return [];
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (Array.isArray(data)) return data;
    return [];
  };

  // Tarea 2: Función de Consulta a Supabase
  const consultarDatos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona la Fecha de Inicio y la Fecha de Fin.');
      return;
    }

    if (dayjs(fechaInicio).isAfter(dayjs(fechaFin))) {
      setError('La Fecha de Inicio no puede ser posterior a la Fecha de Fin.');
      return;
    }

    try {
      setLoading(true);
      setHaBuscado(true);

      // Ejecutar ambas RPC concurrentemente
      const [resDiario, resAuditoria] = await Promise.all([
        supabase.rpc('reporte_recorrido_diario', {
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin
        }),
        supabase.rpc('reporte_auditoria_kilometraje', {
          p_fecha_inicio: fechaInicio,
          p_fecha_fin: fechaFin
        })
      ]);

      if (resDiario.error && resAuditoria.error) {
        console.error('Error al ejecutar RPCs:', resDiario.error, resAuditoria.error);
        throw new Error(resDiario.error.message || resAuditoria.error.message || 'Error al consultar datos.');
      }

      if (resDiario.error) {
        console.warn('Advertencia reporte_recorrido_diario:', resDiario.error);
      }
      if (resAuditoria.error) {
        console.warn('Advertencia reporte_auditoria_kilometraje:', resAuditoria.error);
      }

      const listaDiario = normalizarDataRPC(resDiario.data);
      const listaAuditoria = normalizarDataRPC(resAuditoria.data);

      setDatosDiario(listaDiario);
      setDatosAuditoria(listaAuditoria);
    } catch (err: any) {
      console.error('Error en consultarDatos:', err);
      setError(err.message || 'Error al consultar la información en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  // Tarea 3: Función de Exportación a CSV
  const descargarCSV = () => {
    setError(null);
    const datosActuales = vistaActiva === 'diario' ? datosDiario : datosAuditoria;

    if (!datosActuales || datosActuales.length === 0) {
      setError('No hay datos disponibles en la vista actual para exportar.');
      return;
    }

    const limpiarCampo = (val: any) => {
      const str = String(val ?? '').trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = '';

    if (vistaActiva === 'diario') {
      const cabeceras = ['TC', 'Placa', 'Fecha', 'KM Inicio', 'KM Siguiente', 'Recorrido'];
      const filas = datosDiario.map((item) => {
        const tc = item.tc ?? '';
        const placa = item.placa ?? '';
        const fecha = item.fecha ? dayjs(item.fecha).format('YYYY-MM-DD') : '';
        const kmInicio = item.km_inicio ?? item.kilometraje_inicio ?? 0;
        const kmSig = item.km_siguiente ?? item.km_dia_siguiente ?? item.kilometraje_siguiente ?? 0;
        const recorrido = item.recorrido_real ?? item.recorrido ?? item.total_recorrido ?? (Number(kmSig) > 0 ? Number(kmSig) - Number(kmInicio) : 0);

        return [
          limpiarCampo(tc),
          limpiarCampo(placa),
          limpiarCampo(fecha),
          limpiarCampo(kmInicio),
          limpiarCampo(kmSig),
          limpiarCampo(recorrido)
        ].join(',');
      });

      csvContent = '\uFEFF' + [cabeceras.join(','), ...filas].join('\r\n');
    } else {
      const cabeceras = ['TC', 'Placa', 'ID Operador', 'Fecha y Hora', 'Kilometraje'];
      const filas = datosAuditoria.map((item) => {
        const tc = item.tc ?? '';
        const placa = item.placa ?? '';
        const idOperador = item.id_operador ?? item.operador_id ?? item.cedula_operador ?? item.conductor_id ?? '';
        const fechaHora = item.fecha_hora ?? item.fecha ?? item.created_at ?? '';
        const fechaHoraFmt = fechaHora ? dayjs(fechaHora).format('YYYY-MM-DD HH:mm:ss') : '';
        const km = item.kilometraje ?? item.km ?? 0;

        return [
          limpiarCampo(tc),
          limpiarCampo(placa),
          limpiarCampo(idOperador),
          limpiarCampo(fechaHoraFmt),
          limpiarCampo(km)
        ].join(',');
      });

      csvContent = '\uFEFF' + [cabeceras.join(','), ...filas].join('\r\n');
    }

    // Generar archivo Blob y forzar descarga
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'reporte_kilometraje.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 md:p-8" id="reportes-kilometraje-view">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Reportes de Kilometraje
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                Auditoría y análisis de odómetros y recorridos de la flota vehicular
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-xl">
          <form onSubmit={consultarDatos} className="flex flex-col lg:flex-row items-stretch lg:items-end gap-4">
            
            {/* Fecha Inicio */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha Inicio
              </label>
              <input
                type="date"
                required
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-100 text-sm font-mono rounded-xl px-3.5 py-2.5 transition-colors"
              />
            </div>

            {/* Fecha Fin */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha Fin
              </label>
              <input
                type="date"
                required
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-100 text-sm font-mono rounded-xl px-3.5 py-2.5 transition-colors"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center gap-3 pt-1 lg:pt-0">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                ) : (
                  <Search className="w-4 h-4 text-gray-950" />
                )}
                <span>Buscar</span>
              </button>

              <button
                type="button"
                onClick={descargarCSV}
                disabled={loading || (vistaActiva === 'diario' ? datosDiario.length === 0 : datosAuditoria.length === 0)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Exportar CSV</span>
              </button>
            </div>

          </form>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-700/50 rounded-xl p-3.5 flex items-center gap-2.5 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pestañas (Tabs) */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
          <button
            type="button"
            onClick={() => setVistaActiva('diario')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              vistaActiva === 'diario'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Recorrido Diario</span>
            {datosDiario.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/30 text-amber-300 font-mono">
                {datosDiario.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setVistaActiva('auditoria')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
              vistaActiva === 'auditoria'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Auditoría por Operador</span>
            {datosAuditoria.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-amber-500/30 text-amber-300 font-mono">
                {datosAuditoria.length}
              </span>
            )}
          </button>
        </div>

        {/* Tabla Diario (Condicional) */}
        {vistaActiva === 'diario' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-700">
                  <tr>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">TC</th>
                    <th className="px-5 py-4">Placa</th>
                    <th className="px-5 py-4">KM Inicio</th>
                    <th className="px-5 py-4">KM Día Siguiente</th>
                    <th className="px-5 py-4 text-right">Recorrido Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                        <p className="font-medium">Consultando reporte diario...</p>
                      </td>
                    </tr>
                  ) : datosDiario.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        <Truck className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-300">
                          {haBuscado ? 'No se encontraron registros de recorrido diario' : 'Haz clic en "Buscar" para cargar los datos'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {haBuscado ? 'Prueba ajustando el rango de fechas seleccionado' : 'Selecciona las fechas de inicio y fin arriba'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    datosDiario.map((item, idx) => {
                      const fechaFmt = item.fecha ? dayjs(item.fecha).format('DD/MM/YYYY') : '-';
                      const tc = item.tc ?? '-';
                      const placa = item.placa ?? '-';
                      const kmInicio = item.km_inicio ?? item.kilometraje_inicio ?? 0;
                      const kmSig = item.km_siguiente ?? item.km_dia_siguiente ?? item.kilometraje_siguiente ?? 0;
                      const recorrido = item.recorrido_real ?? item.recorrido ?? item.total_recorrido ?? (Number(kmSig) > 0 ? Number(kmSig) - Number(kmInicio) : 0);
                      const esMayorA400 = Number(recorrido) > 400;

                      return (
                        <tr key={idx} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-5 py-4 font-mono text-gray-300 whitespace-nowrap">
                            {fechaFmt}
                          </td>
                          <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                            {tc}
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold text-amber-400 whitespace-nowrap">
                            {placa}
                          </td>
                          <td className="px-5 py-4 font-mono text-gray-200 whitespace-nowrap">
                            {Number(kmInicio).toLocaleString()} KM
                          </td>
                          <td className="px-5 py-4 font-mono text-gray-200 whitespace-nowrap">
                            {Number(kmSig) > 0 ? `${Number(kmSig).toLocaleString()} KM` : '-'}
                          </td>
                          <td className={`px-5 py-4 font-mono font-bold text-right whitespace-nowrap ${
                            esMayorA400 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {Number(recorrido).toLocaleString()} KM
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabla Auditoría (Condicional) */}
        {vistaActiva === 'auditoria' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-700">
                  <tr>
                    <th className="px-5 py-4">Fecha y Hora</th>
                    <th className="px-5 py-4">TC</th>
                    <th className="px-5 py-4">Placa</th>
                    <th className="px-5 py-4">ID Operador</th>
                    <th className="px-5 py-4 text-right">Kilometraje Reportado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60 font-sans">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                        <p className="font-medium">Consultando auditoría de operadores...</p>
                      </td>
                    </tr>
                  ) : datosAuditoria.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                        <UserCheck className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                        <p className="font-semibold text-gray-300">
                          {haBuscado ? 'No se encontraron registros de auditoría' : 'Haz clic en "Buscar" para cargar los datos'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {haBuscado ? 'Prueba ajustando el rango de fechas seleccionado' : 'Selecciona las fechas de inicio y fin arriba'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    datosAuditoria.map((item, idx) => {
                      const fechaHora = item.fecha_hora ?? item.fecha ?? item.created_at;
                      const fechaHoraFmt = fechaHora ? dayjs(fechaHora).format('DD/MM/YYYY HH:mm:ss') : '-';
                      const tc = item.tc ?? '-';
                      const placa = item.placa ?? '-';
                      const idOperador = item.id_operador ?? item.operador_id ?? item.cedula_operador ?? item.conductor_id ?? '-';
                      const km = item.kilometraje ?? item.km ?? 0;

                      return (
                        <tr key={idx} className="hover:bg-gray-700/40 transition-colors">
                          <td className="px-5 py-4 font-mono text-gray-300 whitespace-nowrap">
                            {fechaHoraFmt}
                          </td>
                          <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                            {tc}
                          </td>
                          <td className="px-5 py-4 font-mono font-semibold text-amber-400 whitespace-nowrap">
                            {placa}
                          </td>
                          <td className="px-5 py-4 font-mono text-gray-200 whitespace-nowrap">
                            {idOperador}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-emerald-400 text-right whitespace-nowrap">
                            {Number(km).toLocaleString()} KM
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
