import React, { useState } from 'react';
import { Download, Calendar, RefreshCw, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';

interface RegistroKilometrajeRango {
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

export default function ExportarKilometrajeCSV() {
  // Estado para fechas de inicio y fin (por defecto primer día del mes actual y hoy)
  const [fechaInicio, setFechaInicio] = useState<string>(
    dayjs().startOf('month').format('YYYY-MM-DD')
  );
  const [fechaFin, setFechaFin] = useState<string>(
    dayjs().format('YYYY-MM-DD')
  );

  const [descargando, setDescargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Función para convertir arreglo de objetos a formato CSV con escape adecuado
  const convertirACSV = (datos: RegistroKilometrajeRango[]): string => {
    const cabeceras = ['TC', 'Placa', 'Kilometraje Inicial', 'Kilometraje Final', 'Total Recorrido'];
    
    const filas = datos.map((item) => {
      const tc = item.tc ?? item.movil ?? '';
      const placa = item.placa ?? '';
      const kmInicial = item.km_inicial ?? item.kilometraje_inicial ?? 0;
      const kmFinal = item.km_final ?? item.kilometraje_final ?? 0;
      const recorrido = item.recorrido_total ?? item.total_recorrido ?? item.recorrido ?? (Number(kmFinal) - Number(kmInicial));

      // Escapar campos con comas o comillas si fuese necesario
      const limpiarCampo = (valor: any) => {
        const str = String(valor ?? '').trim();
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      return [
        limpiarCampo(tc),
        limpiarCampo(placa),
        limpiarCampo(kmInicial),
        limpiarCampo(kmFinal),
        limpiarCampo(recorrido)
      ].join(',');
    });

    // Agregar BOM (\uFEFF) para que Excel reconozca codificación UTF-8
    return '\uFEFF' + [cabeceras.join(','), ...filas].join('\r\n');
  };

  // Función principal para consultar Supabase RPC y descargar CSV
  const handleDescargarCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    if (!fechaInicio || !fechaFin) {
      setError('Por favor selecciona ambas fechas (Inicio y Fin).');
      return;
    }

    if (dayjs(fechaInicio).isAfter(dayjs(fechaFin))) {
      setError('La Fecha de Inicio no puede ser posterior a la Fecha de Fin.');
      return;
    }

    try {
      setDescargando(true);

      // Consulta a la función RPC en Supabase
      const { data, error: rpcError } = await supabase.rpc('reporte_kilometraje_rango', {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });

      if (rpcError) {
        console.error('Error al ejecutar RPC reporte_kilometraje_rango:', rpcError);
        throw new Error(rpcError.message || 'Error al obtener el reporte de kilometraje por rango.');
      }

      // Parsear respuesta si viene como string JSON o array
      let registros: RegistroKilometrajeRango[] = [];
      if (typeof data === 'string') {
        try {
          registros = JSON.parse(data);
        } catch {
          registros = [];
        }
      } else if (Array.isArray(data)) {
        registros = data;
      }

      if (!registros || registros.length === 0) {
        setError('No se encontraron registros de kilometraje para el rango de fechas seleccionado.');
        return;
      }

      // Convertir a CSV
      const csvString = convertirACSV(registros);

      // Crear Blob y forzar descarga nativa con <a>
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nombreArchivo = `reporte_kilometraje_${fechaInicio}_al_${fechaFin}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMensajeExito(`Reporte descargado exitosamente: ${registros.length} registros exportados.`);
      setTimeout(() => setMensajeExito(null), 5000);
    } catch (err: any) {
      console.error('Fallo en handleDescargarCSV:', err);
      setError(err.message || 'Ocurrió un error al generar la descarga del archivo CSV.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 shadow-xl text-gray-100" id="exportar-kilometraje-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-500/20 border border-amber-500/30 p-2.5 rounded-xl text-amber-400">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white">Exportar Reporte de Kilometraje (CSV)</h2>
          <p className="text-xs text-gray-400">Selecciona el rango de fechas para generar el archivo de odómetro consolidado.</p>
        </div>
      </div>

      <form onSubmit={handleDescargarCSV} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Fecha Inicio */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Fecha de Inicio
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Fecha de Fin
            </label>
            <input
              type="date"
              required
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 hover:border-gray-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-gray-100 text-sm font-mono rounded-xl px-3.5 py-2.5 transition-colors"
            />
          </div>

        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-700/50 rounded-xl p-3 flex items-center gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {mensajeExito && (
          <div className="bg-emerald-950/60 border border-emerald-700/50 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Botón de Descarga */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={descargando}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:from-amber-700 active:to-amber-800 text-gray-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {descargando ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                <span>Generando CSV...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-gray-950" />
                <span>Descargar CSV</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
