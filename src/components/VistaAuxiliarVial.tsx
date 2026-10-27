import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  User, 
  Clock, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  LogOut, 
  FileCheck, 
  ShieldAlert, 
  ShieldCheck, 
  Loader2,
  Calendar,
  Route
} from 'lucide-react';
import { supabase } from '../lib/apiClients';
import { useTheme } from '../context/ThemeContext';

export interface VistaAuxiliarVialProps {
  session?: {
    user?: {
      id?: string;
      nombre?: string;
      nombres_apellidos?: string;
      identificacion?: string;
      rol?: string;
      cargo?: string;
    };
    [key: string]: any;
  } | null;
  onLogout?: () => void;
}

interface InspeccionItem {
  id?: string | number | null;
  id_inspeccion?: string | number | null;
  codigo_preoperacional?: string | null;
  created_at?: string | null;
  fecha?: string | null;
  hora_salida?: string | null;
  hist_estado_soat?: string | null;
  hist_estado_rtm?: string | null;
  estado_autorizacion?: string | null;
  resultado_dictamen?: string | null;
  nombre_ruta?: string | null;
  ruta_asignada?: string | null;
  ruta?: string | null;
  vehiculo_id?: string | number | null;
  operador_id?: string | number | null;
  vehiculos?: {
    tc?: string | null;
    placa?: string | null;
  } | null;
  operadores?: {
    nombres_apellidos?: string | null;
  } | null;
  rutas?: {
    nombre_ruta?: string | null;
    nume_ruta?: string | null;
  } | null;
  [key: string]: any;
}

export default function VistaAuxiliarVial({ session, onLogout }: VistaAuxiliarVialProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'control' | 'despachos'>('control');
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  });
  const [registros, setRegistros] = useState<InspeccionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nombre del auxiliar logueado
  const nombreAuxiliar = 
    session?.user?.nombres_apellidos ?? 
    session?.user?.nombre ?? 
    'Auxiliar en Vía';

  // Consulta principal a Supabase
  const cargarInspecciones = async () => {
    setLoading(true);
    setError(null);
    try {
      // Intento 1: Consulta directa con relaciones vehiculos, operadores y rutas (código corto)
      let { data, error: queryError } = await supabase
        .from('inspecciones_preoperacionales')
        .select('*, vehiculos(tc, placa), operadores(nombres_apellidos), rutas(nume_ruta)')
        .order('created_at', { ascending: false })
        .limit(100);

      // Si falla por ambigüedad de relaciones explícitas, intentar con claves foráneas nombradas
      if (queryError) {
        console.warn('Aviso en consulta relacional directa, intentando con foreign keys explícitas:', queryError);
        const fallback = await supabase
          .from('inspecciones_preoperacionales')
          .select(`
            *,
            vehiculos:vehiculos!inspecciones_preoperacionales_vehiculo_id_fkey(tc, placa),
            operadores:operadores!inspecciones_preoperacionales_operador_id_fkey(nombres_apellidos),
            rutas(nombre_ruta, nume_ruta)
          `)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!fallback.error && fallback.data) {
          data = fallback.data;
          queryError = null;
        } else {
          // Último recurso sin JOIN de rutas para no bloquear la vista
          const fallbackSimple = await supabase
            .from('inspecciones_preoperacionales')
            .select('*, vehiculos(tc, placa), operadores(nombres_apellidos)')
            .order('created_at', { ascending: false })
            .limit(100);
          data = fallbackSimple.data;
          queryError = fallbackSimple.error;
        }
      }

      if (queryError) {
        throw new Error(queryError.message || 'Error al consultar las inspecciones preoperacionales.');
      }

      // Normalizar rutas y resolver UUIDs crudos contra la tabla de rutas
      const { data: catalogoRutas } = await supabase.from('rutas').select('*');
      const registrosFormateados = (data || []).map((ins: any) => {
        const rutaObj = Array.isArray(ins.rutas) ? ins.rutas[0] : ins.rutas;
        const codigoCorto = rutaObj?.nume_ruta || rutaObj?.nombre_ruta;
        
        if (codigoCorto) {
          ins.rutas = { nume_ruta: codigoCorto, nombre_ruta: codigoCorto };
        } else if (catalogoRutas && catalogoRutas.length > 0) {
          const rawRuta = ins.ruta || ins.ruta_asignada || ins.ruta_id;
          const matchRuta = catalogoRutas.find((r: any) => 
            (rawRuta && (r.id === rawRuta || r.id_ruta === rawRuta || r.nume_ruta === rawRuta || r.nombre_ruta === rawRuta))
          );
          if (matchRuta) {
            const shortCode = matchRuta.nume_ruta || matchRuta.nombre_ruta || matchRuta.id_ruta;
            ins.rutas = {
              nume_ruta: shortCode,
              nombre_ruta: shortCode
            };
          }
        }
        return ins;
      });

      setRegistros((registrosFormateados as InspeccionItem[]) ?? []);
    } catch (err: any) {
      console.error('Error cargando inspecciones:', err);
      setError(err?.message ?? 'Ocurrió un error al cargar la información en vía.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInspecciones();
  }, []);

  // Formateador seguro de hora forzando zona horaria Colombia
  const formatearHoraColombia = (fechaString?: string | null): string => {
    if (!fechaString) return '--:--';
    try {
      const date = new Date(fechaString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('en-US', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '--:--';
    }
  };

  // Evaluación de estado documental (SOAT y RTM)
  const evaluarEstadoDocumental = (item: InspeccionItem) => {
    const soat = (item?.hist_estado_soat ?? '').toString().toLowerCase();
    const rtm = (item?.hist_estado_rtm ?? '').toString().toLowerCase();

    const tieneAlerta = soat.includes('vencido') || rtm.includes('vencido');

    if (tieneAlerta) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-500 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs tracking-wider animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5" />
          ALERTA DOCUMENTAL
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs tracking-wider">
        <ShieldCheck className="w-3.5 h-3.5" />
        DOCUMENTACIÓN AL DÍA
      </span>
    );
  };

  // Utilidad para extraer la fecha local exacta (YYYY-MM-DD) forzando la zona horaria de Colombia
  const obtenerFechaLocal = (fechaString: string) => {
    if (!fechaString) return '';
    return new Date(fechaString).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  };

  // Filtrado de tarjetas por TC, Placa, Nombre de Operador y Fecha
  const registrosFiltrados = useMemo(() => {
    if (!registros || registros.length === 0) return [];

    return registros.filter((item) => {
      // Filtro de texto existente
      let coincideTexto = true;
      if (searchTerm?.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const tc = (item.vehiculos?.tc ?? item.tc ?? item.movil ?? '').toString().toLowerCase();
        const placa = (item.vehiculos?.placa ?? item.placa ?? '').toString().toLowerCase();
        const operador = (item.operadores?.nombres_apellidos ?? item.operador_nombre ?? item.conductor_nombre ?? '').toString().toLowerCase();
        coincideTexto = tc.includes(term) || placa.includes(term) || operador.includes(term);
      }

      // Nuevo filtro por fecha
      const fechaRegistro = (item.created_at ?? item.fecha ?? item.fecha_registro ?? '').toString();
      const coincideFecha = !fechaFiltro || obtenerFechaLocal(fechaRegistro) === fechaFiltro;

      return coincideTexto && coincideFecha;
    });
  }, [registros, searchTerm, fechaFiltro]);

  return (
    <div className={`min-h-screen w-full transition-colors duration-200 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* CABECERA MOBILE-FIRST */}
      <header className={`sticky top-0 z-30 px-4 py-3.5 border-b backdrop-blur-md shadow-xs ${
        isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
      }`}>
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
              <Bus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-blue-600 dark:text-blue-400 block">
                Personal en Vía
              </span>
              <h1 className="text-sm font-bold truncate">
                {nombreAuxiliar}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={cargarInspecciones}
              disabled={loading}
              className={`p-2 rounded-lg border transition-all ${
                isLight 
                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main className="max-w-md mx-auto px-4 py-4 space-y-4">

        {/* BUSCADOR GLOBAL */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por TC, placa u operador..."
            className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all outline-none shadow-xs ${
              isLight 
                ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100' 
                : 'bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
        </div>

        {/* FILTRO DE FECHA */}
        <div className="relative w-full">
          <input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition-all outline-none shadow-xs cursor-pointer ${
              isLight 
                ? 'bg-white text-slate-900 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100' 
                : 'bg-slate-900 text-slate-100 border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }`}
          />
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
        <div className={`grid grid-cols-2 p-1 rounded-xl border ${
          isLight ? 'bg-slate-200/80 border-slate-300/80' : 'bg-slate-900 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('control')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'control'
                ? isLight 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'bg-slate-800 text-blue-400 shadow-xs'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Control de Salidas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('despachos')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'despachos'
                ? isLight 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'bg-slate-800 text-blue-400 shadow-xs'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Relación de Despachos</span>
          </button>
        </div>

        {/* ESTADOS: CARGANDO / ERROR */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-bold text-slate-500">Cargando información en vía...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-col w-full rounded-lg shadow-sm p-4 mb-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold">Error de sincronización</p>
                <p className="text-xs opacity-90">{error}</p>
                <button
                  type="button"
                  onClick={cargarInspecciones}
                  className="mt-1 text-xs font-extrabold text-blue-600 dark:text-blue-400 underline cursor-pointer"
                >
                  Reintentar consulta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LISTADO DE TARJETAS (MOBILE-FIRST FLEX-COL) */}
        {!loading && !error && (
          <div className="space-y-3">
            {registrosFiltrados.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold">No se encontraron registros</p>
                <p className="text-[11px] mt-0.5">
                  {searchTerm ? 'Intenta con otro término de búsqueda.' : 'No hay inspecciones registradas recientemente.'}
                </p>
              </div>
            ) : (
              registrosFiltrados.map((item, idx) => {
                const tc = item.vehiculos?.tc ?? item.tc ?? item.movil ?? 'S/N';
                const placa = item.vehiculos?.placa ?? item.placa ?? 'SIN PLACA';
                const operador = item.operadores?.nombres_apellidos ?? item.operador_nombre ?? item.conductor_nombre ?? 'Operador no asignado';
                const horaSalida = formatearHoraColombia(item.created_at ?? item.fecha ?? item.hora_salida);

                // Clave única garantizada para evitar advertencias de React si id viene nulo o duplicado
                const uniqueKey = item.id 
                  ? `card-${item.id}-${idx}` 
                  : item.id_inspeccion 
                    ? `card-${item.id_inspeccion}-${idx}` 
                    : item.codigo_preoperacional 
                      ? `card-${item.codigo_preoperacional}-${idx}` 
                      : `card-item-${idx}`;

                return (
                  <div
                    key={uniqueKey}
                    className={`flex-col w-full rounded-lg shadow-sm p-4 mb-4 transition-all border ${
                      isLight 
                        ? 'bg-white border-slate-200/90 hover:border-slate-300 shadow-slate-200/50' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-black/20'
                    }`}
                  >
                    {/* ENCABEZADO DE TARJETA: MÓVIL / PLACA */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                          {tc}
                        </span>
                        <span className="text-gray-400 font-bold text-xs">-</span>
                        <span className="font-mono font-semibold text-sm uppercase tracking-wider text-gray-700 dark:text-slate-200">
                          {placa}
                        </span>
                      </div>

                      {/* RUTA */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        <Route className="w-3 h-3 text-cyan-500" />
                        {item.rutas?.nume_ruta ?? 'S/R'}
                      </span>
                    </div>

                    {/* OPERADOR */}
                    <div className="py-2.5 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-xs font-semibold leading-tight truncate">
                        {operador}
                      </p>
                    </div>

                    {/* CONTENIDO SEGÚN PESTAÑA */}
                    {activeTab === 'control' ? (
                      /* PESTAÑA 1: CONTROL DE SALIDAS (ESTADO DEL VEHÍCULO Y DOCUMENTACIÓN) */
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div>{evaluarEstadoDocumental(item)}</div>

                        <div className="text-[11px] font-mono font-semibold text-gray-700 dark:text-slate-300">
                          SOAT: <span className={`uppercase font-bold ${
                            (item.hist_estado_soat ?? '').toLowerCase().includes('vencido')
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {item.hist_estado_soat ?? 'VIGENTE'}
                          </span> | RTM: <span className={`uppercase font-bold ${
                            (item.hist_estado_rtm ?? '').toLowerCase().includes('vencido')
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {item.hist_estado_rtm ?? 'VIGENTE'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* PESTAÑA 2: RELACIÓN DE DESPACHOS (HORA DE SALIDA) */
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          Hora de Salida:
                        </span>

                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-900/40">
                          <Clock className="w-3.5 h-3.5" />
                          {horaSalida}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
