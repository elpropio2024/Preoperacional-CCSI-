import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, 
  Calendar, 
  Edit3, 
  Gauge, 
  Truck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Save, 
  ShieldAlert, 
  FileText,
  Clock,
  Car,
  LogOut
} from 'lucide-react';
import dayjs from 'dayjs';
import { supabase } from '../lib/apiClients';
import ExportarKilometrajeCSV from './ExportarKilometrajeCSV';

export interface VehiculoMantenimiento {
  id: string;
  tc: string | number;
  placa: string;
  numero_interno?: string | number | null;
  tipo_vehiculo?: string | null;
  kilometraje?: number | null;
  vencimiento_soat?: string | null;
  soat_vencimiento?: string | null;
  rtm_vencimiento?: string | null;
  vencimiento_rtm?: string | null;
  vencimiento_rce?: string | null;
  vencimiento_rcc?: string | null;
  estado?: string | null;
  [key: string]: any;
}

interface FormEdicionState {
  kilometraje: string | number;
  vencimiento_soat: string;
  rtm_vencimiento: string;
  vencimiento_rce: string;
  vencimiento_rcc: string;
}

interface GestionMantenimientoProps {
  onLogout?: () => void;
  adminSession?: any;
}

export default function GestionMantenimiento({ onLogout, adminSession }: GestionMantenimientoProps) {
  const [vehiculos, setVehiculos] = useState<VehiculoMantenimiento[]>([]);
  const [vehiculoEditando, setVehiculoEditando] = useState<VehiculoMantenimiento | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState<string>('');
  
  // Estado local para los campos del formulario modal
  const [formData, setFormData] = useState<FormEdicionState>({
    kilometraje: '',
    vencimiento_soat: '',
    rtm_vencimiento: '',
    vencimiento_rce: '',
    vencimiento_rcc: ''
  });

  // 1. Cargar lista de vehículos desde Supabase y sincronizar odómetro
  const fetchVehiculos = async () => {
    try {
      setCargando(true);
      setError(null);

      const { data, error: errVeh } = await supabase
        .from('vehiculos')
        .select('*')
        .order('tc', { ascending: true });

      if (errVeh) {
        console.error('Error consultando tabla vehiculos:', errVeh);
        throw new Error(errVeh.message || 'No se pudo cargar el listado de vehículos');
      }

      // Consultar las últimas inspecciones para obtener el kilometraje actualizado si no está en la tabla vehiculos
      let ultimasInspMap: Record<string, number> = {};
      try {
        const { data: inspData } = await supabase
          .from('inspecciones_preoperacionales')
          .select('vehiculo_id, placa, kilometraje, fecha')
          .order('fecha', { ascending: false });

        if (inspData && Array.isArray(inspData)) {
          inspData.forEach((insp: any) => {
            const km = Number(insp.kilometraje);
            if (!isNaN(km) && km > 0) {
              if (insp.vehiculo_id && !ultimasInspMap[insp.vehiculo_id]) {
                ultimasInspMap[insp.vehiculo_id] = km;
              }
              if (insp.placa && !ultimasInspMap[insp.placa.toLowerCase()]) {
                ultimasInspMap[insp.placa.toLowerCase()] = km;
              }
            }
          });
        }
      } catch (e) {
        console.warn('No se pudieron precargar kilometrajes de inspecciones:', e);
      }

      const vehiculosEnriquecidos = (data || []).map((v: any) => {
        const kmDirecto = v.kilometraje ?? v.km ?? v.odometro ?? v.km_actual ?? null;
        const kmInsp = ultimasInspMap[v.id] || (v.placa ? ultimasInspMap[v.placa.toLowerCase()] : null);
        return {
          ...v,
          kilometraje: kmDirecto != null ? Number(kmDirecto) : (kmInsp != null ? Number(kmInsp) : null)
        };
      });

      setVehiculos(vehiculosEnriquecidos);
    } catch (err: any) {
      console.error('Error en fetchVehiculos:', err);
      setError(err.message || 'Error de conexión con la base de datos');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchVehiculos();
  }, []);

  // Al seleccionar un vehículo para editar, inicializamos el formulario
  const abrirModalEdicion = (vehiculo: VehiculoMantenimiento) => {
    setVehiculoEditando(vehiculo);
    
    // Normalizar fechas para formato YYYY-MM-DD del input type="date"
    const formatearParaInput = (fechaStr?: string | null) => {
      if (!fechaStr) return '';
      return dayjs(fechaStr).isValid() ? dayjs(fechaStr).format('YYYY-MM-DD') : '';
    };

    setFormData({
      kilometraje: vehiculo.kilometraje != null ? vehiculo.kilometraje : '',
      vencimiento_soat: formatearParaInput(vehiculo.vencimiento_soat || vehiculo.fecha_soat || vehiculo.soat_vencimiento),
      rtm_vencimiento: formatearParaInput(vehiculo.rtm_vencimiento || vehiculo.fecha_tecno || vehiculo.vencimiento_rtm),
      vencimiento_rce: formatearParaInput(vehiculo.vencimiento_rce),
      vencimiento_rcc: formatearParaInput(vehiculo.vencimiento_rcc)
    });
  };

  const cerrarModal = () => {
    setVehiculoEditando(null);
    setFormData({
      kilometraje: '',
      vencimiento_soat: '',
      rtm_vencimiento: '',
      vencimiento_rce: '',
      vencimiento_rcc: ''
    });
  };

  // 2. Guardar cambios en Supabase con captura de errores detallada y alertas
  const handleUpdateVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehiculoEditando) return;

    try {
      setGuardando(true);
      setError(null);

      // Convertir kilometraje a tipo numérico
      const parsedKm = formData.kilometraje !== '' ? parseInt(String(formData.kilometraje), 10) : null;
      if (formData.kilometraje !== '' && (parsedKm === null || isNaN(parsedKm))) {
        alert('Por favor ingresa un kilometraje numérico válido.');
        setGuardando(false);
        return;
      }

      // Preparar payload con columnas exactas
      const updatePayload: Record<string, any> = {
        kilometraje: parsedKm,
        vencimiento_soat: formData.vencimiento_soat || null,
        rtm_vencimiento: formData.rtm_vencimiento || null,
        vencimiento_rce: formData.vencimiento_rce || null,
        vencimiento_rcc: formData.vencimiento_rcc || null
      };

      const { data, error } = await supabase
        .from('vehiculos')
        .update(updatePayload)
        .eq('id', vehiculoEditando.id)
        .select();

      if (error) {
        console.error("Error detallado de Supabase:", error);
        alert("Error al actualizar: " + error.message);
        throw error;
      }

      // Actualizar el estado local inmediatamente para reflejar los cambios en la UI
      setVehiculos(prev =>
        prev.map(v => {
          if (v.id === vehiculoEditando.id) {
            return {
              ...v,
              ...updatePayload,
              kilometraje: parsedKm !== null ? parsedKm : v.kilometraje
            };
          }
          return v;
        })
      );

      alert("Vehículo actualizado correctamente");
      setMensajeExito(`Vehículo TC ${vehiculoEditando.tc} (${vehiculoEditando.placa}) actualizado correctamente.`);
      setTimeout(() => setMensajeExito(null), 4000);
      cerrarModal();
    } catch (err: any) {
      console.error("Fallo en handleUpdateVehiculo:", err);
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar vehículos por TC o Placa
  const vehiculosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return vehiculos;
    const term = busqueda.toLowerCase().trim();
    return vehiculos.filter(v => 
      String(v.tc || '').toLowerCase().includes(term) ||
      String(v.placa || '').toLowerCase().includes(term) ||
      String(v.tipo_vehiculo || '').toLowerCase().includes(term)
    );
  }, [vehiculos, busqueda]);

  // Helper para renderizar estado de vencimiento
  const renderEstadoFecha = (fechaStr?: string | null) => {
    if (!fechaStr) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
          Sin registro
        </span>
      );
    }

    const fecha = dayjs(fechaStr);
    if (!fecha.isValid()) {
      return <span className="text-gray-400 text-xs">{fechaStr}</span>;
    }

    const hoy = dayjs().startOf('day');
    const diasRestantes = fecha.diff(hoy, 'day');

    if (diasRestantes < 0) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-rose-400">{fecha.format('DD/MM/YYYY')}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500">
            <AlertTriangle className="w-3 h-3" /> Vencido ({Math.abs(diasRestantes)}d)
          </span>
        </div>
      );
    }

    if (diasRestantes <= 15) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-amber-300">{fecha.format('DD/MM/YYYY')}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
            <Clock className="w-3 h-3" /> Vence en {diasRestantes}d
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-emerald-400">{fecha.format('DD/MM/YYYY')}</span>
        <span className="text-[10px] text-gray-400">Vigente ({diasRestantes}d)</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8" id="gestion-mantenimiento-view">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado Principal */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/20 border border-amber-500/30 p-3.5 rounded-2xl text-amber-400">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Control de Mantenimiento y Flota
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Supervisión y actualización de odómetro (kilometraje) y vigencia de documentos vehiculares.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchVehiculos}
              disabled={cargando}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700/80 hover:bg-gray-700 active:bg-gray-600 text-gray-200 border border-gray-600 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              title="Recargar listado"
            >
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-amber-400' : ''}`} />
              <span>{cargando ? 'Cargando...' : 'Actualizar'}</span>
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Notificación de Éxito */}
        {mensajeExito && (
          <div className="bg-emerald-950/70 border border-emerald-700/60 rounded-xl p-4 flex items-center gap-3 text-emerald-200 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm font-medium">{mensajeExito}</p>
          </div>
        )}

        {/* Notificación de Error */}
        {error && (
          <div className="bg-rose-950/70 border border-rose-700/60 rounded-xl p-4 flex items-center gap-3 text-rose-200 animate-fade-in shadow-lg">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Módulo de Exportación de Kilometraje */}
        <ExportarKilometrajeCSV />

        {/* Barra de Búsqueda y Métricas Rápidas */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por TC, Placa o Tipo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
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

          <div className="flex items-center gap-4 text-xs text-gray-400 w-full sm:w-auto justify-end">
            <span className="bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg font-medium">
              Total Vehículos: <strong className="text-amber-400">{vehiculos.length}</strong>
            </span>
            {busqueda && (
              <span className="bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg font-medium">
                Filtrados: <strong className="text-gray-200">{vehiculosFiltrados.length}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Tabla de Vehículos */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-900/90 text-gray-400 uppercase text-[11px] font-bold tracking-wider border-b border-gray-700">
                <tr>
                  <th className="px-5 py-4">Móvil (TC)</th>
                  <th className="px-5 py-4">Placa</th>
                  <th className="px-5 py-4">Kilometraje Actual</th>
                  <th className="px-5 py-4">Vencimiento SOAT</th>
                  <th className="px-5 py-4">Vencimiento Tecno</th>
                  <th className="px-5 py-4">VENCIMIENTO RCE</th>
                  <th className="px-5 py-4">VENCIMIENTO RCC</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60 font-sans">
                {cargando && vehiculos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <RefreshCw className="w-7 h-7 animate-spin text-amber-400 mx-auto mb-2" />
                      <p className="font-medium">Cargando flota vehicular...</p>
                    </td>
                  </tr>
                ) : vehiculosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <Truck className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                      <p className="font-semibold text-gray-300">No se encontraron vehículos</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {busqueda ? 'Intenta con otro criterio de búsqueda' : 'No hay registros en la tabla de vehículos'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  vehiculosFiltrados.map((vehiculo) => {
                    const soatFecha = vehiculo.vencimiento_soat || vehiculo.soat_vencimiento;
                    const rtmFecha = vehiculo.rtm_vencimiento || vehiculo.vencimiento_rtm;
                    const rceFecha = vehiculo.vencimiento_rce;
                    const rccFecha = vehiculo.vencimiento_rcc;

                    return (
                      <tr 
                        key={vehiculo.id || `veh-${vehiculo.tc}-${vehiculo.placa}`}
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

                        {/* Kilometraje Actual */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="font-mono font-bold text-purple-300">
                              {vehiculo.kilometraje != null 
                                ? `${Number(vehiculo.kilometraje).toLocaleString('es-CO')} km` 
                                : <span className="text-gray-500 text-xs font-normal">No registrado</span>}
                            </span>
                          </div>
                        </td>

                        {/* Vencimiento SOAT */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderEstadoFecha(soatFecha)}
                        </td>

                        {/* Vencimiento Tecno */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderEstadoFecha(rtmFecha)}
                        </td>

                        {/* Vencimiento RCE */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderEstadoFecha(rceFecha)}
                        </td>

                        {/* Vencimiento RCC */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {renderEstadoFecha(rccFecha)}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => abrirModalEdicion(vehiculo)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                            title="Editar odómetro y fechas de vencimiento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE EDICIÓN */}
        {vehiculoEditando && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            id="modal-editar-vehiculo"
          >
            <div 
              className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in"
              role="dialog"
              aria-modal="true"
            >
              {/* Encabezado del Modal */}
              <div className="bg-gray-900/90 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/20 border border-amber-500/30 p-2.5 rounded-xl text-amber-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Actualizar Ficha Técnica
                    </h3>
                    <p className="text-xs text-gray-400">
                      Móvil TC: <strong className="text-amber-400 font-mono">{vehiculoEditando.tc}</strong> • Placa: <strong className="text-gray-200 font-mono">{vehiculoEditando.placa}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleUpdateVehiculo} className="p-6 space-y-4">
                
                {/* Kilometraje (Odómetro) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-purple-400" />
                    Kilometraje Actual (Odómetro)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ej: 145200"
                      value={formData.kilometraje}
                      onChange={(e) => setFormData(prev => ({ ...prev, kilometraje: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 font-mono">
                      KM
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    Lectura física actual del tacógrafo u odómetro del bus.
                  </span>
                </div>

                {/* Grid de Fechas de Documentos */}
                <div className="pt-2 border-t border-gray-700/60 space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    Vigencia de Documentación Legal
                  </h4>

                  {/* Vencimiento SOAT */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Fecha Vencimiento SOAT
                    </label>
                    <input
                      type="date"
                      value={formData.vencimiento_soat}
                      onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_soat: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  {/* Vencimiento Tecnomecánica */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Fecha Vencimiento Tecnomecánica (RTM)
                    </label>
                    <input
                      type="date"
                      value={formData.rtm_vencimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, rtm_vencimiento: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  {/* Vencimiento RCE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Vencimiento RCE (Responsabilidad Civil Extracontractual)
                    </label>
                    <input
                      type="date"
                      value={formData.vencimiento_rce}
                      onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_rce: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  {/* Vencimiento RCC */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Vencimiento RCC (Responsabilidad Civil Contractual)
                    </label>
                    <input
                      type="date"
                      value={formData.vencimiento_rcc}
                      onChange={(e) => setFormData(prev => ({ ...prev, vencimiento_rcc: e.target.value }))}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="pt-4 border-t border-gray-700 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    disabled={guardando}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {guardando ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
