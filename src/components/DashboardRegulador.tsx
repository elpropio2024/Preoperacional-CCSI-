import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/apiClients';
import { useTheme } from '../context/ThemeContext';
import { 
  Navigation, 
  LogOut, 
  Moon, 
  Sun,
  Lock,
  PlusCircle,
  Search,
  RefreshCw,
  Clock,
  Bus,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Compass,
  Activity,
  Calendar,
  MapPin,
  TrendingUp,
  AlertOctagon,
  Gauge,
  UserCheck,
  Plus,
  Route,
  ClipboardCheck,
  ShieldAlert
} from 'lucide-react';

interface DashboardReguladorProps {
  onLogout: () => void;
  adminSession: any;
}

// Data structures
interface DispatchLog {
  id: string;
  nume_interno: string;
  vehiculo_id: string;
  vehiculo_placa: string;
  vehiculo_tc: string;
  conductor_id: string;
  conductor_nombre: string;
  ruta_id: string;
  ruta_nombre: string;
  hora_programada: string;
  hora_salida_real: string;
  estado: 'A Tiempo' | 'Retrasado' | 'Adelantado';
  fecha: string;
}

interface PassageControl {
  id: string;
  dispatch_id: string;
  vehiculo_tc: string;
  conductor_nombre: string;
  ruta_nombre: string;
  punto_control: string;
  hora_paso: string;
  desviacion_minutos: number;
  estado: 'A Tiempo' | 'Retrasado' | 'Adelantado';
}

interface VíaNovelty {
  id: string;
  vehiculo_tc: string;
  vehiculo_placa: string;
  conductor_nombre: string;
  tipo_incidente: string;
  gravedad: 'Leve' | 'Moderada' | 'Crítica';
  descripcion: string;
  hora_reporte: string;
  estado_atencion: 'Abierto' | 'Solucionado' | 'Escalado';
}

interface VehiculoRelacion {
  placa: string;
  tc?: string | null;
  tipo_vehiculo: string | null;
}

interface OperadorRelacion {
  identificacion: string;
  nombres_apellidos: string;
}

interface InspeccionPreoperacional {
  id_inspeccion: string;
  fecha: string;
  kilometraje: number;
  estado_autorizacion: string;
  estado_frenos: boolean;
  estado_suspension_direccion: boolean;
  luces_bocina: boolean;
  presion_fugas_aire: boolean;
  observaciones_hallazgos: string | null;
  vehiculo?: VehiculoRelacion;
  operador?: OperadorRelacion;
  vehiculos?: VehiculoRelacion | VehiculoRelacion[];
  operadores?: OperadorRelacion | OperadorRelacion[];
  conductor_nombre?: string;
  conductor_cedula?: string;
  vehiculo_tc?: string;
  vehiculo_placa?: string;
  ruta_codigo?: string;
  ruta_destino?: string;
}

// Fallback collections to avoid empty state
const FALLBACK_VEHICLES = [
  { id: 'v-f1', placa: 'WGN-122', tc: 'TC-2051', tipo_vehiculo: 'Articulado Transcaribe' },
  { id: 'v-f2', placa: 'UYR-098', tc: 'TC-1044', tipo_vehiculo: 'Padrón MIO' },
  { id: 'v-f3', placa: 'SZK-443', tc: 'TC-3012', tipo_vehiculo: 'Buseta Alimentadora' },
  { id: 'v-f4', placa: 'TTG-601', tc: 'TC-1887', tipo_vehiculo: 'Padrón MIO' },
];

const FALLBACK_CONDUCTORES = [
  { id: 'c-f1', nombres_apellidos: 'Roberto Carlos Ortiz', identificacion: '73122455' },
  { id: 'c-f2', nombres_apellidos: 'Eduardo José Gaviria', identificacion: '10471201' },
  { id: 'c-f3', nombres_apellidos: 'Andrés Mauricio Beltrán', identificacion: '10433299' },
  { id: 'c-f4', nombres_apellidos: 'Alonso Rafael Meza', identificacion: '73088912' },
];

const FALLBACK_ROUTES = [
  { id_ruta: 'r-f1', nume_ruta: 'T101', nombre_ruta: 'Portal - Centro • Troncal' },
  { id_ruta: 'r-f2', nume_ruta: 'T103', nombre_ruta: 'Portal - Bocagrande • Directo' },
  { id_ruta: 'r-f3', nume_ruta: 'X102', nombre_ruta: 'Anillo Vial - Crespo • Pretroncal' },
  { id_ruta: 'r-f4', nume_ruta: 'A101', nombre_ruta: 'Alimentadora - Pozón' },
];

const MOCK_PREOPERACIONALES_FALLBACK = [
  {
    id_inspeccion: 'preop-mock-1',
    fecha: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    kilometraje: 124500,
    estado_autorizacion: 'Pendiente',
    estado_frenos: true,
    estado_suspension_direccion: true,
    luces_bocina: true,
    presion_fugas_aire: true,
    vehiculo: { placa: 'WGN-122', tc: 'TC-2051' },
    operador: { nombres_apellidos: 'Eduardo José Gaviria', identificacion: '10471201' }
  },
  {
    id_inspeccion: 'preop-mock-2',
    fecha: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    kilometraje: 98120,
    estado_autorizacion: 'Pendiente',
    estado_frenos: false,
    estado_suspension_direccion: true,
    luces_bocina: false,
    presion_fugas_aire: true,
    vehiculo: { placa: 'UYR-098', tc: 'TC-1044' },
    operador: { nombres_apellidos: 'Roberto Carlos Ortiz', identificacion: '73122455' }
  },
  {
    id_inspeccion: 'preop-mock-3',
    fecha: new Date(Date.now() - 3600000 * 2.2).toISOString(),
    kilometraje: 215400,
    estado_autorizacion: 'Pendiente',
    estado_frenos: true,
    estado_suspension_direccion: false,
    luces_bocina: true,
    presion_fugas_aire: false,
    vehiculo: { placa: 'SZK-443', tc: 'TC-3012' },
    operador: { nombres_apellidos: 'Andrés Mauricio Beltrán', identificacion: '10433299' }
  }
];

export default function DashboardRegulador({ onLogout, adminSession }: DashboardReguladorProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const user = adminSession?.user;
  const isRegulador = user?.rol === 'regulador';

  // State definitions
  const [activeTab, setActiveTab] = useState<'pendientes' | 'aprobados'>('pendientes');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dbVehicles, setDbVehicles] = useState<any[]>([]);
  const [dbOperators, setDbOperators] = useState<any[]>([]);
  const [dbRoutes, setDbRoutes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preoperational States
  const [preoperacionales, setPreoperacionales] = useState<InspeccionPreoperacional[]>(MOCK_PREOPERACIONALES_FALLBACK as unknown as InspeccionPreoperacional[]);
  const [autorizados, setAutorizados] = useState<any[]>([]);
  const [selectedPreop, setSelectedPreop] = useState<InspeccionPreoperacional | null>(null);

  // Derived state
  const filteredPreops = preoperacionales.filter(p => {
    const q = searchTerm.toLowerCase();
    const placa = (p.vehiculo?.placa || p.vehiculo_placa || '').toLowerCase();
    const tc = (p.vehiculo?.tc || p.vehiculo_tc || '').toLowerCase();
    const conductor = (p.operador?.nombres_apellidos || p.conductor_nombre || '').toLowerCase();
    const identificacion = (p.operador?.identificacion || p.operador_id || '').toLowerCase();
    return placa.includes(q) || tc.includes(q) || conductor.includes(q) || identificacion.includes(q);
  });

  const filteredAutorizados = autorizados.filter(p => {
    const q = searchTerm.toLowerCase();
    const placa = (p.vehiculo?.placa || p.vehiculo_placa || '').toLowerCase();
    const tc = (p.vehiculo?.tc || p.vehiculo_tc || '').toLowerCase();
    const conductor = (p.operador?.nombres_apellidos || p.conductor_nombre || '').toLowerCase();
    const identificacion = (p.operador?.identificacion || p.operador_id || '').toLowerCase();
    const regulador = (p.regulador_nombre || '').toLowerCase();
    return placa.includes(q) || tc.includes(q) || conductor.includes(q) || identificacion.includes(q) || regulador.includes(q);
  });

  // Derived helper status variables for selected preoperational item (modal)
  const isSelectedPreopFrenosOk = selectedPreop?.estado_frenos === true || selectedPreop?.estado_frenos === 'true';
  const isSelectedPreopSuspensionOk = selectedPreop?.estado_suspension_direccion === true || selectedPreop?.estado_suspension_direccion === 'true';
  const isSelectedPreopLucesOk = selectedPreop?.luces_bocina === true || selectedPreop?.luces_bocina === 'true';
  const isSelectedPreopAireOk = selectedPreop?.presion_fugas_aire === true || selectedPreop?.presion_fugas_aire === 'true';
  const selectedPreopHasNovedades = !!(selectedPreop && (!isSelectedPreopFrenosOk || !isSelectedPreopSuspensionOk || !isSelectedPreopLucesOk || !isSelectedPreopAireOk));

  // Form states - Despacho
  const [dispatchForm, setDispatchForm] = useState({
    nume_interno: '',
    vehiculo_index: '',
    conductor_index: '',
    ruta_index: '',
    hora_programada: '',
    hora_salida_real: '',
    estado: 'A Tiempo' as 'A Tiempo' | 'Retrasado' | 'Adelantado'
  });

  // Form states - Tiempos
  const [passageForm, setPassageForm] = useState({
    dispatch_index: '',
    punto_control: 'Control Portal',
    desviacion_minutos: 0,
    estado: 'A Tiempo' as 'A Tiempo' | 'Retrasado' | 'Adelantado',
    hora_paso: ''
  });

  // Form states - Novedades
  const [noveltyForm, setNoveltyForm] = useState({
    vehiculo_index: '',
    conductor_index: '',
    tipo_incidente: 'Varada Mecánica / Falla',
    gravedad: 'Moderada' as 'Leve' | 'Moderada' | 'Crítica',
    descripcion: '',
    estado_atencion: 'Abierto' as 'Abierto' | 'Solucionado' | 'Escalado'
  });

  // Persistent States loaded from localStorage
  const [dispatches, setDispatches] = useState<DispatchLog[]>([]);
  const [passages, setPassages] = useState<PassageControl[]>([]);
  const [novelties, setNovelties] = useState<VíaNovelty[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 1. Initial Data Loading from Supabase
  const loadDatabaseData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Load vehicles
      const { data: vData, error: vErr } = await supabase.from('vehiculos').select('*');
      if (vErr) console.warn('No se pudieron recuperar vehículos:', vErr.message);
      else setDbVehicles(vData || []);

      // Load operators
      const { data: oData, error: oErr } = await supabase.from('operadores').select('*');
      if (oErr) console.warn('No se pudieron recuperar operadores:', oErr.message);
      else setDbOperators(oData || []);

      // Load routes
      const { data: rData, error: rErr } = await supabase.from('rutas').select('*');
      if (rErr) console.warn('No se pudieron recuperar rutas:', rErr.message);
      else setDbRoutes(rData || []);

      // Load pending preoperational inspections
      await loadPreoperacionales();
      // Load authorized preoperational inspections
      await loadAutorizados();

      showToast('Datos operativos sincronizados con éxito');
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error de red. Cargando datos de contingencia locales.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreoperacionales = async () => {
    try {
      const { data, error } = await supabase
        .from('vista_regulado_pendientes')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        throw error;
      }

      console.log("¡LISTA CONSOLIDADA DESDE VISTA CON ÉXITO!", data);
      setPreoperacionales(data || []);

    } catch (err: any) {
      console.error("Error crítico al cargar desde vista_regulado_pendientes:", err);
    }
  };

  const loadAutorizados = async () => {
    try {
      // 1. CONSULTAS PLANAS E INDEPENDIENTES EN PARALELO
      const [inspRes, operRes, vehRes] = await Promise.all([
        supabase
          .from('inspecciones_preoperacionales')
          .select('*')
          .eq('estado_autorizacion', 'Autorizado')
          .order('fecha_autorizacion', { ascending: false }),
        supabase
          .from('operadores')
          .select('*'),
        supabase
          .from('vehiculos')
          .select('*')
      ]);

      if (inspRes.error) {
        throw inspRes.error;
      }

      const inspecciones = inspRes.data || [];
      const operadores = operRes.data || [];
      const vehiculos = vehRes.data || [];

      // 2. VINCULACIÓN INTELIGENTE EN MEMORIA (El Cruce)
      const enriched = inspecciones.map((item: any) => {
        // Buscar el operador correspondiente por ID (con tolerancia flexible para id e identificacion)
        const opAsociado = operadores.find((o: any) => 
          (o.id && o.id === item.operador_id) ||
          (o.identificacion && o.identificacion === item.operador_id)
        );

        // Buscar el vehículo correspondiente por ID o vehiculo_id o placa
        const vehAsociado = vehiculos.find((v: any) => 
          (v.id && v.id === item.vehiculo_id) ||
          (v.placa && item.placa && v.placa.toLowerCase() === item.placa.toLowerCase())
        );

        // Failsafes o fallback lists si no se encuentra en la base de datos de operadores o vehículos
        let vehObj = vehAsociado ? {
          placa: vehAsociado.placa,
          tc: vehAsociado.tc,
          numero_interno: vehAsociado.numero_interno
        } : null;

        let operObj = opAsociado ? {
          identificacion: opAsociado.identificacion,
          nombres_apellidos: opAsociado.nombres_apellidos
        } : null;

        // Failsafe 1: Buscar en fallback de vehículos cargados en estado
        if (!vehObj && item.vehiculo_id) {
          const searchId = item.vehiculo_id;
          let found = dbVehicles.find(v => 
            v.id === searchId || 
            v.vehiculo_id === searchId || 
            v.placa === searchId || 
            v.tc === searchId ||
            String(v.numero_interno) === String(searchId)
          );
          if (!found) {
            found = FALLBACK_VEHICLES.find(v => 
              v.placa === searchId || 
              v.tc === searchId
            );
          }
          if (found) {
            vehObj = {
              placa: found.placa,
              tc: found.tc || found.numero_interno,
              numero_interno: found.numero_interno || found.tc
            };
          }
        }

        // Failsafe 2: Buscar en fallback de operadores
        if (!operObj && item.operador_id) {
          const searchId = item.operador_id;
          let found = dbOperators.find(o => 
            o.id === searchId || 
            o.operador_id === searchId || 
            o.identificacion === searchId || 
            o.nombres_apellidos === searchId
          );
          if (!found) {
            found = FALLBACK_CONDUCTORES.find(o => 
              o.identificacion === searchId || 
              o.nombres_apellidos === searchId
            );
          }
          if (found) {
            operObj = {
              identificacion: found.identificacion,
              nombres_apellidos: found.nombres_apellidos
            };
          }
        }

        // Failsafe 3: Preservar cadenas estáticas locales del registro si hay
        if (!vehObj && (item.vehiculo_placa || item.vehiculo_tc)) {
          vehObj = {
            placa: item.vehiculo_placa || 'N/A',
            tc: item.vehiculo_tc || 'N/A',
            numero_interno: item.vehiculo_tc || 'N/A'
          };
        }
        if (!operObj && item.conductor_nombre) {
          operObj = {
            identificacion: item.operador_id || 'N/A',
            nombres_apellidos: item.conductor_nombre
          };
        }

        return {
          ...item,
          vehiculos: vehObj,
          vehiculo: vehObj,
          operadores: operObj,
          operador: operObj
        };
      });

      setAutorizados(enriched);
    } catch (err: any) {
      console.error('Unhandled autorizados loader error:', err);
    }
  };
  const handleAutorizarPreoperacional = async (idInspeccion: string) => {
    try {
      // Obtenemos los datos completos del regulador en sesión activa (o fallbacks correctos basados en Noyla Berrio si no hay sesión iniciada)
      const reguladorId = user?.id || localStorage.getItem('user_id') || 'REG-USER-01';
      const reguladorCedula = user?.identificacion || localStorage.getItem('user_identificacion') || '45515483';
      const reguladorNombre = user?.nombres_apellidos || localStorage.getItem('user_name') || 'BERRIO VALDELAMAR NOYLA';
      const fechaAutorizacionStr = new Date().toISOString();

      const { error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({
          estado_autorizacion: 'Autorizado',
          autorizado_por: reguladorCedula, // Mantenemos este por compatibilidad anterior
          regulador_id: reguladorId,
          regulador_cedula: reguladorCedula,
          regulador_nombre: reguladorNombre,
          fecha_autorizacion: fechaAutorizacionStr // Guarda el timestamp exacto automáticamente
        })
        .eq('id_inspeccion', idInspeccion); // Llave primaria exacta de la tabla

      if (error) throw error;

      // Actualizar la interfaz removiendo el registro despachado e insertando en autorizados
      const authorizedItem = preoperacionales.find((item) => item.id_inspeccion === idInspeccion);
      if (authorizedItem) {
        const updatedItem = {
          ...authorizedItem,
          estado_autorizacion: 'Autorizado',
          autorizado_por: reguladorCedula,
          regulador_id: reguladorId,
          regulador_cedula: reguladorCedula,
          regulador_nombre: reguladorNombre,
          fecha_autorizacion: fechaAutorizacionStr
        };
        setAutorizados((prev) => [updatedItem, ...prev]);
      }

      setPreoperacionales((prev) => prev.filter((item) => item.id_inspeccion !== idInspeccion));
      setSelectedPreop(null);
      alert('¡Salida vial autorizada con éxito en Supabase!');

    } catch (err: any) {
      console.error('Error de escritura en Supabase:', err.message);
      alert('Error al guardar en la base de datos: ' + err.message);
    }
  };

  // Load localStorage on mount
  useEffect(() => {
    loadDatabaseData();

    const storedDisp = localStorage.getItem('ccsi_despachos_v2');
    const storedPass = localStorage.getItem('ccsi_tiempos_v2');
    const storedNov = localStorage.getItem('ccsi_novedades_v2');

    if (storedDisp) setDispatches(JSON.parse(storedDisp));
    else {
      // Prepare initial mock dispatches for gorgeous visual preview on first load
      const initialMockDisp: DispatchLog[] = [
        {
          id: 'disp-mock-1',
          nume_interno: 'BUS-1102',
          vehiculo_id: 'v-f1',
          vehiculo_placa: 'WGN-122',
          vehiculo_tc: 'TC-2051',
          conductor_id: 'c-f1',
          conductor_nombre: 'Roberto Carlos Ortiz',
          ruta_id: 'r-f1',
          ruta_nombre: 'T101 - Portal • Centro',
          hora_programada: '07:30',
          hora_salida_real: '07:34',
          estado: 'Retrasado',
          fecha: new Date().toISOString()
        },
        {
          id: 'disp-mock-2',
          nume_interno: 'BUS-1455',
          vehiculo_id: 'v-f2',
          vehiculo_placa: 'UYR-098',
          vehiculo_tc: 'TC-1044',
          conductor_id: 'c-f2',
          conductor_nombre: 'Eduardo José Gaviria',
          ruta_id: 'r-f2',
          ruta_nombre: 'T103 - Bocagrande',
          hora_programada: '08:00',
          hora_salida_real: '07:59',
          estado: 'A Tiempo',
          fecha: new Date().toISOString()
        }
      ];
      setDispatches(initialMockDisp);
      localStorage.setItem('ccsi_despachos_v2', JSON.stringify(initialMockDisp));
    }

    if (storedPass) setPassages(JSON.parse(storedPass));
    else {
      const initialMockPass: PassageControl[] = [
        {
          id: 'pass-mock-1',
          dispatch_id: 'disp-mock-1',
          vehiculo_tc: 'TC-2051',
          conductor_nombre: 'Roberto Carlos Ortiz',
          ruta_nombre: 'T101',
          punto_control: 'Control Centro',
          hora_paso: '08:12',
          desviacion_minutos: 4,
          estado: 'Retrasado'
        }
      ];
      setPassages(initialMockPass);
      localStorage.setItem('ccsi_tiempos_v2', JSON.stringify(initialMockPass));
    }

    if (storedNov) setNovelties(JSON.parse(storedNov));
    else {
      const initialMockNov: VíaNovelty[] = [
        {
          id: 'nov-mock-1',
          vehiculo_tc: 'TC-3012',
          vehiculo_placa: 'SZK-443',
          conductor_nombre: 'Andrés Mauricio Beltrán',
          tipo_incidente: 'Varada Mecánica / Falla',
          gravedad: 'Crítica',
          descripcion: 'Falla total de frenos en calzada de abordaje Centro Histórico. Vehículo asegurado en vía.',
          hora_reporte: '08:45',
          estado_atencion: 'Abierto'
        }
      ];
      setNovelties(initialMockNov);
      localStorage.setItem('ccsi_novedades_v2', JSON.stringify(initialMockNov));
    }

    // Set initial times
    const now = new Date();
    const formattedTime = now.toTimeString().slice(0, 5);
    setDispatchForm(prev => ({...prev, hora_programada: formattedTime, hora_salida_real: formattedTime}));
    setPassageForm(prev => ({...prev, hora_paso: formattedTime}));
  }, []);

  // Utility arrays to display
  const vehiclesList = dbVehicles.length > 0 ? dbVehicles : FALLBACK_VEHICLES;
  const conductorsList = dbOperators.length > 0 ? dbOperators : FALLBACK_CONDUCTORES;
  const routesList = dbRoutes.length > 0 ? dbRoutes : FALLBACK_ROUTES;

  // Actions
  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const { nume_interno, vehiculo_index, conductor_index, ruta_index, hora_programada, hora_salida_real, estado } = dispatchForm;

    if (!nume_interno || !vehiculo_index || !conductor_index || !ruta_index) {
      alert('Por favor ingrese todos los campos requeridos para despachar el vehículo.');
      return;
    }

    const linkedVeh = vehiclesList[parseInt(vehiculo_index)];
    const linkedCond = conductorsList[parseInt(conductor_index)];
    const linkedRoute = routesList[parseInt(ruta_index)];

    const newDispatch: DispatchLog = {
      id: 'disp-' + Date.now(),
      nume_interno,
      vehiculo_id: linkedVeh.id,
      vehiculo_placa: linkedVeh.placa,
      vehiculo_tc: linkedVeh.tc || 'TC No Asig.',
      conductor_id: linkedCond.id,
      conductor_nombre: linkedCond.nombres_apellidos,
      ruta_id: linkedRoute.id_ruta || 'r-no-id',
      ruta_nombre: (linkedRoute.nume_ruta || '') + ' - ' + (linkedRoute.nombre_ruta || linkedRoute.concatenar || ''),
      hora_programada,
      hora_salida_real,
      estado,
      fecha: new Date().toISOString()
    };

    const updated = [newDispatch, ...dispatches];
    setDispatches(updated);
    localStorage.setItem('ccsi_despachos_v2', JSON.stringify(updated));

    showToast(`Despacho registrado: Bus ${nume_interno} asignado a ruta ${linkedRoute.nume_ruta || ''}`);
    
    // Reset partly
    setDispatchForm(prev => ({
      ...prev,
      nume_interno: '',
      vehiculo_index: '',
      conductor_index: '',
      ruta_index: ''
    }));
  };

  const handleCreatePassage = (e: React.FormEvent) => {
    e.preventDefault();
    const { dispatch_index, punto_control, desviacion_minutos, estado, hora_paso } = passageForm;

    if (!dispatch_index) {
      alert('Debe seleccionar un vehículo despachado de la lista activa.');
      return;
    }

    const linkedDisp = dispatches[parseInt(dispatch_index)];

    const newPass: PassageControl = {
      id: 'pass-' + Date.now(),
      dispatch_id: linkedDisp.id,
      vehiculo_tc: linkedDisp.vehiculo_tc,
      conductor_nombre: linkedDisp.conductor_nombre,
      ruta_nombre: linkedDisp.nume_interno + ' (' + linkedDisp.ruta_nombre.split('-')[0].trim() + ')',
      punto_control,
      hora_paso: hora_paso || new Date().toTimeString().slice(0, 5),
      desviacion_minutos: Number(desviacion_minutos),
      estado
    };

    const updated = [newPass, ...passages];
    setPassages(updated);
    localStorage.setItem('ccsi_tiempos_v2', JSON.stringify(updated));

    showToast(`Monitoreo registrado: ${linkedDisp.vehiculo_tc} pasó por ${punto_control}`);
    
    setPassageForm(prev => ({
      ...prev,
      dispatch_index: '',
      desviacion_minutos: 0,
      estado: 'A Tiempo'
    }));
  };

  const handleCreateNovelty = (e: React.FormEvent) => {
    e.preventDefault();
    const { vehiculo_index, conductor_index, tipo_incidente, gravedad, descripcion, estado_atencion } = noveltyForm;

    if (!vehiculo_index || !conductor_index || !descripcion) {
      alert('Por favor complete todos los datos antes de reportar la novedad vial.');
      return;
    }

    const linkedVeh = vehiclesList[parseInt(vehiculo_index)];
    const linkedCond = conductorsList[parseInt(conductor_index)];

    const newNov: VíaNovelty = {
      id: 'nov-' + Date.now(),
      vehiculo_tc: linkedVeh.tc || 'TC N/D',
      vehiculo_placa: linkedVeh.placa,
      conductor_nombre: linkedCond.nombres_apellidos,
      tipo_incidente,
      gravedad,
      descripcion,
      hora_reporte: new Date().toTimeString().slice(0, 5),
      estado_atencion
    };

    const updated = [newNov, ...novelties];
    setNovelties(updated);
    localStorage.setItem('ccsi_novedades_v2', JSON.stringify(updated));

    showToast(`Alerta de Incidentes reportada: ${tipo_incidente} para ${linkedVeh.tc}`);

    setNoveltyForm(prev => ({
      ...prev,
      vehiculo_index: '',
      conductor_index: '',
      descripcion: ''
    }));
  };

  const handleDeleteDispatch = (id: string) => {
    if (confirm('¿Está seguro de eliminar este registro de despacho?')) {
      const filtered = dispatches.filter(d => d.id !== id);
      setDispatches(filtered);
      localStorage.setItem('ccsi_despachos_v2', JSON.stringify(filtered));
      showToast('Registro de despacho eliminado');
    }
  };

  const handleDeletePassage = (id: string) => {
    if (confirm('¿Está seguro de eliminar este paso de punto de control?')) {
      const filtered = passages.filter(p => p.id !== id);
      setPassages(filtered);
      localStorage.setItem('ccsi_tiempos_v2', JSON.stringify(filtered));
      showToast('Paso de control eliminado');
    }
  };

  const handleUpdateNoveltyStatus = (id: string, newStatus: 'Abierto' | 'Solucionado' | 'Escalado') => {
    const updated = novelties.map(n => {
      if (n.id === id) return { ...n, estado_atencion: newStatus };
      return n;
    });
    setNovelties(updated);
    localStorage.setItem('ccsi_novedades_v2', JSON.stringify(updated));
    showToast(`Estado de novedad actualizado a ${newStatus}`);
  };

  const handleDeleteNovelty = (id: string) => {
    if (confirm('¿Está seguro de eliminar este reporte de novedad?')) {
      const filtered = novelties.filter(n => n.id !== id);
      setNovelties(filtered);
      localStorage.setItem('ccsi_novedades_v2', JSON.stringify(filtered));
      showToast('Novedad eliminada');
    }
  };

  // Filter lists based on Search input
  const filteredDispatches = dispatches.filter(d => {
    const q = searchTerm.toLowerCase();
    return d.nume_interno.toLowerCase().includes(q) || 
           d.vehiculo_placa.toLowerCase().includes(q) || 
           d.vehiculo_tc.toLowerCase().includes(q) ||
           d.conductor_nombre.toLowerCase().includes(q) ||
           d.ruta_nombre.toLowerCase().includes(q);
  });

  const filteredPassages = passages.filter(p => {
    const q = searchTerm.toLowerCase();
    return p.vehiculo_tc.toLowerCase().includes(q) || 
           p.conductor_nombre.toLowerCase().includes(q) ||
           p.punto_control.toLowerCase().includes(q) ||
           p.ruta_nombre.toLowerCase().includes(q);
  });

  const filteredNovelties = novelties.filter(n => {
    const q = searchTerm.toLowerCase();
    return n.vehiculo_tc.toLowerCase().includes(q) || 
           n.conductor_nombre.toLowerCase().includes(q) ||
           n.tipo_incidente.toLowerCase().includes(q) ||
           n.descripcion.toLowerCase().includes(q);
  });

  // Calculate Metrics
  const activeBusesCount = dispatches.length;
  const delayedPassagesCount = passages.filter(p => p.estado === 'Retrasado').length;
  const criticalNoveltiesCount = novelties.filter(n => n.gravedad === 'Crítica' && n.estado_atencion === 'Abierto').length;

  if (!adminSession) {
    return (
      <div className={`w-full min-h-screen flex flex-col items-center justify-center p-6 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'
      }`}>
        <p className="text-xs font-mono font-bold tracking-widest text-slate-405 uppercase">Sin sesión activa</p>
        <button 
          onClick={onLogout}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md"
        >
          Regresar al Login
        </button>
      </div>
    );
  }

  if (!isRegulador) {
    return (
      <div className={`w-full min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-zinc-950 text-white'
      }`}>
        <div className={`w-full max-w-sm p-8 rounded-3xl border text-center ${
          isLight ? 'bg-white border-slate-205' : 'bg-zinc-900 border-zinc-800'
        }`}>
          <Lock className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-sm font-black uppercase tracking-wider text-indigo-500 mb-2">Acceso Exclusivo</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 font-medium">
            Solo el personal con cargo de <b className="font-extrabold text-indigo-500">Regulador</b> tiene acceso autorizado de vía.
          </p>
          <button 
            onClick={onLogout}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all"
          >
            Regresar al Terminal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full min-h-screen transition-colors duration-300 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'
    }`} id="regulador-root-dashboard">
      
      {/* Dynamic Toast Success Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-605 text-white font-semibold rounded-2xl flex items-center gap-3 shadow-2xl border border-indigo-500 animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
          <span className="text-xs uppercase tracking-wider">{successToast}</span>
        </div>
      )}

      {/* Overlay de sombra con Backdrop Blur para pantallas móviles */}
      {sidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in" 
          onClick={() => setSidebarExpanded(false)} 
        />
      )}

      {/* Exclusivo Sidebar de Regulador en Calle */}
      <aside className={`fixed h-screen left-0 top-0 z-50 md:z-20 ${
        sidebarExpanded ? 'w-[280px] md:w-64 translate-x-0' : 'w-20 -translate-x-full md:translate-x-0'
      } shrink-0 border-r flex flex-col justify-between transition-all duration-300 ease-in-out ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900/50 border-zinc-900'
      }`}>
        <div>
          {/* Header branding */}
          <div className="p-6 border-b border-slate-200 dark:border-zinc-900 space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/10 shrink-0">
                <Navigation className="w-5 h-5 rotate-45" />
              </div>
              {sidebarExpanded && (
                <div className="transition-opacity duration-200">
                  <h1 className="text-sm font-extrabold tracking-wider uppercase font-sans">
                    Cartagena SGO
                  </h1>
                  <span className="text-[10px] font-black uppercase tracking-widest block font-mono text-indigo-505 dark:text-indigo-400">
                    Regulador de Campo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* User badge detail */}
          <div className="p-4">
            <div className={`p-4 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-150' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                {sidebarExpanded && <span className="text-[9px] uppercase font-mono font-black text-slate-400">Regulador Activo</span>}
              </div>
              {sidebarExpanded ? (
                <>
                  <h4 className="text-xs font-black truncate block">{user?.nombres_apellidos || 'Personal Despachos'}</h4>
                  <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 font-black">Reg: CC {user?.identificacion || 'N/D'}</p>
                </>
              ) : (
                <div className="text-center">
                  <span className="text-[9px] font-mono font-black text-indigo-600">REG</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation links strictly routing layout modules */}
          <nav className="px-4 space-y-1">
            {sidebarExpanded && (
              <p className="px-3 text-[10px] uppercase font-mono font-black tracking-widest text-slate-400 block mb-2">
                Gestión de Vía
              </p>
            )}

            <button
              onClick={() => setActiveTab('pendientes')}
              className={`w-full flex items-center ${
                sidebarExpanded ? 'justify-between px-3.5' : 'justify-center p-3'
              } py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'pendientes'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-500 dark:text-zinc-300'
              }`}
              title="Autorizar Salidas (Preop)"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {sidebarExpanded && <span>Autorizar Salidas (Preop)</span>}
              </div>
              {sidebarExpanded ? (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'pendientes' ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  {preoperacionales.length}
                </span>
              ) : (
                <span className="absolute ml-6 mt-[-10px] flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('aprobados')}
              className={`w-full flex items-center ${
                sidebarExpanded ? 'justify-between px-3.5' : 'justify-center p-3'
              } py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'aprobados'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-500 dark:text-zinc-300'
              }`}
              title="Historial de aprobados"
            >
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                {sidebarExpanded && <span>Historial de Aprobados</span>}
              </div>
              {sidebarExpanded ? (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'aprobados' ? 'bg-blue-800 text-white' : 'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  {autorizados.length}
                </span>
              ) : (
                <span className="absolute ml-6 mt-[-10px] flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-550 animate-pulse"></span>
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Action Controls Footer */}
        <div className={`p-4 border-t border-slate-200 dark:border-zinc-900 ${sidebarExpanded ? 'space-y-3' : 'space-y-2 text-center'}`}>
          <div className={`flex ${sidebarExpanded ? 'flex-row gap-2' : 'flex-col gap-2 items-center'}`}>
            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex justify-center items-center hover:scale-[1.02] transition-all text-xs font-bold gap-1.5 ${
                sidebarExpanded ? 'flex-1' : 'w-10 h-10'
              } ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-755' : 'bg-zinc-900 border-zinc-805 text-zinc-350'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                  {sidebarExpanded && <span>Oscuro</span>}
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                  {sidebarExpanded && <span>Claro</span>}
                </>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className={`p-2.5 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-500/10 text-rose-600 dark:text-rose-405 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 ${
                sidebarExpanded ? 'flex-1' : 'w-10 h-10'
              }`}
              title="Salir del Panel Vial"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarExpanded && <span className="text-xs font-bold">Salir</span>}
            </button>
          </div>

          {sidebarExpanded && (
            <div className="text-center">
              <span className="text-[9px] font-mono text-slate-400 block tracking-widest uppercase">
                Cartagena SGO • Regulador Secure
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Board Workpanel */}
      <main className={`flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-between transition-all duration-300 ease-in-out ${
        sidebarExpanded ? 'ml-0 md:ml-64' : 'ml-0 md:ml-20'
      }`}>
        
        {/* Header bar area */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-zinc-900 pb-5">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <button 
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 rounded-xl transition-all duration-200 border border-slate-200 dark:border-zinc-850 shadow-sm font-bold text-xs shrink-0 flex items-center gap-1.5 focus:outline-none"
                title={sidebarExpanded ? "Contraer menú" : "Expandir menú"}
              >
                {sidebarExpanded ? '✕ Contraer' : '☰ Menú'}
              </button>
              <div>
                <p className={`text-[10px] font-mono tracking-widest uppercase font-black ${
                  isLight ? 'text-slate-600' : 'text-zinc-400'
                }`}>Módulo Regulador Vial de Despacho</p>
                <h2 className={`font-black tracking-tight text-3xl uppercase m-0 p-0 ${
                  isLight ? 'text-slate-950' : 'text-white'
                }`}>
                  {activeTab === 'pendientes' && 'Aprobaciones de Salida Vial (Pendientes)'}
                  {activeTab === 'aprobados' && 'Historial de Salidas Viales (Aprobados)'}
                </h2>
              </div>
            </div>
          </div>

          {/* Global Search & Sync Action */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar placa, TC, ruta o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border focus:outline-none transition-all w-64 ${
                  isLight 
                    ? 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm' 
                    : 'bg-zinc-900 border-zinc-800 text-white focus:border-indigo-500'
                }`}
              />
            </div>

            <button
              onClick={loadDatabaseData}
              className={`p-2.5 rounded-xl border hover:scale-105 transition-all text-slate-500 ${
                isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
              }`}
              title="Sincronizar base de datos"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>



          {errorMsg && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 text-amber-600 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ACTIVE TAB WORKPANE CONTENT */}

          {/* TAB 0: AUTORIZACIONES DE SALIDA (PREOPERACIONALES) */}
          {activeTab === 'pendientes' && (
            <div className={`border rounded-3xl overflow-hidden ${
              isLight ? 'bg-white border-slate-205' : 'bg-zinc-900/50 border-zinc-900'
            }`}>
              <div className="p-5 border-b border-slate-200 dark:border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Control de Inspecciones Preoperacionales Pendientes</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">Verifique las condiciones críticas de idoneidad y autorice salidas viales</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full font-bold uppercase">
                    {filteredPreops.length} Pendientes
                  </span>
                </div>
              </div>

              {filteredPreops.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-emerald-500/60" />
                  <p className="text-sm font-black uppercase text-emerald-600">¡Vía Despejada!</p>
                  <p className="text-xs font-semibold leading-relaxed mt-1">No se registran inspecciones preoperacionales en estado 'Pendiente'.</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">Todos los buses listos han sido autorizados o se encuentran en ruta.</p>
                </div>
              ) : (
                <div>
                  {/* Vista de Escritorio (Desktop Table) */}
                  <div className={`hidden md:block w-full max-h-[520px] overflow-y-auto overflow-x-auto rounded-xl border shadow-sm scrollbar-thin ${
                    isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950/20'
                  }`}>
                    <table className="w-full min-w-[1000px] table-auto text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-20 shadow-sm">
                        <tr>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Hora de Registro</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Código Preoperacional</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Conductor</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Cédula / ID</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Bus / TC</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 text-center sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Idoneidad</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 text-right sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Acción</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-zinc-900'}`}>
                        {filteredPreops.map((item) => {
                          const crits = [
                            item.estado_frenos,
                            item.estado_suspension_direccion,
                            item.luces_bocina,
                            item.presion_fugas_aire
                          ];
                          const hasFails = crits.some(c => c === false || c === 'false');
                          const formatTime = item.fecha 
                            ? new Date(item.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                            : 'N/D';
                          const formatDate = item.fecha 
                            ? new Date(item.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) 
                            : '';
                          const rowClass = isLight 
                            ? "bg-white border-b border-slate-200 even:bg-slate-50/50 hover:bg-slate-100/70 transition-colors" 
                            : "bg-zinc-900 border-b border-zinc-800 even:bg-zinc-950/40 hover:bg-zinc-800/60 transition-colors";

                          return (
                            <tr key={item.id_inspeccion} className={rowClass}>
                              <td className="py-2.5 px-4">
                                <span className={`font-semibold text-xs sm:text-sm leading-tight block ${isLight ? 'text-slate-700' : 'text-zinc-100'}`}>{formatTime}</span>
                                <span className={`text-[10px] font-medium block mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-350'}`}>{formatDate}</span>
                              </td>
                              <td className={`py-2.5 px-4 font-mono font-bold ${isLight ? 'text-slate-600' : 'text-zinc-200'}`}>
                                {item.codigo_preoperacional || item.id_inspeccion || 'N/D'}
                              </td>
                              <td className={`py-2.5 px-4 font-black tracking-tight text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {item.conductor_nombre || 'Operador No Cargado'}
                              </td>
                              <td className={`py-2.5 px-4 font-medium text-sm font-mono ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                                {item.conductor_cedula || 'N/D'}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                  TC: {item.vehiculo_tc || 'N/D'} <span className={`font-medium text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>({item.vehiculo_placa || 'N/D'})</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                {hasFails ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-500/20 shadow-sm animate-pulse">
                                    <span className="text-[12px]">⚠️</span> NO APTO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shadow-sm">
                                    <span className="text-[12px]">✔️</span> APTO PARA SALIDA
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={() => setSelectedPreop(item)}
                                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
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

                  {/* Vista Móvil (Mobile Cards) */}
                  <div className="block md:hidden space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                    {filteredPreops.map((item) => {
                      const crits = [
                        item.estado_frenos,
                        item.estado_suspension_direccion,
                        item.luces_bocina,
                        item.presion_fugas_aire
                      ];
                      const hasFails = crits.some(c => c === false || c === 'false');
                      const formatTime = item.fecha 
                        ? new Date(item.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                        : 'N/D';
                      const formatDate = item.fecha 
                        ? new Date(item.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) 
                        : '';

                      return (
                        <div 
                          key={item.id_inspeccion} 
                          className={`p-4 rounded-2xl border shadow-sm transition-all flex flex-col gap-3 ${
                            isLight 
                              ? "bg-white border-slate-205" 
                              : "bg-zinc-900 border-zinc-800"
                          }`}
                        >
                          {/* Header de la Card: Hora y Código */}
                          <div className="flex items-center justify-between border-b pb-2.5 border-dashed border-slate-100 dark:border-zinc-850">
                            <div className="flex flex-col">
                              <span className={`font-mono text-[9px] uppercase tracking-wider font-extrabold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                                REGISTRO
                              </span>
                              <span className={`text-[11px] font-mono font-bold ${isLight ? 'text-slate-650' : 'text-zinc-300'}`}>
                                {item.codigo_preoperacional || item.id_inspeccion || 'N/D'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono text-[9px] uppercase tracking-wider font-extrabold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                                HORA
                              </span>
                              <div className="flex items-center gap-1 justify-end">
                                <span className={`font-bold text-xs ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>{formatTime}</span>
                                <span className={`text-[10px] text-slate-500`}>({formatDate})</span>
                              </div>
                            </div>
                          </div>

                          {/* Detalles del Conductor y Bus */}
                          <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed">
                            <div className="flex flex-col gap-1 pr-1 border-r border-slate-100 dark:border-zinc-850">
                              <span className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>CONDUCTOR</span>
                              <span className={`font-extrabold text-xs truncate ${isLight ? 'text-slate-900' : 'text-zinc-100'}`} title={item.conductor_nombre}>
                                {item.conductor_nombre || 'No Cargado'}
                              </span>
                              <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                CC: {item.conductor_cedula || 'N/D'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 pl-1">
                              <span className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>BUS / TC</span>
                              <span className={`font-extrabold text-xs truncate ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                                TC: {item.vehiculo_tc || 'N/D'}
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-blue-700' : 'text-indigo-400'}`}>
                                {item.vehiculo_placa || 'N/D'}
                              </span>
                            </div>
                          </div>

                          {/* Idoneidad y Botón de Acción */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-100 dark:border-zinc-850">
                            <div>
                              {hasFails ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 border border-rose-500/20 shadow-sm animate-pulse">
                                  ⚠️ NO APTO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 border border-emerald-500/20 shadow-sm">
                                  ✔️ APTO
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => setSelectedPreop(item)}
                              className="px-4 py-2 rounded-xl text-[9.5px] font-black tracking-wide uppercase transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
                            >
                              REVISAR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: HISTORIAL DE APROBADOS */}
          {activeTab === 'aprobados' && (
            <div className={`border rounded-3xl overflow-hidden ${
              isLight ? 'bg-white border-slate-205' : 'bg-zinc-900/50 border-zinc-900'
            }`}>
              <div className="p-5 border-b border-slate-200 dark:border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-blue-700 dark:text-blue-500">
                    <ClipboardCheck className="w-4 h-4 shrink-0 hover:scale-110 transition-transform" />
                    <span>Control de Salidas Viales Autorizadas (Historial de Vía)</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">Listado histórico de vehículos autorizados por personal regulador en vía</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full font-bold uppercase transition-all border border-blue-500/20">
                    {filteredAutorizados.length} Autorizados
                  </span>
                </div>
              </div>

              {filteredAutorizados.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-blue-500/60" />
                  <p className="text-sm font-black uppercase text-blue-600">Historial vacío</p>
                  <p className="text-xs font-semibold leading-relaxed mt-1">No se registran inspecciones preoperacionales autorizadas en esta sesión.</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">Cuando apruebe una inspección preoperacional, se registrará y visualizará aquí.</p>
                </div>
              ) : (
                <div className={`w-full max-h-[520px] overflow-y-auto overflow-x-auto rounded-xl border shadow-sm scrollbar-thin ${
                  isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950/20'
                }`}>
                  <table className="w-full min-w-[1000px] table-auto text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                        }`}>Hora de Autorización</th>
                        <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                        }`}>Bus / TC</th>
                        <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                        }`}>Conductor</th>
                        <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                          isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                        }`}>Regulador</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-zinc-900'}`}>
                      {filteredAutorizados.map((item, idx) => {
                        const placaVal = (item.vehiculo?.placa || item.vehiclos?.placa || item.vehiculo_placa || 'N/D').toUpperCase();
                        const tcVal = item.vehiculo?.tc || item.vehiculo?.numero_interno || item.vehiculos?.tc || item.vehiculos?.numero_interno || item.vehiculo_tc || 'N/D';
                        const conductorVal = (item.operador?.nombres_apellidos || item.operadores?.nombres_apellidos || item.conductor_nombre || 'Operador No Cargado').toUpperCase();
                        const conductorCedVal = item.operador?.identificacion || item.operadores?.identificacion || item.operador_id || 'N/D';
                        const reguladorVal = (item.regulador_nombre || item.autorizado_por || 'Noyla Berrio').toUpperCase();
                        const reguladorCedVal = item.regulador_cedula || 'N/D';

                        // Format timestamp beautifully
                        let horaStr = 'N/D';
                        let fechaStr = '';
                        if (item.fecha_autorizacion) {
                          try {
                            const dateObj = new Date(item.fecha_autorizacion);
                            horaStr = dateObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            fechaStr = dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                          } catch {
                            horaStr = item.fecha_autorizacion;
                          }
                        }

                        const rowClass = isLight 
                          ? "bg-white border-b border-slate-200 even:bg-slate-50/50 hover:bg-slate-100/70 transition-colors" 
                          : "bg-zinc-900 border-b border-zinc-800 even:bg-zinc-950/40 hover:bg-zinc-800/60 transition-colors";

                        return (
                          <tr key={item.id_inspeccion || idx} className={rowClass}>
                            <td className="py-2.5 px-4">
                              <span className={`font-semibold text-xs sm:text-sm leading-tight block ${isLight ? 'text-slate-700' : 'text-zinc-100'}`}>{horaStr}</span>
                              {fechaStr && (
                                <span className={`text-[10px] font-medium block mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-350'}`}>{fechaStr}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                TC: {tcVal} <span className={`font-medium text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>({placaVal})</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div>
                                <p className={`text-sm font-black tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                  {conductorVal}
                                </p>
                                <p className={`text-[10px] font-mono leading-none mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-350'}`}>
                                  CC {conductorCedVal}
                                </p>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <div>
                                <p className={`text-xs font-bold leading-tight ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                                  {reguladorVal}
                                </p>
                                <p className={`text-[10px] font-mono leading-none mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                                  CC {reguladorCedVal}
                                </p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}


        {/* Global Footer info */}
        <div className="pt-8 border-t border-slate-150 dark:border-zinc-905 text-center mt-8">
          <span className="text-[10px] font-mono text-slate-404 tracking-wider uppercase block">
            Cartagena SGO — Sistema Integrado de Control de Despachos y Frecuencia Vial • CCSI
          </span>
        </div>
      </main>

      {/* DETALLE Y ACCIÓN DE AUTORIZACIÓN MODAL */}
      {selectedPreop && (() => {
        const vehObj = Array.isArray(selectedPreop.vehiculos) ? selectedPreop.vehiculos[0] : selectedPreop.vehiculos;
        const operObj = Array.isArray(selectedPreop.operadores) ? selectedPreop.operadores[0] : selectedPreop.operadores;

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

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="preop-modal-panel">
            <div className={`w-full max-w-md mx-2 md:max-w-3xl my-auto rounded-2xl md:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] border shadow-2xl overflow-hidden animate-zoom-in ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
            }`}>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-455 flex items-center gap-2">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Inspección Preoperacional</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {selectedPreop.id_inspeccion}</p>
                </div>
                <button 
                  onClick={() => setSelectedPreop(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all focus:outline-none"
                >
                  <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-650" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                
                {/* Conductor & Bus Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-slate-50/70 border-slate-150 shadow-sm' : 'bg-zinc-950 border-zinc-850'}`}>
                    <span className={`text-[9.5px] uppercase font-mono font-black ${isLight ? 'text-slate-800 dark:text-slate-800' : 'text-zinc-400'}`}>Operador (Conductor)</span>
                    <h4 className="font-black text-base border-b pb-1 leading-tight tracking-tight whitespace-normal break-words mt-1 text-slate-950 dark:text-slate-950 border-slate-200">
                      {selectedPreop?.conductor_nombre || 'N/D'}
                    </h4>
                    <p className={`text-[11px] font-mono font-bold mt-1.5 ${isLight ? 'text-slate-800 dark:text-slate-800' : 'text-zinc-300'}`}>CC {selectedPreop?.conductor_cedula || 'N/D'}</p>
                  </div>

                  <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-slate-50/70 border-slate-150 shadow-sm' : 'bg-zinc-950 border-zinc-850'}`}>
                    <span className={`text-[9.5px] uppercase font-mono font-black ${isLight ? 'text-slate-800 dark:text-slate-800' : 'text-zinc-400'}`}>Vehículo Registrado</span>
                    <h4 className="text-xs font-black mt-1 uppercase text-indigo-950 dark:text-indigo-950">
                      BUS PLACA: {selectedPreop?.vehiculo_placa || 'N/D'}
                    </h4>
                    <p className={`text-[10px] font-mono font-bold mt-0.5 ${isLight ? 'text-slate-800 dark:text-slate-800' : 'text-zinc-300'}`}>
                      Kilometraje: {selectedPreop.kilometraje ? `${Number(selectedPreop.kilometraje).toLocaleString()} Km` : 'N/D'}
                    </p>
                    <p className={`text-[10px] font-mono font-black mt-1 ${isLight ? 'text-blue-900 dark:text-blue-900' : 'text-indigo-300'}`}>
                      Ruta: {selectedPreop?.ruta_codigo ? `${selectedPreop.ruta_codigo}${selectedPreop.ruta_destino ? ` (${selectedPreop.ruta_destino})` : ''}` : (selectedPreop?.ruta_asignada || 'N/D')}
                    </p>
                  </div>
                </div>

                {/* ESTADO LEGAL Y DOCUMENTAL */}
                <div className={`p-4 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-855'
                }`}>
                  <h4 className={`text-[10px] font-mono font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                    isLight ? 'text-slate-600' : 'text-zinc-300'
                  }`}>
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Estado Legal y Documental (Runt)</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800/60 pb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">SOAT (Vehículo):</span>
                      {isSoatVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800/60 pb-1.5">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">Tecnicomecánica (RTM):</span>
                      {isRtmVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600 dark:text-zinc-400">Licencia de Conducción (Pase):</span>
                      {isLicenciaVigente ? (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
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
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
                    }`}>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Sist. de Frenos</span>
                      {isSelectedPreopFrenosOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Dirección/Suspensión */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
                    }`}>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Dirección/Suspensión</span>
                      {isSelectedPreopSuspensionOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Luces y Bocina */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
                    }`}>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Luces y Bocina</span>
                      {isSelectedPreopLucesOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600">FALLA ⚠️</span>
                      )}
                    </div>

                    {/* Check item: Fugas de Aire */}
                    <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
                    }`}>
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Presión / Fugas Aire</span>
                      {isSelectedPreopAireOk ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-655">APTO ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600">FALLA ⚠️</span>
                      )}
                    </div>

                  </div>
                </div>

                {/* RED WARNING BANNER WARNING OF NOVEDADES CRITICAS */}
                {selectedPreopHasNovedades && (
                  <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-455 animate-pulse">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 block mt-0.5" />
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
                  <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-650 dark:text-rose-400">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-rose-650 block mt-0.5 animate-bounce" />
                    <div>
                      <p className="text-xs font-black uppercase">SALIDA VIAL NO AUTORIZABLE</p>
                      <p className="text-[10px] leading-relaxed mt-1 font-bold">
                        ⚠️ REGLA OPERATIVA DE SEGURIDAD: Uno o más documentos obligatorios de ley (SOAT, Técnico-Mecánica o Pase) se encuentran en estado VENCIDO. El despacho de este móvil por fuera de la regulación vial está de momento inhabilitado preventivamente.
                      </p>
                    </div>
                  </div>
                )}

                {/* Observación del Operador (Condicional) */}
                {(selectedPreop.observaciones_hallazgos || selectedPreop.observaciones) && (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 mt-1.5 shadow-sm dark:bg-amber-955/20 dark:border-amber-900/40 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-extrabold mb-1.5">
                      <span className="text-sm">💬</span>
                      <span>Observación del Operador:</span>
                    </div>
                    <p className="font-medium leading-relaxed">
                      {selectedPreop.observaciones_hallazgos || selectedPreop.observaciones}
                    </p>
                  </div>
                )}

              </div>

              {/* Modal Footer with "Autorizar Salida Vial" update trigger */}
              <div className="p-6 border-t border-slate-150 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/30 flex gap-4">
                <button
                  onClick={() => setSelectedPreop(null)}
                  className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
                    isLight ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-800 text-zinc-305 hover:bg-zinc-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  disabled={hasExpiredDocuments}
                  onClick={() => handleAutorizarPreoperacional(selectedPreop.id_inspeccion)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all focus:outline-none ${
                    hasExpiredDocuments 
                      ? 'bg-slate-300 dark:bg-zinc-850 text-slate-500 dark:text-zinc-500 cursor-not-allowed shadow-none' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  Autorizar Salida Vial
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
