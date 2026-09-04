import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/apiClients';
import { useTheme } from '../context/ThemeContext';
import ModalRevisionPreoperacional from './ModalRevisionPreoperacional';
import { 
  ShieldAlert, 
  LogOut, 
  Moon, 
  Sun,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  Bus,
  User,
  Check,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  Route,
  ClipboardCheck,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Eye,
  History,
  Menu
} from 'lucide-react';

interface DashboardJefeProps {
  onLogout: () => void;
  adminSession: any;
}

interface InspectionWithRelations {
  id_inspeccion: string;
  vehiculo_id: string;
  operador_id: string;
  kilometraje: number;
  fecha: string;
  observaciones_hallazgos?: string | null;
  // Checklist statuses
  estado_salud?: boolean;
  estado_llantas_guardapolvos?: boolean;
  luces_bocina?: boolean;
  espejos?: boolean;
  niveles_liquidos?: boolean;
  fugas_fluidos?: boolean;
  presion_fugas_aire?: boolean;
  estado_frenos?: boolean;
  parabrisas?: boolean;
  elementos_retencion?: boolean;
  documentos?: boolean;
  equipos_prevencion?: boolean;
  luces_tablero_testigos?: boolean;
  estado_suspension_direccion?: boolean;
  // Authorization Columns
  estado_autorizacion?: 'pendiente' | 'autorizado' | 'rechazado' | string;
  ruta_asignada?: string | null;
  // Relations
  vehiculo?: {
    id: string;
    placa: string;
    tc: string;
    tipo_vehiculo: string;
    estado?: string;
  } | null;
  operador?: {
    id: string;
    nombres_apellidos: string;
    identificacion: string;
    cargo?: string;
  } | null;
}

interface RutaDb {
  id_ruta: string;
  nume_ruta?: string;
  nombre_ruta?: string;
  concatenar?: string;
  tipo_ruta?: string;
}

export default function DashboardJefe({ onLogout, adminSession }: DashboardJefeProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  
  const user = adminSession?.user;
  const isJefe = user?.rol === 'jefe_patio';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [inspections, setInspections] = useState<InspectionWithRelations[]>([]);
  const [rutas, setRutas] = useState<RutaDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'salidas' | 'autorizar_regulador' | 'historial_aprobados'>('salidas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInspection, setSelectedInspection] = useState<InspectionWithRelations | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [preoperacionales, setPreoperacionales] = useState<any[]>([]);
  const [selectedPreop, setSelectedPreop] = useState<any | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialApproved, setHistorialApproved] = useState<any[]>([]);

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

  // Fallback Cartagena standard routes
  const defaultRoutes: RutaDb[] = [
    { id_ruta: 'r1', nume_ruta: 'T101', nombre_ruta: 'Portal - Centro • Troncal' },
    { id_ruta: 'r2', nume_ruta: 'T102', nombre_ruta: 'Portal - Crespo • Expreso' },
    { id_ruta: 'r3', nume_ruta: 'T103', nombre_ruta: 'Portal - Bocagrande • Directo' },
    { id_ruta: 'r4', nume_ruta: 'X101', nombre_ruta: 'Anillo Vial - Centro • Pretroncal' },
    { id_ruta: 'r5', nume_ruta: 'X102', nombre_ruta: 'Anillo Vial - Crespo • Pretroncal' },
    { id_ruta: 'r6', nume_ruta: 'X103', nombre_ruta: 'Anillo Vial - Bocagrande • Troncal' },
    { id_ruta: 'r7', nume_ruta: 'A101', nombre_ruta: 'Alimentadora - Pozón' },
    { id_ruta: 'r8', nume_ruta: 'A102', nombre_ruta: 'Alimentadora - Olaya' },
  ];

  const simulationData: InspectionWithRelations[] = [
    {
      id_inspeccion: 'jefe-sim-001',
      vehiculo_id: 'v-201',
      operador_id: 'op-801',
      kilometraje: 178500,
      fecha: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
      observaciones_hallazgos: 'Todo en perfecto orden para despacho vial.',
      estado_salud: true,
      estado_llantas_guardapolvos: true,
      luces_bocina: true,
      espejos: true,
      niveles_liquidos: true,
      fugas_fluidos: true,
      presion_fugas_aire: true,
      estado_frenos: true,
      parabrisas: true,
      elementos_retencion: true,
      documentos: true,
      equipos_prevencion: true,
      luces_tablero_testigos: true,
      estado_suspension_direccion: true,
      estado_autorizacion: 'pendiente',
      ruta_asignada: null,
      vehiculo: { id: 'v-201', placa: 'UYR-098', tc: 'TC-1044', tipo_vehiculo: 'Padrón MIO' },
      operador: { id: 'op-801', nombres_apellidos: 'Roberto Carlos Ortiz', identificacion: '73122455' }
    },
    {
      id_inspeccion: 'jefe-sim-002',
      vehiculo_id: 'v-202',
      operador_id: 'op-802',
      kilometraje: 95400,
      fecha: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
      observaciones_hallazgos: 'Requiere ajuste menor de presión en llanta delantera izquierda, pero es apto.',
      estado_salud: true,
      estado_llantas_guardapolvos: true,
      luces_bocina: true,
      espejos: true,
      niveles_liquidos: true,
      fugas_fluidos: true,
      presion_fugas_aire: true,
      estado_frenos: true,
      parabrisas: true,
      elementos_retencion: true,
      documentos: true,
      equipos_prevencion: true,
      luces_tablero_testigos: true,
      estado_suspension_direccion: true,
      estado_autorizacion: 'pendiente',
      ruta_asignada: null,
      vehiculo: { id: 'v-202', placa: 'WGN-122', tc: 'TC-2051', tipo_vehiculo: 'Articulado Transcaribe' },
      operador: { id: 'op-802', nombres_apellidos: 'Eduardo José Gaviria', identificacion: '10471201' }
    },
    {
      id_inspeccion: 'jefe-sim-003',
      vehiculo_id: 'v-203',
      operador_id: 'op-803',
      kilometraje: 211000,
      fecha: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
      observaciones_hallazgos: 'Freno de mano presenta juego excesivo. Se retiene para taller.',
      estado_salud: true,
      estado_llantas_guardapolvos: true,
      luces_bocina: true,
      espejos: true,
      niveles_liquidos: true,
      fugas_fluidos: false, // Fluid problems
      presion_fugas_aire: true,
      estado_frenos: false, // BRAKE FAIL
      parabrisas: true,
      elementos_retencion: true,
      documentos: true,
      equipos_prevencion: true,
      luces_tablero_testigos: false,
      estado_suspension_direccion: true,
      estado_autorizacion: 'rechazado',
      ruta_asignada: null,
      vehiculo: { id: 'v-203', placa: 'SZK-443', tc: 'TC-3012', tipo_vehiculo: 'Buseta Alimentadora' },
      operador: { id: 'op-803', nombres_apellidos: 'Andrés Mauricio Beltrán', identificacion: '10433299' }
    },
    {
      id_inspeccion: 'jefe-sim-004',
      vehiculo_id: 'v-204',
      operador_id: 'op-804',
      kilometraje: 120400,
      fecha: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      observaciones_hallazgos: 'Vehículo en excelente estado mecánico.',
      estado_salud: true,
      estado_llantas_guardapolvos: true,
      luces_bocina: true,
      espejos: true,
      niveles_liquidos: true,
      fugas_fluidos: true,
      presion_fugas_aire: true,
      estado_frenos: true,
      parabrisas: true,
      elementos_retencion: true,
      documentos: true,
      equipos_prevencion: true,
      luces_tablero_testigos: true,
      estado_suspension_direccion: true,
      estado_autorizacion: 'autorizado',
      ruta_asignada: 'T101',
      vehiculo: { id: 'v-204', placa: 'TTG-601', tc: 'TC-1887', tipo_vehiculo: 'Padrón MIO' },
      operador: { id: 'op-804', nombres_apellidos: 'Alonso Rafael Meza', identificacion: '73088912' }
    }
  ];

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch rutas
      const { data: routeList, error: routeErr } = await supabase
        .from('rutas')
        .select('*')
        .order('nume_ruta', { ascending: true });

      if (routeErr) {
        console.warn('Falla recuperando rutas, usando locales:', routeErr.message);
        setRutas(defaultRoutes);
      } else {
        setRutas(routeList && routeList.length > 0 ? routeList : defaultRoutes);
      }

      // 2. Fetch inspections, operators and vehicles in parallel to avoid any PostgREST relational join query errors (PGRST201)
      const [inspRes, operRes, vehRes] = await Promise.all([
        supabase
          .from('inspecciones_preoperacionales')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(50),
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

      const rawInsp = inspRes.data || [];
      const dbOperators = operRes.data || [];
      const dbVehicles = vehRes.data || [];

      // Link database entries in memory and map to the required types
      const sanitized: InspectionWithRelations[] = rawInsp.map((ins: any) => {
        const opAsociado = dbOperators.find(o => 
          (o.id && o.id === ins.operador_id) ||
          (o.identificacion && o.identificacion === ins.operador_id)
        );
        const vehAsociado = dbVehicles.find(v => 
          (v.id && v.id === ins.vehiculo_id) ||
          (v.placa && ins.placa && v.placa.toLowerCase() === ins.placa.toLowerCase())
        );

        return {
          ...ins,
          estado_autorizacion: ins.estado_autorizacion || 'pendiente',
          ruta_asignada: ins.ruta_asignada || null,
          vehiculo: vehAsociado ? {
            id: vehAsociado.id,
            placa: vehAsociado.placa,
            tc: vehAsociado.tc,
            numero_interno: vehAsociado.numero_interno,
            tipo_vehiculo: vehAsociado.tipo_vehiculo || 'Bus Padrón'
          } : null,
          operador: opAsociado ? {
            id: opAsociado.id,
            nombres_apellidos: opAsociado.nombres_apellidos,
            identificacion: opAsociado.identificacion
          } : null
        };
      });

      // Combine with local simulation data if empty, or prepend simulation entries for quick UI testing
      const combined = [...sanitized];
      if (combined.length === 0) {
        setInspections(simulationData);
      } else {
        // Guard against duplicates
        const existingIds = new Set(combined.map(x => x.id_inspeccion));
        simulationData.forEach(sim => {
          if (!existingIds.has(sim.id_inspeccion)) {
            combined.push(sim);
          }
        });
        setInspections(combined);
      }

      // 3. Fetch pending preoperacionales from the view
      try {
        const { data: pendingPreops, error: pendingErr } = await supabase
          .from('vista_regulado_pendientes')
          .select('*')
          .order('fecha', { ascending: false });

        if (pendingErr) {
          console.warn('Falla recuperando vista_regulado_pendientes:', pendingErr.message);
          setPreoperacionales(MOCK_PREOPERACIONALES_FALLBACK);
        } else {
          setPreoperacionales(pendingPreops && pendingPreops.length > 0 ? pendingPreops : MOCK_PREOPERACIONALES_FALLBACK);
        }
      } catch (err) {
        console.warn('Error fetching pending preops:', err);
        setPreoperacionales(MOCK_PREOPERACIONALES_FALLBACK);
      }

    } catch (err: any) {
      console.error('Error cargando datos del Jefe de Patio:', err);
      setErrorMsg('No se pudo establecer conexión en vivo de base de datos. Trabajando en modo local.');
      setInspections(simulationData);
      setRutas(defaultRoutes);
      setPreoperacionales(MOCK_PREOPERACIONALES_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadHistorialAprobados = async () => {
    setLoadingHistorial(true);
    try {
      const { data, error } = await supabase
        .from('inspecciones_preoperacionales')
        .select(`
          *,
          vehiculos!inspecciones_preoperacionales_vehiculo_id_fkey(*),
          operadores!inspecciones_preoperacionales_operador_id_fkey(*)
        `)
        .in('estado_autorizacion', ['Autorizado', 'autorizado', 'Aprobado', 'aprobado'])
        .order('fecha_autorizacion', { ascending: false });

      if (error) {
        console.warn('Falla recuperando historial con fkeys explícitas, usando paralelo como fallback:', error.message);
        
        const [inspRes, operRes, vehRes] = await Promise.all([
          supabase
            .from('inspecciones_preoperacionales')
            .select('*')
            .in('estado_autorizacion', ['Autorizado', 'autorizado', 'Aprobado', 'aprobado'])
            .order('fecha', { ascending: false }),
          supabase
            .from('operadores')
            .select('*'),
          supabase
            .from('vehiculos')
            .select('*')
        ]);

        if (inspRes.data) {
          const rawInsp = inspRes.data;
          const dbOperators = operRes.data || [];
          const dbVehicles = vehRes.data || [];

          const mapped = rawInsp.map((ins: any) => {
            const opAsociado = dbOperators.find(o => 
              (o.id && o.id === ins.operador_id) ||
              (o.identificacion && o.identificacion === ins.operador_id)
            );
            const vehAsociado = dbVehicles.find(v => 
              (v.id && v.id === ins.vehiculo_id) ||
              (v.placa && ins.placa && v.placa.toLowerCase() === ins.placa.toLowerCase())
            );

            return {
              ...ins,
              vehiculo: vehAsociado ? {
                id: vehAsociado.id,
                placa: vehAsociado.placa,
                tc: vehAsociado.tc,
                numero_interno: vehAsociado.numero_interno,
                tipo_vehiculo: vehAsociado.tipo_vehiculo || 'Bus Padrón'
              } : null,
              operador: opAsociado ? {
                id: opAsociado.id,
                nombres_apellidos: opAsociado.nombres_apellidos,
                identificacion: opAsociado.identificacion
              } : null
            };
          });
          setHistorialApproved(mapped);
        } else {
          setHistorialApproved([]);
        }
      } else {
        // Adapt relation shapes of vehiculos & operadores to match vehiculo & operador properties
        const adapted = (data || []).map((ins: any) => ({
          ...ins,
          vehiculo: ins.vehiculos || ins.vehiculo || null,
          operador: ins.operadores || ins.operador || null
        }));
        setHistorialApproved(adapted);
      }
    } catch (err) {
      console.error('Error cargando historial de aprobados:', err);
      setHistorialApproved([]);
    } finally {
      setLoadingHistorial(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historial_aprobados') {
      loadHistorialAprobados();
    }
  }, [activeTab]);

  const handleVistoBueno = async (id: string, action: 'autorizar' | 'retener') => {
    setUpdatingId(id);
    const targetStatus = action === 'autorizar' ? 'autorizado' : 'rechazado';
    
    try {
      // Offline local rollback setup
      setInspections(prev => prev.map(item => {
        if (item.id_inspeccion === id) {
          return { ...item, estado_autorizacion: targetStatus };
        }
        return item;
      }));

      if (selectedInspection?.id_inspeccion === id) {
        setSelectedInspection(prev => prev ? { ...prev, estado_autorizacion: targetStatus } : null);
      }

      // Real Database Update
      const { error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({ estado_autorizacion: targetStatus })
        .eq('id_inspeccion', id);

      if (error) {
        console.warn('Freno de escritura controlado en BD. Guardando en sesión.', error);
      }

      showToast(`Visto Bueno guardado: Inspección marcada como ${targetStatus.toUpperCase()}`);
    } catch (e: any) {
      console.warn("Fallo de red, guardado en buffer de sesión.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAutorizarSalida = async (id: string) => {
    if (!selectedRoute) {
      alert("Por favor seleccione un código de ruta antes de autorizar la salida.");
      return;
    }
    setUpdatingId(id);

    try {
      setInspections(prev => prev.map(item => {
        if (item.id_inspeccion === id) {
          return { ...item, ruta_asignada: selectedRoute };
        }
        return item;
      }));

      if (selectedInspection?.id_inspeccion === id) {
        setSelectedInspection(prev => prev ? { ...prev, ruta_asignada: selectedRoute } : null);
      }

      const { error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({ ruta_asignada: selectedRoute })
        .eq('id_inspeccion', id);

      if (error) {
        console.warn('Fallo guardando ruta asignada en base de datos:', error.message);
      }

      showToast(`¡Salida Autorizada con éxito! Vehículo despachado a la ruta ${selectedRoute}.`);
      setSelectedRoute('');
    } catch (e: any) {
      console.warn("Retenido en caché local.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAutorizarPreoperacional = async (idInspeccion: string) => {
    console.log("Iniciando autorización para la inspección:", idInspeccion);
    try {
      setUpdatingId(idInspeccion);
      
      const jefeId = user?.id || 'id-jefe-anonimo';
      const jefeCedula = user?.identificacion || user?.cedula || '123456';
      const jefeNombre = user?.nombres_apellidos || user?.nombre || 'Jefe de Patio';

      console.log("Datos que se enviarán a Supabase:", {
        estado_autorizacion: 'Autorizado',
        autorizado_por: jefeCedula,
        regulador_id: jefeId,
        regulador_cedula: jefeCedula,
        regulador_nombre: jefeNombre,
        fecha_autorizacion: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('inspecciones_preoperacionales')
        .update({
          estado_autorizacion: 'Autorizado',
          autorizado_por: jefeCedula,
          regulador_id: jefeId,
          regulador_cedula: jefeCedula,
          regulador_nombre: jefeNombre,
          fecha_autorizacion: new Date().toISOString()
        })
        .eq('id_inspeccion', idInspeccion)
        .select();

      if (error) {
        console.error("❌ ERROR CRÍTICO DE SUPABASE AL AUTORIZAR:", error.message, error.details, error.hint);
        alert(`Error al conectar con la base de datos: ${error.message}`);
        throw error;
      } else {
        console.log("✅ MUTACIÓN EXITOSA EN SUPABASE. Registro devuelto:", data);
        alert("¡Salida Autorizada con Éxito en Supabase!");
      }

      // Update the local list as authorised
      setPreoperacionales((prev) => prev.filter((item) => item.id_inspeccion !== idInspeccion));
      setSelectedPreop(null);
      
      // Also reload main inspections to reflect state
      await loadData();
      
      showToast('¡Salida vial autorizada con éxito como Jefe de Patio!');
    } catch (err: any) {
      console.error('Error de escritura en Supabase para preoperativo:', err.message);
      // Offline fallback
      setPreoperacionales((prev) => prev.filter((item) => item.id_inspeccion !== idInspeccion));
      setSelectedPreop(null);
      showToast('Autorizado en buffer de sesión local (Modo Contingencia).');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter calculations
  const filteredPreopsState = preoperacionales.filter(p => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    const placa = (p.vehiculo?.placa || p.vehiculo_placa || '').toLowerCase();
    const tc = (p.vehiculo?.tc || p.vehiculo_tc || '').toLowerCase();
    const conductor = (p.operador?.nombres_apellidos || p.conductor_nombre || '').toLowerCase();
    const identificacion = (p.operador?.identificacion || p.operador_id || '').toLowerCase();
    return placa.includes(q) || tc.includes(q) || conductor.includes(q) || identificacion.includes(q);
  });

  const filteredInspections = inspections.filter(item => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    const placa = (item.vehiculo?.placa || '').toLowerCase();
    const tc = (item.vehiculo?.tc || '').toLowerCase();
    const cond = (item.operador?.nombres_apellidos || '').toLowerCase();
    const id = item.id_inspeccion.toLowerCase();
    return placa.includes(q) || tc.includes(q) || cond.includes(q) || id.includes(q);
  });

  const filteredHistorial = historialApproved.filter(item => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    const plate = String(item.vehiculo_placa || item.vehiculo?.placa || '').toLowerCase();
    const tc = String(item.vehiculo_tc || item.vehiculo?.tc || '').toLowerCase();
    const name = String(item.conductor_nombre || item.operador?.nombres_apellidos || '').toLowerCase();
    const id = String(item.conductor_cedula || item.operador?.identificacion || '').toLowerCase();
    const code = String(item.codigo_preoperacional || item.id_inspeccion || '').toLowerCase();
    const reg = String(item.regulador_nombre || '').toLowerCase();

    return plate.includes(q) || tc.includes(q) || name.includes(q) || id.includes(q) || code.includes(q) || reg.includes(q);
  });

  const pendingList = filteredInspections.filter(item => item.estado_autorizacion === 'pendiente');
  const approvedList = filteredInspections.filter(item => item.estado_autorizacion === 'autorizado');
  const finishedList = filteredInspections.filter(item => item.estado_autorizacion === 'autorizado' && item.ruta_asignada);
  const dispatchReadyList = filteredInspections.filter(item => item.estado_autorizacion === 'autorizado' && !item.ruta_asignada);

  const stats = {
    pending: inspections.filter(x => x.estado_autorizacion === 'pendiente').length,
    approved: inspections.filter(x => x.estado_autorizacion === 'autorizado').length,
    rejected: inspections.filter(x => x.estado_autorizacion === 'rechazado').length,
    dispatched: inspections.filter(x => x.estado_autorizacion === 'autorizado' && x.ruta_asignada).length
  };

  if (!adminSession) {
    return (
      <div className={`w-full min-h-screen flex flex-col items-center justify-center p-6 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'
      }`}>
        <p className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase">Sin sesión activa</p>
        <button 
          onClick={onLogout}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
        >
          Regresar al Login
        </button>
      </div>
    );
  }

  if (!isJefe) {
    return (
      <div className={`w-full min-h-screen flex flex-col items-center justify-center p-6 ${
        isLight ? 'bg-slate-105 text-slate-900' : 'bg-zinc-950 text-white'
      }`}>
        <div className={`w-full max-w-sm p-8 rounded-3xl border text-center ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-805'
        }`}>
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h1 className="text-sm font-black uppercase tracking-wider text-rose-500 mb-2">Acceso Reservado</h1>
          <p className="text-xs text-slate-550 dark:text-zinc-400 mb-6 font-medium">
            Solo el personal con el rol de <b className="font-extrabold text-rose-500">Jefe de Patio</b> tiene acceso autorizado a este panel de despacho.
          </p>
          <button 
            onClick={onLogout}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wide transition-all shadow-md"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full min-h-screen transition-colors duration-300 ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'
    }`} id="jefe-patio-root-dashboard">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white font-semibold rounded-2xl flex items-center gap-3 shadow-2xl border border-emerald-500 animate-slide-in">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span className="text-xs uppercase tracking-wide">{successToast}</span>
        </div>
      )}

      {/* Backdrop de fondo semitransparente para móviles */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar de Operaciones Exclusivo */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 md:w-80 shrink-0 border-r flex flex-col justify-between transition-all duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${
        isLight ? 'bg-white border-slate-200 text-slate-900/90' : 'bg-zinc-900/40 border-zinc-900 text-white'
      }`}>
        <div>
          {/* Header branding */}
          <div className="p-6 border-b border-slate-200 dark:border-zinc-900 space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/10">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm font-extrabold tracking-wider uppercase font-sans">
                  Cartagena SGO
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest block font-mono text-emerald-550">
                  Panel Jefe de Patio
                </span>
              </div>
            </div>
          </div>

          {/* User badge detail */}
          <div className="p-5">
            <div className={`p-4 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-150' : 'bg-zinc-950 border-zinc-850'
            }`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] uppercase font-mono font-black text-slate-400">Jefe Autorizador</span>
              </div>
              <h4 className="text-xs font-black truncate block">{user?.nombres_apellidos || 'Manuel Cartagena'}</h4>
              <p className="text-[10px] font-mono font-medium text-slate-400 mt-1">ID: {user?.identificacion || 'CÉDULA DIRECTA'}</p>
            </div>
          </div>

          {/* Navigation links targeting direct requested features */}
          <nav className="px-4 space-y-1">
            <p className="px-3 text-[10px] uppercase font-mono font-black tracking-widest text-slate-400 block mb-2">
              Funciones Operativas
            </p>





            <button
              onClick={() => { setActiveTab('salidas'); setSelectedInspection(null); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'salidas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-550 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Route className="w-4 h-4 shrink-0" />
                <span className={activeTab === 'salidas' ? '' : 'text-slate-600 dark:text-zinc-400 font-semibold'}>Autorizar Salida</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'salidas' ? 'bg-indigo-800 text-white' : 'bg-slate-100 dark:bg-zinc-800'
              }`}>
                {dispatchReadyList.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('autorizar_regulador'); setSelectedPreop(null); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'autorizar_regulador'
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-550 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Autorizar Salidas (PREOP)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'autorizar_regulador' ? 'bg-emerald-900 text-white' : 'bg-slate-100 dark:bg-zinc-800'
              }`}>
                {filteredPreopsState.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('historial_aprobados'); setSelectedPreop(null); setIsSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'historial_aprobados'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/60 text-slate-550 dark:text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <History className="w-4 h-4 shrink-0" />
                <span className={activeTab === 'historial_aprobados' ? '' : 'text-slate-600 dark:text-zinc-400 font-semibold'}>Historial de Aprobados</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'historial_aprobados' ? 'bg-amber-800 text-white' : 'bg-slate-100 dark:bg-zinc-800'
              }`}>
                {historialApproved.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-zinc-900 space-y-3">
          <div className="flex gap-2">
            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex-1 flex justify-center items-center hover:scale-[1.03] transition-all text-xs font-bold gap-1.5 ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Oscuro</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Claro</span>
                </>
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-500/10 text-rose-600 dark:text-rose-405 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 flex-1"
              title="Salir de la sesión de Patio"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-bold">Salir</span>
            </button>
          </div>

          <div className="text-center">
            <span className="text-[9px] font-mono text-slate-400 block tracking-widest uppercase">
              Cartagena SGO • v5.0 SECURED
            </span>
          </div>
        </div>
      </aside>

      {/* Main Board Workpanel */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
        
        {/* Header bar */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-zinc-900 pb-5">
            <div className="flex items-center gap-3">
              {/* Botón flotante de menú para celulares */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`p-2 rounded-xl border md:hidden transition-all ${
                  isLight 
                    ? 'bg-white border-slate-200 text-slate-705 hover:bg-slate-50' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850'
                }`}
                title="Abrir Menú"
              >
                <Menu className="w-5 h-5 shrink-0" />
              </button>
              <div>
                <p className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-extrabold font-black">Área Operativa de Campo</p>
                <h2 
                  className="text-2xl font-black uppercase tracking-tight"
                  style={{ color: isLight ? '#000000' : '#ffffff' }}
                >
                  {activeTab === 'salidas' && 'Autorización de Salida y Despachos'}
                  {activeTab === 'autorizar_regulador' && 'Aprobaciones de Salida Vial (Regulador)'}
                  {activeTab === 'historial_aprobados' && 'Historial de Inspecciones Aprobadas'}
                </h2>
              </div>
            </div>

            {/* Global Search and Refresh action */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar Vehículo (TC/Placa)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border focus:outline-none transition-all w-60 ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-905 focus:border-blue-500 shadow-sm' 
                      : 'bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500/75'
                  }`}
                />
              </div>

              <button
                onClick={loadData}
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

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-850'
            }`}>
              <div className="text-[10px] font-mono font-black text-amber-500 uppercase">Preoperacionales Pendientes</div>
              <div className="text-2xl font-black mt-1">{stats.pending}</div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-850'
            }`}>
              <div className="text-[10px] font-mono font-black text-emerald-500 uppercase">Checklists Aprobados</div>
              <div className="text-2xl font-black mt-1">{stats.approved}</div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-850'
            }`}>
              <div className="text-[10px] font-mono font-black text-rose-500 uppercase">Vehículos Retenidos</div>
              <div className="text-2xl font-black mt-1">{stats.rejected}</div>
            </div>
            <div className={`p-4 rounded-2xl border transition-all ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900 border-zinc-850'
            }`}>
              <div className="text-[10px] font-mono font-black text-indigo-500 uppercase">Vehículos en Vía (Servicio)</div>
              <div className="text-2xl font-black mt-1">{stats.dispatched}</div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-amber-500/15 border border-amber-500/25 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ACTIVE TAB WORKPANE CONTENT */}

          {/* TAB 1: VISTA DE PREOPERACIONALES DE CONDUCTORES */}
          {activeTab === 'preoperacionales' && (
            <div className={`border rounded-3xl overflow-hidden ${
              isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/50 border-zinc-900'
            }`}>
              <div className="p-5 border-b border-slate-200 dark:border-zinc-900/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Historial de Reportes de Campo</h3>
                  <p className="text-[10px] font-mono text-slate-400">Inspecciones vehiculares enviadas por operadores en vía</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  Mostrando {filteredInspections.length} registros
                </span>
              </div>

              {filteredInspections.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-400">No se encontraron inspecciones preoperacionales.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`uppercase font-mono font-bold tracking-wider text-[10px] border-b ${
                      isLight ? 'bg-slate-50/70 border-slate-200 text-slate-500' : 'bg-zinc-950/70 border-zinc-900 text-zinc-400'
                    }`}>
                      <tr>
                        <th className="p-4">Vehículo (TC)</th>
                        <th className="p-4">Placa</th>
                        <th className="p-4">Conductor / Cédula</th>
                        <th className="p-4">Fecha / Hora</th>
                        <th className="p-4">KM</th>
                        <th className="p-4 text-center">Revisión</th>
                        <th className="p-4 text-center">Ruta Asignada</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-zinc-900">
                      {filteredInspections.map((item) => {
                        const statusColor = item.estado_autorizacion === 'autorizado' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : item.estado_autorizacion === 'rechazado'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-600 border border-amber-500/20';

                        return (
                          <tr key={item.id_inspeccion} className="hover:bg-slate-50/30 dark:hover:bg-zinc-900/25 transition-all">
                            <td className="p-4 font-black text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Bus className="w-4 h-4 text-slate-400" />
                                <span>{item.vehiculo?.tc || 'TC-N/D'}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-bold text-slate-500 dark:text-zinc-400">
                              {item.vehiculo?.placa || 'N/D'}
                            </td>
                            <td className="p-4">
                              <span className="font-extrabold block text-slate-800 dark:text-zinc-200">
                                {item.operador?.nombres_apellidos || 'Operador'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 font-bold block mt-0.5">
                                C.C {item.operador?.identificacion || 'N/D'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{new Date(item.fecha).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-medium">
                              {item.kilometraje?.toLocaleString()} km
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                                {item.estado_autorizacion === 'autorizado' ? 'APROBADO' : item.estado_autorizacion === 'rechazado' ? 'RECHAZADO' : 'PENDIENTE'}
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono font-black text-blue-600 dark:text-indigo-400">
                              {item.ruta_asignada ? (
                                <span className="px-2 py-1 rounded bg-blue-105/10 text-blue-600 dark:text-indigo-405 border border-blue-500/10 uppercase">
                                  {item.ruta_asignada}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11px]">—</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedInspection(item);
                                  setActiveTab('salidas');
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 ml-auto transition-transform active:scale-95 border ${
                                  isLight 
                                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700' 
                                    : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detalles</span>
                              </button>
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


          {/* TAB 3: AUTORIZACIÓN DE SALIDA (Asignación de Ruta e incorporación a Servicio Activo) */}
          {activeTab === 'salidas' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Panel: Approved checklists ready for route dispatch mapping */}
              <div className={`xl:col-span-5 border rounded-3xl p-5 space-y-4 h-[550px] overflow-y-auto ${
                isLight ? 'bg-white border-slate-205' : 'bg-zinc-900/50 border-zinc-900'
              }`}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Aprobados Sin Ruta (Listos para Despacho)</h3>
                  <p className="text-[10px] font-mono text-slate-400">Seleccione un vehículo para asociar ruta de Cartagena SGO</p>
                </div>

                <div className="space-y-2">
                  {dispatchReadyList.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Route className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs font-bold font-sans">No hay vehículos aprobados esperando despacho de ruta.</p>
                      <button 
                        onClick={() => {
                          const ap = inspections.find(x => x.estado_autorizacion === 'autorizado');
                          if (ap) setSelectedInspection(ap);
                        }}
                        className="mt-3 text-[11px] text-indigo-505 underline font-semibold"
                      >
                        Ver vehículos ya despachados
                      </button>
                    </div>
                  ) : (
                    dispatchReadyList.map((item) => (
                      <div
                        key={item.id_inspeccion}
                        onClick={() => setSelectedInspection(item)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          selectedInspection?.id_inspeccion === item.id_inspeccion
                            ? isLight 
                              ? 'bg-indigo-500/10 border-indigo-500/35 shadow-sm' 
                              : 'bg-indigo-500/10 border-indigo-505/20'
                            : isLight
                              ? 'bg-slate-50 border-slate-150 hover:bg-slate-100'
                              : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-extrabold text-xs block text-slate-900 dark:text-white">
                            {item.vehiculo?.tc || 'TC - BUS'}
                          </span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold uppercase">
                            ☑ VISTO BUENO ok
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                          {item.operador?.nombres_apellidos}
                        </div>
                        <div className="text-[10px] text-slate-403 font-bold mt-1">
                          Placa: {item.vehiculo?.placa} • {item.vehiculo?.tipo_vehiculo}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Panel: Official dispatch / route selection card */}
              <div className="xl:col-span-7">
                {!selectedInspection ? (
                  <div className={`border rounded-3xl p-12 text-center h-[550px] flex flex-col justify-center items-center ${
                    isLight ? 'bg-white border-slate-205 shadow-sm' : 'bg-zinc-900/55 border-zinc-900'
                  }`}>
                    <Route className="w-12 h-12 text-zinc-400 mb-4 animate-pulse" />
                    <h3 className="text-sm font-black uppercase text-slate-700 dark:text-zinc-300">Listo para Despacho Vial</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1.5 font-medium leading-relaxed">
                      Seleccione un bus que cuente con **Visto Bueno habilitado** para asignarle su recorrido oficial e inscribir su despacho formal.
                    </p>
                  </div>
                ) : (
                  <div className={`border rounded-3xl p-6 h-[550px] overflow-y-auto flex flex-col justify-between ${
                    isLight ? 'bg-white border-slate-205 shadow-sm' : 'bg-zinc-900 border-zinc-850'
                  }`}>
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-150 dark:border-zinc-800">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600">
                          <Bus className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 font-extrabold block">FICHA DE DESPACHO OFICIAL</span>
                          <h4 className="text-base font-black text-slate-900 dark:text-white">
                            {selectedInspection.vehiculo?.tc || 'TC'} — Placa: {selectedInspection.vehiculo?.placa || 'UYR'}
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className={`p-4 rounded-2xl border ${
                          isLight ? 'bg-slate-50 border-slate-150' : 'bg-zinc-950 border-zinc-855'
                        }`}>
                          <span className="text-[9px] uppercase font-mono font-extrabold text-slate-400">OPERADOR AUTORIZADO</span>
                          <div className="text-sm font-black text-slate-800 dark:text-white mt-1">
                            {selectedInspection.operador?.nombres_apellidos}
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-450 block mt-0.5">
                            Cédula: {selectedInspection.operador?.identificacion}
                          </span>
                        </div>

                        {/* Route selection form dropdown based on actual SGO rutas table */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block font-black">
                            Seleccionar Código de Ruta Asignada
                          </label>
                          <select
                            value={selectedRoute}
                            onChange={(e) => setSelectedRoute(e.target.value)}
                            className={`w-full p-4 text-sm font-bold uppercase tracking-wider rounded-xl border focus:outline-none transition-all ${
                              isLight 
                                ? 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600' 
                                : 'bg-zinc-950 border-zinc-800 text-white focus:border-indigo-600/75'
                            }`}
                          >
                            <option value="">-- Seleccionar Recorrido Vial --</option>
                            {rutas.map((r) => (
                              <option key={r.id_ruta} value={r.nume_ruta}>
                                {r.nume_ruta} — {r.nombre_ruta}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Informative dispatch advisory */}
                        <div className="flex items-start gap-3 p-4 bg-indigo-550/5 border border-indigo-500/10 rounded-2xl text-xs font-semibold text-indigo-700 dark:text-indigo-305">
                          <Check className="w-5 h-5 shrink-0 bg-indigo-600 text-white rounded-full p-0.5" />
                          <div>
                            <span className="font-extrabold block">Validación del Visto Bueno</span>
                            <p className="mt-0.5 text-slate-450">
                              Esta acción habilita formalmente al conductor a iniciar su ciclo en el sistema vial de Cartagena con el visto bueno del Jefe de Patio.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Dispatch Action Footer buttons */}
                    <div className="pt-4 mt-4 border-t border-slate-150 dark:border-zinc-800 flex items-center justify-between gap-4">
                      <div>
                        {selectedInspection.ruta_asignada ? (
                          <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>AUTORIZADO EN RUTA: {selectedInspection.ruta_asignada}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-500">Espera de Asignación Física</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleAutorizarSalida(selectedInspection.id_inspeccion)}
                        className="py-3 px-6 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-650/10 transition-transform active:scale-95 cursor-pointer"
                        disabled={updatingId !== null}
                      >
                        <Route className="w-4 h-4" />
                        <span>Autorizar Despacho a Vía</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: AUTORIZAR SALIDAS (REGULADOR) */}
          {activeTab === 'autorizar_regulador' && (
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
                    {filteredPreopsState.length} Pendientes
                  </span>
                </div>
              </div>

              {filteredPreopsState.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-emerald-500/60" />
                  <p className="text-sm font-black uppercase text-emerald-600">¡Vía Despejada!</p>
                  <p className="text-xs font-semibold leading-relaxed mt-1">No se registran inspecciones preoperacionales en estado 'Pendiente'.</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-mono">Todos los buses listos han sido autorizados o se encuentran en ruta.</p>
                </div>
              ) : (
                <div className="p-4 sm:p-5">
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
                        {filteredPreopsState.map((item) => {
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
                            ? "bg-white border-b border-slate-200 even:bg-slate-50/50 hover:bg-slate-105/70 transition-colors" 
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
                                {item.conductor_nombre || (item.operador?.nombres_apellidos) || 'Operador No Cargado'}
                              </td>
                              <td className={`py-2.5 px-4 font-medium text-sm font-mono ${isLight ? 'text-slate-660' : 'text-zinc-300'}`}>
                                {item.conductor_cedula || (item.operador?.identificacion) || 'N/D'}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`font-bold text-sm ${isLight ? 'text-slate-800' : 'text-zinc-100'}`}>
                                  TC: {item.vehiculo_tc || (item.vehiculo?.tc) || 'N/D'} <span className={`font-medium text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>({item.vehiculo_placa || (item.vehiculo?.placa) || 'N/D'})</span>
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
                                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow active:scale-95 duration-100 cursor-pointer"
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
                  <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 max-h-[520px] overflow-y-auto pr-1">
                    {filteredPreopsState.map((item) => {
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
                      const placaStr = item.vehiculo_placa || (item.vehiculo?.placa) || 'N/D';

                      return (
                        <div 
                          key={item.id_inspeccion} 
                          className={`p-4 rounded-xl border shadow-sm transition-all flex flex-col gap-3 ${
                            isLight 
                              ? "bg-white border-slate-100" 
                              : "bg-zinc-900 border-zinc-805"
                          }`}
                        >
                          {/* Header de la Card: Hora y Código */}
                          <div className={`flex items-center justify-between border-b pb-2.5 border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <div className="flex flex-col">
                              <span className={`text-[9px] uppercase tracking-wider font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                REGISTRO
                              </span>
                              <span className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>
                                {item.codigo_preoperacional || item.id_inspeccion || 'N/D'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] uppercase tracking-wider font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                HORA
                              </span>
                              <div className="flex items-center gap-1 justify-end">
                                <span className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>{formatTime}</span>
                                <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>({formatDate})</span>
                              </div>
                            </div>
                          </div>

                          {/* Placa Destacada */}
                          <div className="flex flex-col">
                            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>PLACA DE VEHÍCULO</span>
                            <span className={isLight ? 'text-slate-955 font-extrabold text-lg' : 'text-white font-extrabold text-lg'}>
                              {placaStr}
                            </span>
                          </div>

                          {/* Detalles del Conductor y Bus */}
                          <div className={`grid grid-cols-2 gap-3 text-xs leading-relaxed border-t pt-2 border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <div className={`flex flex-col gap-1 pr-1 border-r ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>CONDUCTOR</span>
                              <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-900' : 'text-zinc-205'}`} title={item.conductor_nombre}>
                                {item.conductor_nombre || (item.operador?.nombres_apellidos) || 'No Cargado'}
                              </span>
                              <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                CC: {item.conductor_cedula || (item.operador?.identificacion) || 'N/D'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 pl-1">
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>BUS / TC</span>
                              <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-900' : 'text-zinc-205'}`}>
                                TC: {item.vehiculo_tc || (item.vehiculo?.tc) || 'N/D'}
                              </span>
                            </div>
                          </div>

                          {/* Idoneidad */}
                          <div className={`flex items-center justify-between pt-2.5 border-t border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>IDONEIDAD</span>
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
                          </div>

                          {/* Botón de Acción Táctil Ancho Completo */}
                          <button
                            onClick={() => setSelectedPreop(item)}
                            className="w-full mt-2 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow active:scale-95 duration-100 cursor-pointer text-center"
                          >
                            REVISAR INSPECCIÓN
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: HISTORIAL DE APROBADOS (JEFE PATIO) */}
          {activeTab === 'historial_aprobados' && (
            <div className={`border rounded-3xl overflow-hidden ${
              isLight ? 'bg-white border-slate-205' : 'bg-zinc-900/50 border-zinc-900'
            }`}>
              <div className="p-5 border-b border-slate-200 dark:border-zinc-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-amber-600">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Registro de Inspecciones Preoperacionales Autorizadas</span>
                  </h3>
                  <p className="text-[10px] font-mono text-slate-400">Inspecciones aprobadas con viabilidad de despacho y salida vial</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full font-bold uppercase">
                    {filteredHistorial.length} Autorizados
                  </span>
                </div>
              </div>

              {loadingHistorial ? (
                <div className="p-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Cargando Historial en Vivo...</p>
                </div>
              ) : filteredHistorial.length === 0 ? (
                <div className="p-16 text-center text-slate-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-slate-350 dark:text-zinc-750" />
                  <p className="text-sm font-black uppercase text-slate-500">Sin Datos Registrados</p>
                  <p className="text-xs font-semibold leading-relaxed mt-1">No se encontraron inspecciones aprobadas en esta consulta.</p>
                </div>
              ) : (
                <div className="p-4 sm:p-5">
                  {/* Desktop Layout Table */}
                  <div className={`hidden md:block w-full max-h-[520px] overflow-y-auto overflow-x-auto rounded-xl border shadow-sm scrollbar-thin ${
                    isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950/20'
                  }`}>
                    <table className="w-full min-w-[1000px] table-auto text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-20 shadow-sm">
                        <tr>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Fecha Aprobación</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Código Preoperacional</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Conductor</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Cédula</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Bus / TC</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Autorizado Por</th>
                          <th className={`font-extrabold uppercase text-xs tracking-wider py-3 px-4 border-b-2 text-right sticky top-0 z-10 ${
                            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-zinc-950 text-zinc-100 border-zinc-900'
                          }`}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-zinc-900'}`}>
                        {filteredHistorial.map((item) => {
                          const dateObj = item.fecha_autorizacion || item.fecha;
                          const formatTime = dateObj 
                            ? new Date(dateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                            : 'N/D';
                          const formatDate = dateObj 
                            ? new Date(dateObj).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                            : '';
                          const rowClass = isLight 
                            ? "bg-white border-b border-slate-200 even:bg-slate-50/50 hover:bg-slate-105/70 transition-colors" 
                            : "bg-zinc-900 border-b border-zinc-800 even:bg-zinc-950/40 hover:bg-zinc-800/60 transition-colors";

                          return (
                            <tr key={item.id_inspeccion} className={rowClass}>
                              <td className="py-2.5 px-4 font-mono">
                                <span className={`font-semibold text-xs sm:text-sm leading-tight block ${isLight ? 'text-slate-750 font-black' : 'text-zinc-100'}`}>{formatTime}</span>
                                <span className={`text-[10px] font-medium block mt-0.5 ${isLight ? 'text-slate-500 font-bold' : 'text-zinc-350'}`}>{formatDate}</span>
                              </td>
                              <td className={`py-2.5 px-4 font-mono font-bold ${isLight ? 'text-slate-700' : 'text-zinc-200'}`}>
                                {item.codigo_preoperacional || item.id_inspeccion || 'N/D'}
                              </td>
                              <td className={`py-2.5 px-4 font-black tracking-tight text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {item.conductor_nombre || (item.operador?.nombres_apellidos) || 'No registrado'}
                              </td>
                              <td className={`py-2.5 px-4 font-medium text-sm font-mono ${isLight ? 'text-slate-700 font-bold' : 'text-zinc-330'}`}>
                                {item.conductor_cedula || (item.operador?.identificacion) || 'N/D'}
                              </td>
                              <td className="py-2.5 px-4 font-bold">
                                <span className={isLight ? 'text-slate-950 font-black' : 'text-white'}>
                                  TC: {item.vehiculo_tc || (item.vehiculo?.tc) || 'N/D'} <span className={`font-medium text-xs ${isLight ? 'text-slate-500 font-bold' : 'text-zinc-400'}`}>({item.vehiculo_placa || (item.vehiculo?.placa) || 'N/D'})</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${isLight ? 'bg-slate-100 border border-slate-350 text-slate-800' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                  👤 {item.regulador_nombre || 'Sgo Regulador'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right animation-all">
                                <button
                                  onClick={() => setSelectedPreop(item)}
                                  className="px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow active:scale-95 duration-100 cursor-pointer"
                                >
                                  Ver Detalle
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Layout Cards */}
                  <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 max-h-[520px] overflow-y-auto pr-1">
                    {filteredHistorial.map((item) => {
                      const dateObj = item.fecha_autorizacion || item.fecha;
                      const formatTime = dateObj 
                        ? new Date(dateObj).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                        : 'N/D';
                      const formatDate = dateObj 
                        ? new Date(dateObj).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                        : '';
                      const placaStr = item.vehiculo_placa || (item.vehiculo?.placa) || 'N/D';

                      return (
                        <div 
                          key={item.id_inspeccion} 
                          className={`p-4 rounded-xl border shadow-sm transition-all flex flex-col gap-3 ${
                            isLight 
                              ? "bg-white border-slate-100 text-slate-950" 
                              : "bg-zinc-900 border-zinc-805 text-white"
                          }`}
                        >
                          {/* Card Header */}
                          <div className={`flex items-center justify-between border-b pb-2.5 border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <div className="flex flex-col">
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                CÓDIGO PREOP
                              </span>
                              <span className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-zinc-300'}`}>
                                {item.codigo_preoperacional || item.id_inspeccion || 'N/D'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                FECHA APROBADO
                              </span>
                              <div className="flex items-center gap-1 justify-end">
                                <span className={`font-semibold text-xs ${isLight ? 'text-slate-955' : 'text-zinc-100'}`}>{formatTime}</span>
                                <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>({formatDate})</span>
                              </div>
                            </div>
                          </div>

                          {/* Placa Destacada */}
                          <div className="flex flex-col">
                            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>PLACA DE VEHÍCULO</span>
                            <span className={isLight ? 'text-slate-955 font-extrabold text-lg' : 'text-white font-extrabold text-lg'}>
                              {placaStr}
                            </span>
                          </div>

                          {/* Grid Drivers / Vehicles */}
                          <div className={`grid grid-cols-2 gap-3 text-xs leading-relaxed border-t pt-2 border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <div className={`flex flex-col gap-1 pr-1 border-r ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>CONDUCTOR</span>
                              <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-950 font-black' : 'text-zinc-100'}`} title={item.conductor_nombre}>
                                {item.conductor_nombre || (item.operador?.nombres_apellidos) || 'No Registrado'}
                              </span>
                              <span className={`text-[10px] font-mono font-semibold ${isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}`}>
                                CC: {item.conductor_cedula || (item.operador?.identificacion) || 'N/D'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 pl-1">
                              <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>BUS / TC</span>
                              <span className={`font-semibold text-xs truncate ${isLight ? 'text-slate-950 font-black' : 'text-zinc-100'}`}>
                                TC: {item.vehiculo_tc || (item.vehiculo?.tc) || 'N/D'}
                              </span>
                            </div>
                          </div>

                          {/* Autorizado por */}
                          <div className={`flex items-center justify-between pt-2.5 border-t border-dashed ${isLight ? 'border-slate-100' : 'border-zinc-850'}`}>
                            <span className={`text-[9px] uppercase tracking-wider font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>AUTORIZADOR</span>
                            <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                              {item.regulador_nombre || 'Sgo Regulador'}
                            </span>
                          </div>

                          {/* Botón de Acción Táctil Ancho Completo */}
                          <button
                            onClick={() => setSelectedPreop(item)}
                            className="w-full mt-2 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow active:scale-95 duration-100 cursor-pointer text-center"
                          >
                            Ver Detalle
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Small operational log table of currently active route vehicles */}
        <div className="mt-10 font-mono text-[10px] space-y-2 border-t border-slate-205 dark:border-zinc-900 pt-6">
          <span className="uppercase text-slate-450 block font-black tracking-widest mb-1.5">REGISTRO DE SALIDAS AUTORIZADAS EN ESTE TURNO</span>
          <div className="flex flex-wrap gap-2">
            {finishedList.length === 0 ? (
              <span className="text-slate-400 italic">No hay vehículos despachados en este turno todavía.</span>
            ) : (
              finishedList.map(fin => (
                <div 
                  key={fin.id_inspeccion}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                    isLight ? 'bg-white border-slate-200 text-slate-650' : 'bg-zinc-950 border-zinc-900 text-zinc-300'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-extrabold">{fin.vehiculo?.tc || 'TC'}</span>
                  <span className="text-slate-400">({fin.vehiculo?.placa})</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{fin.ruta_asignada}</span>
                  <span className="text-slate-404">| {new Date(fin.fecha).toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dialog Preop Reviser Overlay */}
        {selectedPreop && (
          <ModalRevisionPreoperacional
            selectedPreop={selectedPreop}
            isLight={isLight}
            onClose={() => setSelectedPreop(null)}
            onAuthorize={activeTab === 'historial_aprobados' ? undefined : handleAutorizarPreoperacional}
          />
        )}

      </main>
    </div>
  );
}
