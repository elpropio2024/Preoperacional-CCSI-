import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import PanelOperadores from './PanelOperadores';
import DashboardAdministrativo from './DashboardAdministrativo';
import GestionIndicadores from './GestionIndicadores';
import DashboardMetricas from './DashboardMetricas';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  UserSquare2,
  Loader2, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  AlertTriangle,
  Bus,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  FileText,
  ClipboardCheck,
  RefreshCw,
  Activity,
  BarChart3,
  FileDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User
} from 'lucide-react';
import ModalPreoperacionalPDF from './ModalPreoperacionalPDF';

interface SidebarAdminProps {
  onLogout?: () => void;
  adminSession?: any;
  initialTab?: string;
  initialRole?: 'jefe_patio' | 'regulador';
}

export default function SidebarAdmin({ onLogout, adminSession, initialTab, initialRole }: SidebarAdminProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Navigation tab state
  const [pestañaActiva, setPestañaActiva] = useState(initialTab || 'inicio');
  const [subVista, setSubVista] = useState('operadores');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Stats / Dashboard indicators state
  const [metrics, setMetrics] = useState({
    totalOperadores: 0,
    totalUsuarios: 0,
    rutasActivas: 14,
    busesOperativos: 45
  });

  // Table 'usuarios' elements
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);
  const [busquedaUser, setBusquedaUser] = useState('');

  // Pagination for sub-tab users
  const [paginaActualUser, setPaginaActualUser] = useState(1);
  const FILAS_POR_PAGINA_USER = 12;

  // Manual registration form states
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCedula, setNuevaCedula] = useState('');
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [nuevoRol, setNuevoRol] = useState('Operador');
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [exitoRegistro, setExitoRegistro] = useState(false);

  // States for physical preoperational authorizations connected to Supabase
  const [inspeccionesAdmin, setInspeccionesAdmin] = useState<any[]>([]);
  const [cargandoVias, setCargandoVias] = useState<boolean>(false);
  const [selectedPendingPreop, setSelectedPendingPreop] = useState<any | null>(null);

  // States for Contingency module (vista_regulado_pendientes)
  const [contingenciaPendientes, setContingenciaPendientes] = useState<any[]>([]);
  const [isContingenciaLoading, setIsContingenciaLoading] = useState(false);
  const [contingenciaSearch, setContingenciaSearch] = useState('');
  const [selectedContingenciaPreop, setSelectedContingenciaPreop] = useState<any | null>(null);
  const [contingenciaPage, setContingenciaPage] = useState(1);
  const [selectedPdfItem, setSelectedPdfItem] = useState<any | null>(null);

  const cargarContingenciaPendientes = async () => {
    setIsContingenciaLoading(true);
    setContingenciaPage(1);
    try {
      let dataFinal: any[] = [];
      const { data, error } = await supabase
        .from('inspecciones_preoperacionales')
        .select(`
          *,
          operadores:operadores!inspecciones_preoperacionales_operador_id_fkey (nombres_apellidos, identificacion),
          vehiculos (placa, tc),
          rutas (nume_ruta)
        `)
        .order('fecha', { ascending: false });

      if (!error && data) {
        dataFinal = data;
      } else {
        const { data: altData, error: altError } = await supabase
          .from('inspecciones_preoperacionales')
          .select(`
            *,
            operadores:operadores!fk_inspecciones_operador (nombres_apellidos, identificacion),
            vehiculos (placa, tc),
            rutas:rutas!ruta_asignada (nume_ruta)
          `)
          .order('fecha', { ascending: false });

        if (!altError && altData) {
          dataFinal = altData;
        } else {
          const [inspRes, operRes, vehRes, rutRes] = await Promise.all([
            supabase
              .from('inspecciones_preoperacionales')
              .select('*')
              .order('fecha', { ascending: false }),
            supabase.from('operadores').select('*'),
            supabase.from('vehiculos').select('*'),
            supabase.from('rutas').select('*')
          ]);

          const rawInsp = inspRes.data || [];
          const dbOperadores = operRes.data || [];
          const dbVehiculos = vehRes.data || [];
          const dbRutas = rutRes.data || [];

          dataFinal = rawInsp.map((item: any) => {
            const op = dbOperadores.find((o: any) => (o.id && o.id === item.operador_id) || (o.identificacion && o.identificacion === item.operador_id));
            const veh = dbVehiculos.find((v: any) => (v.id && v.id === item.vehiculo_id) || (v.placa && item.placa && v.placa.toLowerCase() === item.placa.toLowerCase()));
            const rut = dbRutas.find((r: any) => 
              (r.id && (r.id === item.id_ruta || r.id === item.ruta_id || r.id === item.ruta_asignada)) ||
              (r.id_ruta && (r.id_ruta === item.id_ruta || r.id_ruta === item.ruta_id || r.id_ruta === item.ruta_asignada)) ||
              (r.nume_ruta && (r.nume_ruta === item.ruta_asignada || r.nume_ruta === item.nume_ruta))
            );

            const rutaVisual = rut?.nume_ruta || (item.ruta_asignada && !String(item.ruta_asignada).includes('-') && String(item.ruta_asignada).length <= 10 ? item.ruta_asignada : null);

            return {
              ...item,
              operadores: op ? { nombres_apellidos: op.nombres_apellidos, identificacion: op.identificacion } : null,
              vehiculos: veh ? { placa: veh.placa, tc: veh.tc } : null,
              rutas: rutaVisual ? { nume_ruta: rutaVisual } : (item.rutas?.nume_ruta ? { nume_ruta: item.rutas.nume_ruta } : null)
            };
          });
        }
      }

      setContingenciaPendientes(dataFinal);
    } catch (err: any) {
      console.error("Error cargando inspecciones_preoperacionales:", err);
    } finally {
      setIsContingenciaLoading(false);
    }
  };

  const handleAutorizarContingenciaAdmin = async (idInspeccion: string) => {
    try {
      const adminId = adminSession?.user?.id || 'ADMIN-USER-01';
      const adminCedula = 'ADMIN-CC';
      const adminNombre = adminSession?.user?.nombre_completo || 'ADMINISTRADOR';
      const fechaAutorizacionStr = new Date().toISOString();

      const { error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({
          estado_autorizacion: 'Autorizado',
          autorizado_por: adminCedula,
          regulador_id: adminId,
          regulador_cedula: adminCedula,
          regulador_nombre: adminNombre,
          fecha_autorizacion: fechaAutorizacionStr,
          observaciones_jefe: 'Autorización Administrativa - Contingencia de Operaciones'
        })
        .eq('id_inspeccion', idInspeccion);

      if (error) throw error;

      // Actualizar listados locales para retroalimentación inmediata
      setContingenciaPendientes((prev) => prev.filter((item) => item.id_inspeccion !== idInspeccion));
      setSelectedContingenciaPreop(null);
      alert('¡Salida vial autorizada por Contingencia con éxito desde el Panel Administrativo!');
      
      // Volver a cargar datos generales
      cargarPreoperacionalesAdmin();
    } catch (err: any) {
      console.error("Error al autorizar salida en Contingencia:", err);
      alert(`Error al autorizar salida: ${err.message || err}`);
    }
  };

  const filteredContingencia = contingenciaPendientes.filter((item) => {
    const placa = (item.vehiculo_placa || '').toLowerCase();
    const tc = (item.vehiculo_tc || '').toLowerCase();
    const conductor = (item.conductor_nombre || '').toLowerCase();
    const search = contingenciaSearch.toLowerCase();
    return placa.includes(search) || tc.includes(search) || conductor.includes(search);
  });

  const cargarPreoperacionalesAdmin = async () => {
    try {
      setCargandoVias(true);

      // A. Petición plana de inspecciones con estado 'Pendiente' ordenadas por fecha
      const { data: inspecciones, error: errIns } = await supabase
        .from('inspecciones_preoperacionales')
        .select('*')
        .eq('estado_autorizacion', 'Pendiente')
        .order('fecha', { ascending: false });

      if (errIns) throw errIns;
      if (!inspecciones || inspecciones.length === 0) {
        setInspeccionesAdmin([]);
        return;
      }

      // B. Petición plana de la tabla operadores
      const { data: operadores, error: errOp } = await supabase
        .from('operadores')
        .select('*');
      if (errOp) throw errOp;

      // C. Petición plana de la tabla vehiculos
      const { data: vehiculos, error: errVeh } = await supabase
        .from('vehiculos')
        .select('*');
      if (errVeh) throw errVeh;

      // D. Vinculación manual de los registros en memoria para evitar problemas de relación
      const listaConectada = inspecciones.map((ins) => {
        const opAsociado = operadores?.find(o => 
          (o.id && o.id === ins.operador_id) ||
          (o.identificacion && o.identificacion === ins.operador_id)
        );

        const vehAsociado = vehiculos?.find(v => 
          (v.id && v.id === ins.vehiculo_id) || 
          (v.placa && ins.placa && v.placa.toLowerCase() === ins.placa.toLowerCase())
        );

        const mappedOperador = opAsociado ? {
          identificacion: opAsociado.identificacion,
          nombres_apellidos: opAsociado.nombres_apellidos,
          estado_licencia: opAsociado.estado_licencia,
          licencia_vencimiento: opAsociado.licencia_vencimiento,
          licencia_vigente: opAsociado.licencia_vigente
        } : null;

        const mappedVehiculo = vehAsociado ? {
          placa: vehAsociado.placa,
          tc: vehAsociado.tc,
          numero_interno: vehAsociado.numero_interno,
          tipo_vehiculo: vehAsociado.tipo_vehiculo,
          estado_soat: vehAsociado.estado_soat,
          estado_rtm: vehAsociado.estado_rtm,
          vencimiento_soat: vehAsociado.vencimiento_soat,
          rtm_vencimiento: vehAsociado.rtm_vencimiento,
          soat_vigente: vehAsociado.soat_vigente,
          tecnico_vigente: vehAsociado.tecnico_vigente
        } : null;

        return {
          ...ins,
          fecha: ins.fecha_registro || ins.fecha || new Date().toISOString(),
          operadores: mappedOperador,
          operador: mappedOperador,
          vehiculos: mappedVehiculo,
          vehiculo: mappedVehiculo
        };
      });

      setInspeccionesAdmin(listaConectada);
    } catch (error) {
      console.error("Error al conectar preoperacionales del Admin:", error);
    } finally {
      setCargandoVias(false);
    }
  };

  const handleAutorizarPreoperacionalAdmin = async (idInspeccion: string) => {
    try {
      const reguladorId = adminSession?.user?.id || 'ADMIN-USER-01';
      const reguladorCedula = 'ADMIN-CC';
      const reguladorNombre = adminSession?.user?.nombre_completo || 'ADMINISTRADOR';
      const fechaAutorizacionStr = new Date().toISOString();

      const { error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({
          estado_autorizacion: 'Autorizado',
          autorizado_por: reguladorCedula,
          regulador_id: reguladorId,
          regulador_cedula: reguladorCedula,
          regulador_nombre: reguladorNombre,
          fecha_autorizacion: fechaAutorizacionStr
        })
        .eq('id_inspeccion', idInspeccion);

      if (error) throw error;

      // Actualizar listados locales para retroalimentación inmediata
      setInspeccionesAdmin((prev) => prev.filter((item) => item.id_inspeccion !== idInspeccion));
      setSelectedPendingPreop(null);
      alert('¡Salida vial autorizada con éxito en Supabase desde el Panel de Administración!');
    } catch (err: any) {
      console.error("Error al autorizar salida en Admin:", err);
      alert(`Error al autorizar salida: ${err.message || err}`);
    }
  };

  // Ejecutar la carga automáticamente al cambiar de pestaña
  useEffect(() => {
    if (pestañaActiva === 'autorizaciones') {
      cargarPreoperacionalesAdmin();
    }
    if (pestañaActiva === 'contingencia') {
      cargarContingenciaPendientes();
    }
  }, [pestañaActiva]);

  // Reset pagination on search or tab change
  useEffect(() => {
    setPaginaActualUser(1);
  }, [busquedaUser, subVista]);

  // Fetch metrics and usuarios table structure on mount
  useEffect(() => {
    const fetchMetricsAndUsers = async () => {
      try {
        const [opRes, userRes] = await Promise.all([
          supabase.from('operadores').select('identificacion', { count: 'exact', head: true }),
          supabase.from('usuarios').select('identificacion', { count: 'exact', head: true })
        ]);
        
        setMetrics(prev => ({
          ...prev,
          totalOperadores: opRes.count || 0,
          totalUsuarios: userRes.count || 0
        }));
      } catch (err) {
        console.warn('Error fetching counts for dashboard:', err);
      }
    };

    fetchMetricsAndUsers();
  }, []);

  // Fetch users depending on subVista and active tab
  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    setErrorUsuarios(null);
    try {
      const { data, error: err } = await supabase
        .from('usuarios')
        .select('id, nombres_apellidos, identificacion, cargo, rol, activo')
        .order('nombres_apellidos', { ascending: true });

      if (err) {
        setErrorUsuarios(err.message);
      } else {
        setUsuarios(data || []);
      }
    } catch (err: any) {
      setErrorUsuarios(err.message || 'Error al conectar con la tabla usuarios');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  // Toggle user state in Supabase
  const handleToggleEstado = async (userId: any, estadoActual: boolean) => {
    try {
      const { error: updateErr } = await supabase
        .from('usuarios')
        .update({ activo: !estadoActual })
        .eq('id', userId);

      if (updateErr) {
        setErrorUsuarios(updateErr.message);
      } else {
        await fetchUsuarios();
      }
    } catch (err: any) {
      setErrorUsuarios(err.message || 'Error al intentar actualizar el estado del usuario');
    }
  };

  useEffect(() => {
    if (pestañaActiva === 'gestion_usuarios' && (subVista === 'jefes' || subVista === 'administrativos')) {
      fetchUsuarios();
    }
  }, [pestañaActiva, subVista]);

  // Handle Manual Registration Form Submission
  const handleRegistrarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoUsuario(true);
    setErrorRegistro(null);
    setExitoRegistro(false);

    if (!nuevoNombre.trim() || !nuevaCedula.trim() || !nuevoCargo.trim()) {
      setErrorRegistro('Todos los campos son estrictamente obligatorios.');
      setGuardandoUsuario(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([
          {
            nombres_apellidos: nuevoNombre.trim(),
            identificacion: nuevaCedula.trim(),
            cargo: nuevoCargo.trim(),
            rol: nuevoRol,
            password_hash: nuevaCedula.trim(),
            activo: true
          }
        ]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setExitoRegistro(true);
      setNuevoNombre('');
      setNuevaCedula('');
      setNuevoCargo('');
      setNuevoRol('Operador');
      setMostrarFormulario(false);
      
      // Refrescar al instante
      await fetchUsuarios();
    } catch (err: any) {
      setErrorRegistro(err.message || 'Error inesperado al intentar registrar el usuario en Supabase.');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  // Filtering logic depending on role:
  // 'jefes' -> role matches 'jefe' or 'regulador' or 'coordinador' (case insensitive)
  // 'administrativos' -> role matches 'admin' or 'administrador'
  const filterByRole = (user: any) => {
    const role = (user.rol || '').toLowerCase().trim();
    if (subVista === 'jefes') {
      return role.includes('jefe') || role.includes('regulador') || role.includes('coordinador');
    }
    if (subVista === 'administrativos') {
      return role.includes('admin') || role.includes('administrador') || role.isLight;
    }
    return true;
  };

  const usersFiltrados = usuarios
    .filter(filterByRole)
    .filter((user) => {
      const q = busquedaUser.toLowerCase().trim();
      if (!q) return true;
      const nombre = (user.nombres_apellidos || '').toLowerCase();
      const id = (user.identificacion || '').toLowerCase();
      return nombre.includes(q) || id.includes(q);
    });

  // Pagination bounds
  const ultimoIndiceUser = paginaActualUser * FILAS_POR_PAGINA_USER;
  const primerIndiceUser = ultimoIndiceUser - FILAS_POR_PAGINA_USER;
  const usersPagina = usersFiltrados.slice(primerIndiceUser, ultimoIndiceUser);
  const totalPaginasUser = Math.ceil(usersFiltrados.length / FILAS_POR_PAGINA_USER);

  return (
    <div className={`flex w-full min-h-screen ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'
    }`}>
      {/* Sidebar - Fixes left on desktop, adapts to flow with collapsible transition */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-72 md:w-80'} shrink-0 border-r flex flex-col justify-between transition-all duration-300 ease-in-out select-none ${
        isLight 
          ? 'bg-white border-slate-200 text-slate-900' 
          : 'bg-black border-zinc-900 text-white'
      }`}>
        {/* Top Branding Section with Collapse Toggle */}
        <div className={`p-4 border-b border-slate-200 dark:border-zinc-900 transition-all duration-300 flex items-center ${
          isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-3'
        }`}>
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
            <div 
              className={`p-2.5 rounded-xl shrink-0 ${isLight ? 'bg-blue-600' : 'bg-emerald-500'}`}
              title="Portal Cartagena - ERP Administrativo"
            >
              <Bus className={`w-5 h-5 ${isLight ? 'text-white' : 'text-black'}`} />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                <h1 className="text-sm font-black tracking-widest uppercase font-sans leading-tight truncate">
                  Portal Cartagena
                </h1>
                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
                  isLight ? 'text-blue-600' : 'text-emerald-400'
                }`}>
                  ERP Administrativo
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isLight 
                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900' 
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Menus */}
        <nav className={`flex-1 p-3 space-y-5 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {/* Main Group */}
          <div className="space-y-1.5">
            {!isCollapsed ? (
              <span className={`px-3 text-[10px] font-black uppercase tracking-widest block font-mono ${
                isLight ? 'text-slate-400' : 'text-zinc-600'
              }`}>
                Menú Principal
              </span>
            ) : (
              <div className="w-6 h-px bg-slate-200 dark:bg-zinc-800 mx-auto my-1" />
            )}
            
            <button
              type="button"
              onClick={() => setPestañaActiva('inicio')}
              title="Inicio ERP"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'inicio'
                  ? isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-105'
                    : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Inicio ERP</span>}
            </button>
          </div>

          {/* Group: Gestión de Usuarios */}
          <div className="space-y-1.5">
            {!isCollapsed ? (
              <span className={`px-3 text-[10px] font-black uppercase tracking-widest block font-mono ${
                isLight ? 'text-slate-405' : 'text-zinc-600'
              }`}>
                Administración
              </span>
            ) : (
              <div className="w-6 h-px bg-slate-200 dark:bg-zinc-800 mx-auto my-1" />
            )}
            
            <button
              type="button"
              onClick={() => {
                setPestañaActiva('gestion_usuarios');
              }}
              title="Gestión de Usuarios"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'gestion_usuarios'
                  ? isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-105'
                    : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Gestión de Usuarios</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setPestañaActiva('autorizaciones');
              }}
              title="Autorizaciones Viales"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'autorizaciones'
                  ? isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-105'
                    : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Autorizaciones Viales</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setPestañaActiva('contingencia');
              }}
              title="Autorizaciones de Contingencia"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'contingencia'
                  ? isLight
                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-zinc-900 text-purple-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
              {!isCollapsed && <span className="truncate">Autorizaciones Contingencia</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setPestañaActiva('gestion_indicadores');
              }}
              title="Gestión de Indicadores"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'gestion_indicadores'
                  ? isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-105 shadow-sm'
                    : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0 text-indigo-605 dark:text-indigo-400" />
              {!isCollapsed && <span className="truncate">Gestión de Indicadores</span>}
            </button>

            <button
              type="button"
              onClick={() => {
                setPestañaActiva('metricas');
              }}
              title="Métricas de Despacho"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all cursor-pointer ${
                pestañaActiva === 'metricas'
                  ? isLight
                    ? 'bg-blue-50 text-blue-600 border border-blue-105 shadow-sm'
                    : 'bg-zinc-900 text-emerald-400 border border-zinc-800'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              {!isCollapsed && <span className="truncate">Métricas de Despacho</span>}
            </button>

          </div>
        </nav>

        {/* Footer Area with user and logout button */}
        <div className={`p-3 border-t border-slate-200 dark:border-zinc-900 transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center gap-2' : 'space-y-3'}`}>
          {!isCollapsed ? (
            <div className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-900'
            }`}>
              <span className="text-[10px] font-extrabold uppercase font-mono text-slate-400 dark:text-zinc-600 block">SESIÓN CONECTADA</span>
              <span className="text-xs font-black truncate block text-slate-900 dark:text-white">
                {adminSession?.user?.nombre_completo || 'Administrador Central'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 truncate block">
                {adminSession?.user?.email || 'admin@ccsi.cartagena.gov'}
              </span>
            </div>
          ) : (
            <div 
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-help transition-all ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-950 border-zinc-900 text-zinc-300'
              }`}
              title={`${adminSession?.user?.nombre_completo || 'Administrador Central'} (${adminSession?.user?.email || 'admin@ccsi.cartagena.gov'})`}
            >
              <User className="w-5 h-5 text-emerald-500" />
            </div>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar Sesión Central"
              className={`w-full rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-955/20 dark:hover:bg-rose-955/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
                isCollapsed ? 'p-2.5' : 'py-2.5 gap-2'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Cerrar Sesión Central</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full overflow-hidden transition-all duration-300 ease-in-out">
        {pestañaActiva === 'inicio' && (
          <div className="space-y-8 animate-fade-in" id="dashboard-inicio-panel">
            {/* Upper banner info */}
            <div className="space-y-1 border-b border-slate-200 dark:border-zinc-900 pb-5">
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Dashboard de Métricas Generales
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
                Panel centralizado de telemetría y base de datos con indicadores operativos en tiempo real.
              </p>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Card 1: Operadores */}
              <div className={`p-6 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-zinc-950 border-zinc-900'
              }`}>
                <span className="text-[10px] font-black uppercase font-mono tracking-widest text-slate-500 dark:text-zinc-600 block mb-2">Total Operadores</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{metrics.totalOperadores}</span>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-emerald-500 uppercase font-mono">Real DB</span>
                </div>
              </div>

              {/* Card 2: Usuarios */}
              <div className={`p-6 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-zinc-950 border-zinc-900'
              }`}>
                <span className="text-[10px] font-black uppercase font-mono tracking-widest text-slate-500 dark:text-zinc-600 block mb-2">Total Usuarios</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{metrics.totalUsuarios}</span>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-emerald-500 uppercase font-mono">Tabla</span>
                </div>
              </div>

              {/* Card 3: Rutas */}
              <div className={`p-6 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/90' : 'bg-zinc-950 border-zinc-900'
              }`}>
                <span className="text-[10px] font-black uppercase font-mono tracking-widest text-slate-500 dark:text-zinc-600 block mb-2">Rutas Activas</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{metrics.rutasActivas}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">Sectores</span>
                </div>
              </div>

              {/* Card 4: Buses */}
              <div className={`p-6 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200/95' : 'bg-zinc-950 border-zinc-900'
              }`}>
                <span className="text-[10px] font-black uppercase font-mono tracking-widest text-slate-500 dark:text-zinc-600 block mb-2">Buses Operativos</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{metrics.busesOperativos}</span>
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">Patio</span>
                </div>
              </div>
            </div>

            {/* Quick action section / ERP information status */}
            <div className={`p-6 rounded-2xl border ${
              isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-zinc-900/35 border-zinc-900'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-xl ${isLight ? 'bg-blue-105' : 'bg-emerald-950/20'}`}>
                  <ShieldCheck className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Autenticación & Seguridad</h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                    Todas las conexiones con la base de datos de Supabase pasan por reglas de políticas de RLS e inicialización asíncrona dedicada. Al mantener activo su rol de administrador, puede consultar de manera fluida y de alta legibilidad los paneles del personal en patio de autobuses de Cartagena de Indias.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {pestañaActiva === 'gestion_usuarios' && (
          <div className="space-y-6 animate-fade-in" id="panel-gestion-usuarios">
            {/* View Header */}
            <div className="space-y-1 border-b border-slate-200 dark:border-zinc-900 pb-5">
              <div className="flex items-center gap-2">
                <Users className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-500'}`} />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Gestión Unificada de Usuarios
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
                Consulte y administre el personal operativo, reguladores de patio y directivos centrales de Cartagena.
              </p>
            </div>

            {/* Horizontal Tabs Selection */}
            <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-1">
              <button
                onClick={() => setSubVista('operadores')}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  subVista === 'operadores'
                    ? isLight
                      ? 'border-blue-600 text-blue-600 font-extrabold'
                      : 'border-emerald-500 text-emerald-400 font-extrabold'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Operadores
              </button>
              <button
                onClick={() => setSubVista('jefes')}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  subVista === 'jefes'
                    ? isLight
                      ? 'border-blue-600 text-blue-600 font-extrabold'
                      : 'border-emerald-500 text-emerald-400 font-extrabold'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Jefes y Reguladores
              </button>
              <button
                onClick={() => setSubVista('administrativos')}
                className={`px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                  subVista === 'administrativos'
                    ? isLight
                      ? 'border-blue-600 text-blue-600 font-extrabold'
                      : 'border-emerald-500 text-emerald-400 font-extrabold'
                    : 'border-transparent text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Administrativos
              </button>
            </div>

            {/* Sub-view Content Router */}
            {subVista === 'operadores' ? (
              <PanelOperadores />
            ) : (
              <div className="space-y-6">
                {errorUsuarios && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-xs font-bold font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-500 shrink-0" />
                    <span>Error al buscar tabla usuarios: {errorUsuarios} (Pruebe creando o sembrando registros en la tabla "usuarios")</span>
                  </div>
                )}

                {/* Direct Manual Registration Form Component */}
                {mostrarFormulario && (
                  <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-2xl ${
                    isLight 
                      ? 'bg-slate-100 border-slate-300 text-slate-900' 
                      : 'bg-zinc-950 border-zinc-800 text-white'
                  }`}>
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3 mb-5">
                      <h4 className="text-xs font-black uppercase tracking-wider font-mono">
                        📝 Registro Directo en la Base de Datos
                      </h4>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 font-mono">
                        Cartagena de Indias Central
                      </span>
                    </div>

                    <form onSubmit={handleRegistrarUsuario} className="space-y-4">
                      {errorRegistro && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-455 rounded-lg text-xs font-mono font-bold">
                          Error: {errorRegistro}
                        </div>
                      )}
                      
                      {exitoRegistro && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 rounded-lg text-xs font-bold">
                          ¡Usuario registrado exitosamente con contraseña por defecto (su cédula)!
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-500 dark:text-zinc-400">
                            Nombres y Apellidos
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Carlos Gómez"
                            value={nuevoNombre}
                            onChange={(e) => setNuevoNombre(e.target.value)}
                            className={`w-full text-xs rounded-xl px-4 py-2.5 font-semibold transition-all border outline-none ${
                              isLight 
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                                : 'bg-black border-zinc-800 text-white focus:border-emerald-500'
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-500 dark:text-zinc-400">
                            Número de Cédula
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: 1047209355"
                            value={nuevaCedula}
                            onChange={(e) => setNuevaCedula(e.target.value)}
                            className={`w-full text-xs rounded-xl px-4 py-2.5 font-bold font-mono transition-all border outline-none ${
                              isLight 
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                                : 'bg-black border-zinc-800 text-white focus:border-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-500 dark:text-zinc-400">
                            Cargo (Puesto de Trabajo)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Regulador de Despacho"
                            value={nuevoCargo}
                            onChange={(e) => setNuevoCargo(e.target.value)}
                            className={`w-full text-xs rounded-xl px-4 py-2.5 font-semibold transition-all border outline-none ${
                              isLight 
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                                : 'bg-black border-zinc-800 text-white focus:border-emerald-500'
                            }`}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-500 dark:text-zinc-400">
                            Nivel de Acceso (Rol)
                          </label>
                          <select
                            value={nuevoRol}
                            onChange={(e) => setNuevoRol(e.target.value)}
                            className={`w-full text-xs rounded-xl px-4 py-2.5 font-bold uppercase tracking-wider transition-all border outline-none cursor-pointer ${
                              isLight 
                                ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500' 
                                : 'bg-black border-zinc-800 text-white focus:border-emerald-500'
                            }`}
                          >
                            <option value="Operador">Operador (Conductor)</option>
                            <option value="Regulador">Regulador de Patio</option>
                            <option value="Jefe de Patio">Jefe de Patio</option>
                            <option value="Admin">Administrador</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
                        <button
                          type="submit"
                          disabled={guardandoUsuario}
                          className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer ${
                            guardandoUsuario 
                              ? 'opacity-60 cursor-not-allowed'
                              : isLight
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md'
                          }`}
                        >
                          {guardandoUsuario ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Registrando...</span>
                            </>
                          ) : (
                            <span>💾 Guardar Registro en Base de Datos</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tools Area */}
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-black border-zinc-900'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 flex-1">
                    <div className="relative w-full md:w-80">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-emerald-450" />
                      <input
                        type="text"
                        placeholder="Buscar por cédula o nombre..."
                        value={busquedaUser}
                        onChange={(e) => setBusquedaUser(e.target.value)}
                        className="w-full text-xs rounded-xl pl-10 pr-4 py-2.5 font-semibold transition-all border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-blue-500/10 dark:focus:ring-emerald-500/10"
                      />
                    </div>

                    {/* Dynamic Add / Cancel registration button with High Contrast Extreme Styles */}
                    <button
                      onClick={() => {
                        setMostrarFormulario(!mostrarFormulario);
                        setErrorRegistro(null);
                        setExitoRegistro(false);
                      }}
                      className={`px-4 py-2.5 rounded-xl border font-black text-xs uppercase tracking-wider cursor-pointer transition-all ${
                        mostrarFormulario
                          ? isLight
                            ? 'bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-700'
                            : 'bg-rose-955/40 hover:bg-rose-955/80 border-rose-900 text-rose-400'
                          : isLight
                            ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-400 shadow-md'
                      }`}
                    >
                      {mostrarFormulario ? "❌ Cancelar" : "➕ Registrar Usuario"}
                    </button>
                  </div>

                  <button
                    onClick={fetchUsuarios}
                    disabled={loadingUsuarios}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800' 
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span>Sincronizar Tabla</span>
                  </button>
                </div>

                {/* Layout Grid / Table Wrapper */}
                <div className={`rounded-xl border transition-all overflow-hidden ${
                  isLight ? 'bg-white border-slate-200/90' : 'bg-black border-zinc-900'
                }`}>
                  {loadingUsuarios ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-emerald-450" />
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-500">
                        Estableciendo conexión asíncrona...
                      </span>
                    </div>
                  ) : usersFiltrados.length === 0 ? (
                    <div className="py-20 text-center text-xs font-bold font-mono text-slate-500 dark:text-zinc-650 uppercase tracking-widest">
                      No se encontraron coincidencias directas en la tabla "usuarios".
                    </div>
                  ) : (
                    <>
                      {/* Grid Table of Users */}
                      <div className="w-full overflow-x-auto block whitespace-nowrap min-w-full">
                        <table className="w-full text-left border-collapse table-auto min-w-full">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-mono tracking-widest bg-slate-100 dark:bg-zinc-950 text-slate-500 dark:text-zinc-500">
                              <th className="px-6 py-4 font-extrabold">Nombre Completo</th>
                              <th className="px-6 py-4 font-extrabold">Identificación / ID</th>
                              <th className="px-6 py-4 font-extrabold">Cargo Registrado (Rol)</th>
                              <th className="px-6 py-4 font-extrabold text-center">Estado</th>
                              <th className="px-6 py-4 font-extrabold text-center">Permiso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-zinc-900">
                            {usersPagina.map((user, index) => {
                              const isEven = index % 2 === 0;
                              const alternanceClass = isEven
                                ? "bg-white dark:bg-zinc-950"
                                : "bg-slate-50 dark:bg-zinc-900/60";

                              return (
                                <tr key={user.identificacion || index} className={`${alternanceClass} text-xs font-semibold`}>
                                  {/* Nombre */}
                                  <td className="px-6 py-4 text-slate-900 dark:text-white font-black tracking-tight font-sans">
                                    {user.nombres_apellidos || 'Usuario de Sistema'}
                                  </td>

                                  {/* Identificación */}
                                  <td className="px-6 py-4 font-bold font-mono text-slate-900 dark:text-white">
                                    {user.identificacion || 'N/D'}
                                  </td>

                                  {/* Cargo/Rol */}
                                  <td className="px-6 py-4 text-slate-900 dark:text-zinc-200 font-mono text-[10px] uppercase tracking-wide">
                                    <span className="px-2 py-1 rounded bg-slate-100 dark:bg-zinc-900 text-[10px] font-bold border border-slate-200 dark:border-zinc-800">
                                      {user.rol || 'Regulador'}
                                    </span>
                                  </td>

                                  {/* Estado */}
                                  <td className="px-6 py-4 text-center">
                                    {user.activo !== false ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-955/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                                        <span>Activo</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-955/40 text-rose-800 dark:text-rose-455 border border-rose-200 dark:border-rose-900/40">
                                        <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                                        <span>Inactivo</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* Permiso (Toggle Switch) */}
                                  <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                                    <div className="flex justify-center items-center">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleEstado(user.id, user.activo !== false)}
                                        className={`
                                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black
                                          ${user.activo !== false ? 'bg-emerald-500' : 'bg-zinc-700'}
                                        `}
                                      >
                                        <span
                                          className={`
                                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                                            transition duration-200 ease-in-out
                                            ${user.activo !== false ? 'translate-x-5' : 'translate-x-0'}
                                          `}
                                        />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination control below the table */}
                      <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
                        <button
                          onClick={() => setPaginaActualUser(prev => Math.max(prev - 1, 1))}
                          disabled={paginaActualUser === 1 || totalPaginasUser === 0}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Anterior</span>
                        </button>

                        <span className="text-xs font-bold font-mono text-slate-500 dark:text-zinc-400">
                          PÁGINA {totalPaginasUser === 0 ? 0 : paginaActualUser} DE {totalPaginasUser}
                        </span>

                        <button
                          onClick={() => setPaginaActualUser(prev => Math.min(prev + 1, totalPaginasUser))}
                          disabled={paginaActualUser === totalPaginasUser || totalPaginasUser === 0}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <span>Siguiente</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {pestañaActiva === 'autorizaciones' && (
          <div className="space-y-6 animate-fade-in bg-white rounded-3xl p-6 border border-slate-200 shadow-xl text-slate-900" id="panel-vial-autorizaciones">
            {/* View Header */}
            <div className="space-y-1 border-b border-slate-150 pb-5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-950">
                    Control de Inspecciones Preoperacionales Pendientes
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={cargarPreoperacionalesAdmin}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cargandoVias ? 'animate-spin' : ''}`} />
                  Sincronizar Datos
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Verifique las condiciones críticas de idoneidad y autorice salidas viales directamente como Administrador.
              </p>
            </div>

            {cargandoVias ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
                <span className="text-xs text-slate-500 font-bold font-mono">Buscando autorizaciones en espera...</span>
              </div>
            ) : inspeccionesAdmin.length === 0 ? (
              <div className="py-24 text-center">
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-emerald-500/80 animate-bounce" />
                <p className="text-sm font-black uppercase text-emerald-600">¡Vía libre y regulada!</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">No hay inspecciones pendientes por autorizar.</p>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[900px] table-auto text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800">Fecha / Hora</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800">Código</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800">Conductor</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800">Cédula</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800">Bus / TC</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800 text-center">Idoneidad</th>
                        <th className="font-extrabold uppercase text-xs tracking-wider py-4 px-5 text-slate-800 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 bg-white">
                      {inspeccionesAdmin.map((inspeccion) => {
                        const crits = [
                          inspeccion.estado_frenos,
                          inspeccion.estado_suspension_direccion,
                          inspeccion.luces_bocina,
                          inspeccion.presion_fugas_aire
                        ];
                        const hasFails = crits.some(c => c === false || c === 'false');
                        const formatTime = inspeccion.fecha 
                          ? new Date(inspeccion.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                          : new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const formatDate = inspeccion.fecha 
                          ? new Date(inspeccion.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                          : new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

                        return (
                          <tr key={inspeccion.id_inspeccion} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-5 font-sans">
                              <span className="font-extrabold text-slate-800">{formatTime}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate}</span>
                            </td>
                            <td className="py-3 px-5 font-mono font-bold text-indigo-600">
                              {inspeccion.codigo_preoperacional || inspeccion.id_inspeccion?.slice(0, 8) || 'N/D'}
                            </td>
                            <td className="py-3 px-5 font-black text-slate-900 font-sans text-sm">
                              {inspeccion.operadores?.nombres_apellidos || 'Operador No Identificado'}
                            </td>
                            <td className="py-3 px-5 font-mono font-bold text-slate-600 text-sm">
                              {inspeccion.operadores?.identificacion || 'Sin ID'}
                            </td>
                            <td className="py-3 px-5 font-sans">
                              <span className="font-bold">{`TC: ${inspeccion.vehiculos?.numero_interno || 'N/D'}`}</span>
                              <span className="block text-xs text-blue-600">{`Placa: ${inspeccion.vehiculos?.placa || 'N/D'}`}</span>
                            </td>
                            <td className="py-3 px-5 text-center font-sans">
                              {hasFails ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-250">
                                  ⚠️ NO APTO (FALLA)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-250">
                                  ✔️ APTO PARA RUTA
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-5 text-right">
                              <button
                                onClick={() => setSelectedPendingPreop(inspeccion)}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all bg-indigo-650 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg cursor-pointer"
                              >
                                REVISAR INSPECCIÓN
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {pestañaActiva === 'contingencia' && (
          /* Vista de Autorizaciones de Contingencia (Estándar Dark Mode CCSI) */
          <div className="space-y-6 bg-gray-800 bg-[#111827] p-6 border border-gray-700 rounded-3xl shadow-none" id="admin-contingencia-view">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-700">
              <div>
                <h3 className="text-base font-extrabold uppercase text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Módulo de Autorizaciones de Contingencia Administrativa
                </h3>
                <p className="text-xs text-gray-400 font-semibold mt-1">
                  Gestión y autorización excepcional de despachos preoperacionales en contingencia.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-yellow-900/40 text-yellow-500 border border-yellow-700/50 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider">
                  {contingenciaPendientes.length} Registros en Espera
                </span>
              </div>
            </div>

            {/* Búsqueda y Filtros Avanzados */}
            <div className="bg-gray-900 p-4 border border-gray-700 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar por Placa, TC o Conductor..."
                  value={contingenciaSearch}
                  onChange={(e) => {
                    setContingenciaSearch(e.target.value);
                    setContingenciaPage(1);
                  }}
                  className="w-full bg-gray-900 border border-gray-700 text-xs rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all font-semibold font-mono"
                />
              </div>
              <button
                type="button"
                onClick={cargarContingenciaPendientes}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isContingenciaLoading ? 'animate-spin' : ''}`} />
                Actualizar Vista
              </button>
            </div>

            {isContingenciaLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="text-xs text-gray-400 font-mono">Cargando datos desde la vista optimizada...</span>
              </div>
            ) : filteredContingencia.length === 0 ? (
              <div className="py-24 text-center text-gray-400 bg-gray-900/60 border border-dashed border-gray-700 rounded-2xl">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-600 pointer-events-none" />
                <p className="text-sm font-black uppercase text-indigo-400">¡Sin Pendientes de Contingencia!</p>
                <p className="text-xs mt-1 text-gray-400">No se encontraron preoperacionales pendientes con los criterios de búsqueda.</p>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto border border-gray-700 rounded-2xl bg-gray-800 bg-[#111827]">
                <table className="w-full text-left border-collapse table-auto text-xs min-w-[900px]">
                  <thead>
                    <tr className="bg-gray-900 border-b border-gray-700 text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                      <th className="px-5 py-4 font-mono">Código</th>
                      <th className="px-5 py-4">Conductor</th>
                      <th className="px-5 py-4 font-mono">Placa</th>
                      <th className="px-5 py-4 font-mono">TC (Vehículo)</th>
                      <th className="px-5 py-4">Ruta Asignada</th>
                      <th className="px-5 py-4 text-center">Idoneidad</th>
                      <th className="px-5 py-4 text-right">Acción de Contingencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/60 bg-gray-800 bg-[#111827] text-xs font-semibold">
                    {(() => {
                      const limit = 5;
                      const startIndex = (contingenciaPage - 1) * limit;
                      const endIndex = startIndex + limit;
                      const paginatedList = filteredContingencia.slice(startIndex, endIndex);
                      return paginatedList.map((item) => {
                        const crits = [
                          item.estado_frenos,
                          item.estado_suspension_direccion,
                          item.luces_bocina,
                          item.presion_fugas_aire
                        ];
                        const hasFails = crits.some(c => c === false || c === 'false');
                        const placaStr = item.vehiculos?.placa || item.vehiculo?.placa || item.vehiculo_placa || item.placa || 'N/D';
                        const tcStr = item.vehiculos?.tc || item.vehiculo?.tc || item.vehiculo_tc || item.tc || 'N/D';
                        const conductorStr = item.operadores?.nombres_apellidos || item.operador?.nombres_apellidos || item.conductor_nombre || 'N/D';

                        const formatCodigo = (raw: any) => {
                          if (!raw) return 'PREO-0001';
                          const str = String(raw).trim();
                          if (str.toUpperCase().startsWith('PREO-')) return str.toUpperCase();
                          if (/^\d+$/.test(str)) return `PREO-${str.padStart(4, '0')}`;
                          const clean = str.replace(/[^a-zA-Z0-9]/g, '');
                          return `PREO-${clean.slice(-6).toUpperCase() || '0001'}`;
                        };
                        const codigoFormateado = formatCodigo(item.codigo_preoperacional || item.id_inspeccion || item.id);

                        return (
                          <tr key={item.id_inspeccion || item.id} className="hover:bg-gray-700/30 transition-colors">
                            <td className="px-5 py-3.5 font-mono text-xs">
                              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded-lg border border-indigo-800/60 inline-block">
                                {codigoFormateado}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-sans font-extrabold text-white text-sm">
                              {conductorStr}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-xs text-emerald-400 font-bold">
                              <span className="bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                                {placaStr}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-sans text-gray-300 font-bold">
                              TC: {tcStr}
                            </td>
                            <td className="px-5 py-3.5 font-sans text-gray-300 font-bold">
                              <span className="bg-gray-900 border border-gray-700 px-2 py-0.5 rounded text-xs font-mono text-gray-200">
                                {item.rutas?.nume_ruta || 'Sin asignar'}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-center font-sans">
                              {hasFails ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-rose-950/60 text-rose-300 border border-rose-800/80">
                                  ⚠️ NO APTO (FALLA)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                                  ✔️ APTO
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPdfItem({
                                    ...item,
                                    codigo: codigoFormateado,
                                    ruta_asignada: item.rutas?.nume_ruta || (Array.isArray(item.rutas) ? item.rutas[0]?.nume_ruta : null) || item.ruta_asignada || 'Sin asignar',
                                    operador_nombre: conductorStr,
                                    identificacion: item.conductor_cedula || item.identificacion || item.cedula || item.operador?.identificacion,
                                    conductor_cedula: item.conductor_cedula || item.identificacion || item.cedula || item.operador?.identificacion,
                                    placa: placaStr,
                                    tc: tcStr,
                                    tipo_vehiculo: item.vehiculos?.tipo_vehiculo || item.vehiculo?.tipo_vehiculo || item.tipo_vehiculo
                                  })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs tracking-wider uppercase rounded-xl border border-gray-600 transition-all cursor-pointer"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
                                  Descargar PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedContingenciaPreop(item)}
                                  className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow transition-all cursor-pointer hover:shadow-purple-500/25"
                                >
                                  Autorizar Contingencia
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación de Alto Contraste */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-700 bg-gray-800 bg-[#111827] rounded-2xl">
                <p className="text-xs text-gray-400 font-bold font-mono">
                  Mostrando registros {Math.min((contingenciaPage - 1) * 5 + 1, filteredContingencia.length)}-{Math.min(contingenciaPage * 5, filteredContingencia.length)} de {filteredContingencia.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={contingenciaPage === 1}
                    onClick={() => setContingenciaPage(prev => Math.max(prev - 1, 1))}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl font-extrabold text-xs transition-all shadow-none cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-black text-gray-200 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 font-mono">
                    Página {contingenciaPage} de {Math.max(1, Math.ceil(filteredContingencia.length / 5))}
                  </span>
                  <button
                    type="button"
                    disabled={contingenciaPage >= Math.ceil(filteredContingencia.length / 5)}
                    onClick={() => setContingenciaPage(prev => Math.min(prev + 1, Math.ceil(filteredContingencia.length / 5)))}
                    className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none rounded-xl font-extrabold text-xs transition-all shadow-none cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {pestañaActiva === 'gestion_indicadores' && (
          <div className="space-y-6 animate-fade-in" id="panel-gestion-indicadores">
            <GestionIndicadores />
          </div>
        )}

        {pestañaActiva === 'metricas' && (
          <div className="space-y-6 animate-fade-in" id="panel-metricas-despacho">
            <DashboardMetricas />
          </div>
        )}

      </main>

      {/* DETALLE Y ACCIÓN DE AUTORIZACIÓN MODAL (VISTA DE PENDIENTES) */}
      {selectedPendingPreop && (() => {
        const vehObj = selectedPendingPreop.vehiculos;
        const operObj = selectedPendingPreop.operadores;

        // 1. SOAT Doc validity check
        let isSoatVigente = true;
        if (vehObj) {
          const rawSoatState = String(vehObj.estado_soat || "").toLowerCase();
          const rawSoatVigente = vehObj.soat_vigente;
          const rawVenc = vehObj.vencimiento_soat;
          
          if (rawSoatState.includes("vencido") || rawSoatState === "vencido" || rawSoatVigente === false || rawSoatVigente === "false") {
            isSoatVigente = false;
          } else if (rawVenc) {
            try {
              if (new Date(rawVenc) < new Date()) {
                isSoatVigente = false;
              }
            } catch (err) {
              console.warn("Error parsing SOAT expiration date:", err);
            }
          }
        }

        // 2. Tecnicomecánica (RTM) validity check
        let isRtmVigente = true;
        if (vehObj) {
          const rawRtmState = String(vehObj.estado_rtm || "").toLowerCase();
          const rawRtmVigente = vehObj.tecnico_vigente;
          const rawVenc = vehObj.rtm_vencimiento;
          
          if (rawRtmState.includes("vencido") || rawRtmState === "vencido" || rawRtmVigente === false || rawRtmVigente === "false") {
            isRtmVigente = false;
          } else if (rawVenc) {
            try {
              if (new Date(rawVenc) < new Date()) {
                isRtmVigente = false;
              }
            } catch (err) {
              console.warn("Error parsing RTM expiration date:", err);
            }
          }
        }

        // 3. Licencia de Conducción status
        let isLicenciaVigente = true;
        if (operObj) {
          const rawLicState = String(operObj.estado_licencia || "").toLowerCase();
          const rawLicVigente = operObj.licencia_vigente;
          const rawVenc = operObj.licencia_vencimiento;

          if (rawLicState.includes("vencido") || rawLicState === "vencido" || rawLicVigente === false || rawLicVigente === "false") {
            isLicenciaVigente = false;
          } else if (rawVenc) {
            try {
              if (new Date(rawVenc) < new Date()) {
                isLicenciaVigente = false;
              }
            } catch (err) {
              console.warn("Error parsing License expiration date:", err);
            }
          }
        }

        const hasExpiredDocuments = !isSoatVigente || !isRtmVigente || !isLicenciaVigente;

        const isSelectedPreopFrenosOk = selectedPendingPreop.estado_frenos === true || selectedPendingPreop.estado_frenos === 'true';
        const isSelectedPreopSuspensionOk = selectedPendingPreop.estado_suspension_direccion === true || selectedPendingPreop.estado_suspension_direccion === 'true';
        const isSelectedPreopLucesOk = selectedPendingPreop.luces_bocina === true || selectedPendingPreop.luces_bocina === 'true';
        const isSelectedPreopAireOk = selectedPendingPreop.presion_fugas_aire === true || selectedPendingPreop.presion_fugas_aire === 'true';
        const selectedPreopHasNovedades = !isSelectedPreopFrenosOk || !isSelectedPreopSuspensionOk || !isSelectedPreopLucesOk || !isSelectedPreopAireOk;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" id="preop-admin-modal-panel">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden bg-white text-slate-900">
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-indigo-600 flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Revisión de Inspección Preoperacional (Admin)</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {selectedPendingPreop.id_inspeccion}</p>
                </div>
                <button 
                  onClick={() => setSelectedPendingPreop(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-all focus:outline-none"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600 animate-pulse" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                
                {/* Conductor & Bus Details */}
                <div className="grid grid-cols-2 gap-4 font-sans">
                  <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-150">
                    <span className="text-[9.5px] uppercase font-mono font-black text-slate-500">Operador (Conductor)</span>
                    <h4 className="text-slate-950 font-black text-sm border-b border-slate-100 pb-1 leading-tight tracking-tight whitespace-normal break-words mt-1">
                      {operObj?.nombres_apellidos || selectedPendingPreop.conductor_nombre || 'N/D'}
                    </h4>
                    <p className="text-[10px] font-mono font-black mt-1.5 text-indigo-600">CC {operObj?.identificacion || selectedPendingPreop.operador_id || 'N/D'}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl border bg-slate-50 border-slate-150">
                    <span className="text-[9.5px] uppercase font-mono font-black text-slate-500">Vehículo Registrado</span>
                    <h4 className="text-xs font-black mt-1 uppercase text-indigo-800">
                      Bus Placa: {vehObj?.placa || selectedPendingPreop.vehiculo_placa || 'N/D'}
                    </h4>
                    <p className="text-[10px] font-mono font-semibold mt-0.5 text-slate-650">
                      Kilometraje: {selectedPendingPreop.kilometraje ? `${Number(selectedPendingPreop.kilometraje).toLocaleString()} Km` : 'N/D'}
                    </p>
                    <p className="text-[10px] font-mono font-bold mt-1 text-blue-600">
                      Ruta: {selectedPendingPreop.ruta_asignada || selectedPendingPreop.ruta || 'Sin Asignar'}
                    </p>
                  </div>
                </div>

                {/* ESTADO LEGAL Y DOCUMENTAL */}
                <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
                  <h4 className="text-[10px] font-mono font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-550 shrink-0" />
                    <span>Estado Legal y Documental</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="font-semibold text-slate-600 font-sans">SOAT (Vehículo):</span>
                      {isSoatVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-100 text-emerald-800 border border-emerald-250">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-100 text-rose-700 border border-rose-250 animate-pulse">VENCIDO ⚠️</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="font-semibold text-slate-600 font-sans">Tecnicomecánica (RTM):</span>
                      {isRtmVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-100 text-emerald-800 border border-emerald-250">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-100 text-rose-700 border border-rose-250 animate-pulse">VENCIDO ⚠️</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600 font-sans">Licencia de Conducción:</span>
                      {isLicenciaVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-100 text-emerald-800 border border-emerald-250">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-100 text-rose-700 border border-rose-250 animate-pulse">VENCIDO ⚠️</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checklist Verification Title */}
                <div>
                  <h4 className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mb-3 block">
                    Resultado Checklist de Seguridad Crítica
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Check item: Frenos */}
                    <div className="p-3 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-150">
                      <span className="text-xs font-bold text-slate-700">Sist. de Frenos</span>
                      {isSelectedPreopFrenosOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-850">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Dirección/Suspensión */}
                    <div className="p-3 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-150">
                      <span className="text-xs font-bold text-slate-700">Dirección/Suspensión</span>
                      {isSelectedPreopSuspensionOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-855">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Luces y Bocina */}
                    <div className="p-3 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-150">
                      <span className="text-xs font-bold text-slate-700">Luces y Bocina</span>
                      {isSelectedPreopLucesOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-855">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Fugas de Aire */}
                    <div className="p-3 rounded-2xl border flex items-center justify-between bg-slate-50 border-slate-150">
                      <span className="text-xs font-bold text-slate-700">Presión / Fugas Aire</span>
                      {isSelectedPreopAireOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-855">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">FALLA ⚠️</span>
                      )}
                    </div>

                  </div>
                </div>

                {/* RED WARNING BANNER WARNING OF NOVEDADES CRITICAS */}
                {selectedPreopHasNovedades && (
                  <div className="p-4 bg-rose-105 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 font-sans">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-700 block mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold uppercase">¡ADVERTENCIA: El vehículo presenta novedades críticas!</p>
                      <p className="text-[10px] leading-relaxed mt-1">
                        Se han encontrado ítems no conformes en la revisión física preoperacional. Se recomienda ordenar revisión por patio mecánica inmediata.
                      </p>
                    </div>
                  </div>
                )}

                {/* RED WARNING BANNER OF EXPIRED DOCUMENTS OR SAFETY FAILS */}
                {hasExpiredDocuments && (
                  <div className="p-4 bg-rose-105 border border-rose-250 rounded-2xl flex items-start gap-3 text-rose-700 font-sans">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-700 block mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase">SALIDA VIAL NO AUTORIZABLE</p>
                      <p className="text-[10px] leading-relaxed mt-1 font-bold">
                        ⚠️ REGLA OPERATIVA DE SEGURIDAD: Uno o más documentos obligatorios de ley (SOAT, Técnico-Mecánica o licencia) se encuentran en estado VENCIDO. El despacho de este móvil por fuera de la regulación vial está de momento inhabilitado preventivamente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Observaciones (Condicional) */}
                {(selectedPendingPreop.observaciones_hallazgos || selectedPendingPreop.observaciones) && (
                  <div className="w-full bg-amber-50 border border-amber-250 rounded-2xl p-4 text-xs text-amber-900 mt-1.5 shadow-sm font-sans">
                    <div className="flex items-center gap-1.5 font-extrabold mb-1.5">
                      <span className="text-sm">💬</span>
                      <span>Observaciones / Hallazgos:</span>
                    </div>
                    <p className="font-semibold leading-relaxed">
                      {selectedPendingPreop.observaciones_hallazgos || selectedPendingPreop.observaciones}
                    </p>
                  </div>
                )}

              </div>

              {/* Modal Footer with "Autorizar Salida Vial" update trigger */}
              <div className="p-6 border-t border-slate-150 bg-slate-50 flex gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPendingPreop(null)}
                  className="flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all focus:outline-none bg-white border-slate-200 text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={hasExpiredDocuments}
                  onClick={() => handleAutorizarPreoperacionalAdmin(selectedPendingPreop.id_inspeccion)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all focus:outline-none ${
                    hasExpiredDocuments 
                      ? 'bg-slate-305 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-650 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                  }`}
                >
                  AUTORIZAR SALIDA VIAL
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* CONFIRMACIÓN DE AUTORIZACIÓN DE CONTINGENCIA ADMINISTRATIVA */}
      {selectedContingenciaPreop && (() => {
        const item = selectedContingenciaPreop;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" id="admin-contingencia-modal">
            <div className={`w-full max-w-md rounded-2xl border ${isLight ? 'border-slate-205 bg-white text-slate-900' : 'border-slate-800 bg-slate-900 text-slate-100'} overflow-hidden shadow-2xl`}>
              <div className={`p-4 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'} flex items-center justify-between`}>
                <div>
                  <h4 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <span>Confirmar Autorización de Contingencia</span>
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {item.id_inspeccion || 'N/D'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContingenciaPreop(null)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-medium">
                <div className={`p-4 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/50 border-slate-800'} rounded-xl border space-y-2`}>
                  <div className={`flex justify-between border-b ${isLight ? 'border-slate-200/50' : 'border-slate-850'} pb-1`}>
                    <span className="text-slate-500">Conductor:</span>
                    <span className={`font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-101'}`}>{item.conductor_nombre || (item.operador?.nombres_apellidos) || 'N/D'}</span>
                  </div>
                  <div className={`flex justify-between border-b ${isLight ? 'border-slate-200/50' : 'border-slate-850'} pb-1`}>
                    <span className="text-slate-500">Identificación:</span>
                    <span className="text-slate-450 font-mono font-bold">{item.conductor_cedula || item.operador_id || 'N/D'}</span>
                  </div>
                  <div className={`flex justify-between border-b ${isLight ? 'border-slate-200/50' : 'border-slate-850'} pb-1`}>
                    <span className="text-slate-500">Placa:</span>
                    <span className="text-emerald-500 font-mono font-bold">{item.vehiculo_placa || (item.vehiculo?.placa) || 'N/D'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TC (Vehículo):</span>
                    <span className="text-slate-500 font-semibold">{item.vehiculo_tc || (item.vehiculo?.tc) || 'N/D'}</span>
                  </div>
                </div>

                <div className={`p-4 ${isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-purple-950/30 border-purple-900/35'} border rounded-xl space-y-2`}>
                  <p className="text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <span>⚠️</span> Nota de Auditoría de Contingencia
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
                    Esta acción eludirá temporalmente las restricciones de patio normales de forma offline/contingente para despachar la unidad. Quedará registrada la firma digital del Administrador <span className="font-bold text-slate-700 dark:text-slate-200">{adminSession?.user?.nombre_completo}</span> con la observación:
                  </p>
                  <blockquote className="border-l-2 border-purple-500 pl-2 py-1 text-purple-700 dark:text-purple-300 italic text-[11px] font-sans bg-purple-100/50 dark:bg-purple-950/30 rounded-r-lg">
                    "Autorización Administrativa - Contingencia de Operaciones"
                  </blockquote>
                </div>
              </div>

              <div className={`p-5 border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'} flex gap-3`}>
                <button
                  type="button"
                  onClick={() => setSelectedContingenciaPreop(null)}
                  className={`flex-1 py-2.5 rounded-xl border ${isLight ? 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100' : 'border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850/40'} text-xs font-bold uppercase tracking-wider transition-all`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAutorizarContingenciaAdmin(item.id_inspeccion)}
                  className="flex-1 py-2.5 bg-purple-650 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-purple-500/20"
                >
                  Confirmar Salida
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedPdfItem && (
        <ModalPreoperacionalPDF
          data={selectedPdfItem}
          isOpen={!!selectedPdfItem}
          onClose={() => setSelectedPdfItem(null)}
        />
      )}
    </div>
  );
}
