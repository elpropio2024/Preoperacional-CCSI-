import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bus, 
  Gauge, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Wifi, 
  Battery, 
  RefreshCw,
  Sun,
  HelpCircle,
  Smartphone,
  Send,
  Calendar,
  AlertTriangle,
  LogOut,
  Search,
  FileDown,
  Flame,
  Wrench,
  FileText,
  CreditCard,
  Eye,
  Sliders,
  LifeBuoy
} from 'lucide-react';
import { supabase } from '../lib/apiClients';
import { useTheme } from '../context/ThemeContext';
import ModalPreoperacionalPDF from './ModalPreoperacionalPDF';

interface PlanillaMovilProps {
  supabaseClient?: any;
  operatorSession?: {
    id: string;
    identificacion: string;
    nombres_apellidos: string;
    nombre?: string;
    cargo?: string;
    cedula?: string;
  } | null;
  onLogout?: () => void;
}

// 22 inspection questions: 1 health question + 21 vehicle condition checklist items
export interface Question {
  id: number;
  text: string;
  category: string;
  description: string;
  dbKey: string;
}

export const QUESTIONS: Question[] = [
  // 1. Datos del Operador
  { 
    id: 1, 
    text: "¿Estás en condiciones de salud y descanso para conducir?", 
    category: "Datos del Operador", 
    description: "Sin malestar, mareo, sueño u otros síntomas. Con descanso adecuado para operar la ruta.",
    dbKey: "estado_salud"
  },

  // 2. Lista de Chequeo — Condición del Vehículo
  // Exterior
  { 
    id: 2, 
    text: "Llantas: labrado, presión, sin cortaduras ni abultamientos", 
    category: "Exterior", 
    description: "Verificar profundidad de labrado, presión de inflado, sin cortes, protuberancias ni tuercas flojas.",
    dbKey: "estado_llantas_guardapolvos"
  },

  // Motor
  { 
    id: 3, 
    text: "Correas, radiador y mangueras sin daños visibles", 
    category: "Motor", 
    description: "Inspección visual del compartimiento de motor: tensión de correas, radiador limpio y mangueras sin fugas ni agrietamiento.",
    dbKey: "motor_correas_radiador_mangueras"
  },
  { 
    id: 4, 
    text: "Niveles de aceite, refrigerante, dirección y frenos", 
    category: "Motor", 
    description: "Comprobar que todos los depósitos de fluidos se encuentren en los rangos seguros entre mínimo y máximo.",
    dbKey: "niveles_liquidos"
  },
  { 
    id: 5, 
    text: "Sin fugas de fluidos en el motor ni en el piso", 
    category: "Motor", 
    description: "Inspeccionar visualmente el piso bajo el bus y el motor descartando goteos de lubricante, refrigerante o combustible.",
    dbKey: "fugas_fluidos"
  },

  // Frenos
  { 
    id: 6, 
    text: "Presión y fugas de aire del sistema neumático", 
    category: "Frenos", 
    description: "Carga rápida del compresor, manómetro de aire estable (>90 PSI) sin pérdidas de presión ni silbidos.",
    dbKey: "presion_fugas_aire"
  },
  { 
    id: 7, 
    text: "Freno de servicio y freno de emergencia/parqueo", 
    category: "Frenos", 
    description: "Pedal firme con respuesta inmediata y freno de estacionamiento/seguridad reteniendo eficazmente.",
    dbKey: "estado_frenos"
  },

  // Luces y Visibilidad
  { 
    id: 8, 
    text: "Luces: altas, bajas, direccionales, freno/reversa y bocina", 
    category: "Luces y Visibilidad", 
    description: "Faros frontales (altas/bajas), intermitentes/direccionales, stop, luz y pito de reversa y corneta reglamentaria.",
    dbKey: "luces_bocina"
  },
  { 
    id: 9, 
    text: "Parabrisas, vidrios (frontal, trasero, laterales) y plumillas", 
    category: "Luces y Visibilidad", 
    description: "Vidrios panorámicos limpios y sin fisuras; plumillas limpiaparabrisas con cauchos enteros y barrido uniforme.",
    dbKey: "parabrisas"
  },

  // Cabina
  { 
    id: 10, 
    text: "Espejos laterales y central: limpios y bien ajustados", 
    category: "Cabina", 
    description: "Retrovisores y espejos convexos limpios, firmes y correctamente graduados para eliminar puntos ciegos.",
    dbKey: "espejos"
  },
  { 
    id: 11, 
    text: "Switch de arranque y alarma de retroceso", 
    category: "Cabina", 
    description: "Encendido suave sin atascos en el switch y alarma sonora de reversa activándose de forma audible.",
    dbKey: "switch_alarma_retroceso"
  },
  { 
    id: 12, 
    text: "Cinturones de seguridad, anclaje y estado de la silletería", 
    category: "Cabina", 
    description: "Cinturón de operador y asientos de pasajeros firmemente anclados, limpios y con retractores operativos.",
    dbKey: "elementos_retencion"
  },
  { 
    id: 13, 
    text: "Testigos, manómetros, velocímetro e indicador de combustible", 
    category: "Cabina", 
    description: "Tablero de instrumentos operativo; testigos de advertencia apagados una vez iniciado el motor.",
    dbKey: "luces_tablero_testigos"
  },

  // Carrocería
  { 
    id: 14, 
    text: "Puertas y vidrios de puertas: cierran bien y sin fisuras", 
    category: "Carrocería", 
    description: "Mecanismos de apertura y cierre suaves, sellado hermético y vidrios de puertas en buen estado.",
    dbKey: "puertas_vidrios"
  },
  { 
    id: 15, 
    text: "Rampa y señalización de espacios para movilidad reducida", 
    category: "Carrocería", 
    description: "Rampa o mecanismo PMR operativo, seguros firmes y pictogramas de prioridad visibles y señalizados.",
    dbKey: "rampa_pmr"
  },
  { 
    id: 16, 
    text: "Timbre y señalización interna reglamentaria", 
    category: "Carrocería", 
    description: "Pulsadores de timbre con señal sonora/luminosa y avisos de seguridad interior presentes.",
    dbKey: "timbre_senalizacion"
  },

  // Seguridad y Emergencias
  { 
    id: 17, 
    text: "Sistema Ángel Guardián: carcasa y funcionamiento (si aplica)", 
    category: "Seguridad y Emergencias", 
    description: "Dispositivo sensor o limitador Ángel Guardián con carcasa intacta y estado operativo.",
    dbKey: "angel_guardian"
  },
  { 
    id: 18, 
    text: "Extintores (1 y 2), Fogmaker, botiquín y kit de carretera", 
    category: "Seguridad y Emergencias", 
    description: "Extintores con carga y vencimiento vigente, sistema Fogmaker presurizado, botiquín dotado y conos.",
    dbKey: "equipos_prevencion"
  },
  { 
    id: 19, 
    text: "Martillos de fragmentación y salidas de emergencia señalizadas", 
    category: "Seguridad y Emergencias", 
    description: "Martillos con guaya en su puesto, escotillas de techo y ventanas de auxilio con calcomanías instructivas.",
    dbKey: "martillos_salidas_emergencia"
  },

  // Recaudo
  { 
    id: 20, 
    text: "Torniquete, validador y unidad lógica operativos", 
    category: "Recaudo", 
    description: "Equipos de cobro y validación de tarjetas encendidos, sin bloqueos mecánicos ni mensajes de error.",
    dbKey: "equipos_recaudo"
  },

  // Documentos
  { 
    id: 21, 
    text: "SOAT, TC, RTM, tarjeta de propiedad y seguros RCC/RCE", 
    category: "Documentos", 
    description: "Porte de documentos del vehículo y conductor vigentes: SOAT, Tarjeta de Operación, RTM y seguros RCC/RCE.",
    dbKey: "documentos"
  },

  // Chasis
  { 
    id: 22, 
    text: "Dirección y suspensión sin ruidos ni durezas", 
    category: "Chasis", 
    description: "Giro suave del timón sin holguras excesivas, suspensión sin ruidos secos ni inclinaciones anormales.",
    dbKey: "estado_suspension_direccion"
  }
];

export default function PlanillaMovil({ supabaseClient, operatorSession, onLogout }: PlanillaMovilProps) {
  const { theme, toggleTheme } = useTheme();
  // Use passed client prop or fallback to centralized direct client
  const activeSupabase = supabaseClient || supabase;

  // STEP NAVIGATION STATE
  // Step 1: Identificación
  // Step 2: Checklist interactiva (14 preguntas SURA)
  // Step 3: Observaciones & Envío
  // 'success': Pantalla de finalización exitosa
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);

  // MANEJO DE CIERRE DE SESIÓN MANUAL Y POR INACTIVIDAD
  const handleCerrarSesion = async () => {
    try {
      // 1. Limpiar el sessionStorage completo (incluyendo horaInicioPreoperacional)
      sessionStorage.clear();
      // 2. Ejecutar el cierre de sesión de Supabase
      if (supabase && supabase.auth) {
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.warn('Supabase auth signOut silent notice:', signOutErr);
        }
      }
    } catch (e) {
      console.warn('Error cerrando sesión (silencioso):', e);
    }
    // 3. Redirigir al usuario a la pantalla de Login
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '#/login';
    }
  };

  // TEMPORIZADOR DE INACTIVIDAD DE 15 MINUTOS (900,000 ms)
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos = 900,000 ms
    let timer: NodeJS.Timeout | number | null = null;

    const resetInactivityTimer = () => {
      if (timer) {
        clearTimeout(timer as any);
      }
      timer = setTimeout(() => {
        handleCerrarSesion();
      }, INACTIVITY_TIMEOUT);
    };

    // Eventos de interacción del usuario
    const events = ['touchstart', 'mousemove', 'keydown', 'scroll', 'click', 'mousedown'];

    resetInactivityTimer();

    events.forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    return () => {
      if (timer) {
        clearTimeout(timer as any);
      }
      events.forEach(evt => {
        window.removeEventListener(evt, resetInactivityTimer);
      });
    };
  }, []);

  // STEP 1 FIELDS & VALIDATION
  const [driverId, setDriverId] = useState(operatorSession ? (operatorSession.cedula || operatorSession.identificacion || '') : '');
  const [operatorUuid, setOperatorUuid] = useState<string | null>(operatorSession ? operatorSession.id : null);
  const [operatorName, setOperatorName] = useState<string | null>(operatorSession ? (operatorSession.nombres_apellidos || operatorSession.nombre || null) : null);
  const [isSearchingOperator, setIsSearchingOperator] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const [numeroBus, setNumeroBus] = useState('');
  const [vehicleUuid, setVehicleUuid] = useState<string | null>(null);
  const [vehiclePlate, setVehiclePlate] = useState<string | null>(null);
  const [vehicleTipo, setVehicleTipo] = useState<string | null>(null);
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // ROUTE FIELD & VALIDATION STATES
  const [codigoRuta, setCodigoRuta] = useState('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState<any | null>(null);
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const handleClearRoute = () => {
    setCodigoRuta('');
    setRutaSeleccionada(null);
    setRouteError(null);
  };

  const [odometer, setOdometer] = useState('');
  const [vencimientoExtintor1, setVencimientoExtintor1] = useState<string>('');
  const [vencimientoExtintor2, setVencimientoExtintor2] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Evaluador dinámico de vigencia de extintor (Vigente / Por Vencer / Vencido)
  const getExtintorStatus = (dateStr: string | undefined) => {
    if (!dateStr) return { label: 'Sin Fecha', color: 'slate', isVigente: false, text: 'Sin Fecha' };
    try {
      const d = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = d.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { label: 'Vencido', color: 'rose', isVigente: false, text: 'Vencido' };
      } else if (diffDays <= 30) {
        return { label: 'Próximo a Vencer', color: 'amber', isVigente: true, text: `Por vencer (${diffDays}d)` };
      } else {
        return { label: 'Vigente', color: 'emerald', isVigente: true, text: 'Vigente' };
      }
    } catch (e) {
      return { label: 'Vigente', color: 'emerald', isVigente: true, text: 'Vigente' };
    }
  };

  const [ultimoKm, setUltimoKm] = useState<number | null>(null);
  const [vehicleDocs, setVehicleDocs] = useState<{
    estado_soat?: string;
    estado_rtm?: string;
    estado_rcc?: string;
    estado_rce?: string;
    vencimiento_soat?: string;
    rtm_vencimiento?: string;
    vencimiento_rcc?: string;
    vencimiento_rce?: string;
  } | null>(null);

  // Helper document semaphore renderer
  const renderDocumentStatus = (title: string, value: string | undefined, expiryDate: string | undefined) => {
    const status = (value || '').trim();
    const cleanStatus = status.toLowerCase();
    
    let icon = <AlertCircle className="w-3.5 h-3.5" />;
    let statusLabel = status || 'N/D';

    const isGreen = cleanStatus === 'vigente' || cleanStatus === 'al día' || cleanStatus === 'al dia' || cleanStatus === 'activo';
    const isYellow = cleanStatus === 'próximo a vencer' || cleanStatus === 'proximo a vencer' || cleanStatus === 'por vencer';
    const isRed = cleanStatus === 'vencido' || cleanStatus === 'inactivo' || cleanStatus === '';

    let badgeClass = "";
    if (isGreen) {
      badgeClass = isLight 
        ? "bg-emerald-100 text-emerald-955 border-emerald-500 border-2 font-black" 
        : "bg-emerald-950/50 text-emerald-400 border-emerald-800/40 font-bold";
      icon = <Check className="w-3.5 h-3.5 stroke-[2.5]" />;
    } else if (isYellow) {
      badgeClass = isLight 
        ? "bg-amber-100 text-amber-955 border-amber-500 border-2 font-black" 
        : "bg-amber-950/40 text-amber-404 border-amber-805/40 font-bold";
      icon = <AlertTriangle className="w-3.5 h-3.5" />;
    } else if (isRed) {
      badgeClass = isLight 
        ? "bg-red-100 text-red-955 border-red-500 border-2 font-black animate-pulse" 
        : "bg-rose-955/20 text-rose-400 border-rose-900/30 font-bold animate-pulse";
      icon = <AlertCircle className="w-3.5 h-3.5" />;
    } else {
      badgeClass = isLight
        ? "bg-slate-100 text-slate-955 border-slate-400 border-2 font-black"
        : "bg-zinc-900 text-zinc-400 border-zinc-805 font-bold";
    }

    const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return 'Sin fecha';
      try {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch (e) {
        return dateStr;
      }
    };

    const itemBg = isLight ? 'bg-slate-50' : 'bg-zinc-950/50';
    const itemBorder = isLight
      ? (isRed ? 'border-red-500 border-2 shrink-0 shadow-md' : 'border-slate-205 shadow-xs')
      : (isRed ? 'border-rose-900/50' : 'border-zinc-800');
    
    const titleColor = isLight 
      ? 'text-slate-900 font-black text-[12px]' 
      : 'text-zinc-400 font-bold text-[10px]';

    const dateColor = isLight 
      ? 'text-slate-850 font-black text-[11px]' 
      : 'text-[9px] text-zinc-500 font-semibold';

    return (
      <div key={title} className={`p-3 border rounded-2xl flex flex-col justify-between gap-1.5 transition-all ${itemBg} ${itemBorder}`}>
        <span className={`tracking-wide uppercase whitespace-normal break-words block ${titleColor}`}>
          {title}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mt-0.5">
          <div className={`px-2 py-1 text-[9px] rounded-md border flex items-center gap-1 uppercase flex-wrap ${badgeClass}`}>
            {icon}
            <span style={{ fontSize: '11.5px' }}>{statusLabel}</span>
          </div>
          {expiryDate && (
            <span className={`font-mono block ${dateColor}`}>
              {formatDate(expiryDate)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // STEP 2 & 3 STATES
  const [checklist, setChecklist] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    QUESTIONS.forEach(q => {
      initial[q.id] = true;
    });
    return initial;
  });
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showScrollAlert, setShowScrollAlert] = useState(false);
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [submitSuccessId, setSubmitSuccessId] = useState<string | null>(null);
  const [idRegistro, setIdRegistro] = useState<string>('');
  const [idInspeccion, setIdInspeccion] = useState<string>('');
  const [savedFecha, setSavedFecha] = useState<string | null>(null);

  // OFFLINE-FIRST ARCHITECTURE STATES
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // Utility to count locally queued items
  const getPendingSyncCount = (): number => {
    try {
      const stored = localStorage.getItem('inspecciones_pendientes_sync');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch (e) {
      console.error('Error reading localStorage sync queue:', e);
    }
    return 0;
  };

  // Safe unique ID generator for prevention of duplicate entries in Supabase
  const generateUUID = (): string => {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      try {
        return window.crypto.randomUUID();
      } catch (e) {
        // Fallback
      }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const isUUID = (str: any): boolean => {
    if (!str || typeof str !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
  };

  // ADAPTIVE AND ROBUST INSPECTION INSERT ENGINE FOR SUPABASE
  const insertInspectionWithAdaptiveSchema = async (
    supabaseClient: any,
    initialPayload: Record<string, any>,
    routeDetails?: { routeId?: any; routeCode?: any; routeUuid?: any }
  ) => {
    let workingPayload = { ...initialPayload };
    let attempts = 0;
    const maxAttempts = 8;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[Supabase Insert Intento ${attempts}] Payload:`, workingPayload);

      const res = await supabaseClient
        .from('inspecciones_preoperacionales')
        .insert([workingPayload])
        .select('*')
        .maybeSingle();

      if (!res.error) {
        console.log(`[Supabase Insert Éxito en Intento ${attempts}]:`, res.data);
        return res;
      }

      const { error } = res;
      const errMsg = (error.message || '').toLowerCase();
      const errCode = error.code || '';
      console.warn(`[Supabase Insert Falló en Intento ${attempts}]:`, { code: errCode, message: error.message });

      // Case 1: Column does not exist (PostgreSQL 42703 or PostgREST schema cache)
      if (
        errCode === '42703' ||
        errMsg.includes('does not exist') ||
        errMsg.includes('could not find the') ||
        errMsg.includes('schema cache')
      ) {
        const matchCol =
          error.message.match(/column ["']?([^"'\s]+)["']? of relation/i) ||
          error.message.match(/Could not find the ['"]([^'"]+)['"] column/i) ||
          error.message.match(/column ["']?([^"'\s]+)["']? does not exist/i);

        if (matchCol && matchCol[1] && workingPayload.hasOwnProperty(matchCol[1])) {
          const colToRemove = matchCol[1];
          console.warn(`[Supabase Schema Adapt] Eliminando columna inexistente en BD: "${colToRemove}"`);
          delete workingPayload[colToRemove];
          continue;
        }

        // Sequential fallback removal of optional candidate columns
        if (workingPayload.hasOwnProperty('id_ruta')) {
          console.warn('[Supabase Schema Adapt] Probando sin id_ruta...');
          delete workingPayload.id_ruta;
          continue;
        }
        if (workingPayload.hasOwnProperty('ruta_id')) {
          console.warn('[Supabase Schema Adapt] Probando sin ruta_id...');
          delete workingPayload.ruta_id;
          continue;
        }
        if (workingPayload.hasOwnProperty('exp_extintor_1') || workingPayload.hasOwnProperty('exp_extintor_2')) {
          console.warn('[Supabase Schema Adapt] Probando sin columnas de extintores...');
          delete workingPayload.exp_extintor_1;
          delete workingPayload.exp_extintor_2;
          delete workingPayload.vencimiento_extintor_1;
          delete workingPayload.vencimiento_extintor_2;
          continue;
        }
        if (workingPayload.hasOwnProperty('ruta_asignada')) {
          console.warn('[Supabase Schema Adapt] Probando sin ruta_asignada...');
          delete workingPayload.ruta_asignada;
          continue;
        }
      }

      // Case 2: UUID syntax error (PostgreSQL 22P02)
      if (
        errCode === '22P02' ||
        errMsg.includes('invalid input syntax for type uuid') ||
        errMsg.includes('uuid')
      ) {
        let modified = false;

        // If ruta_asignada is text (like "T101") but table column is UUID
        if (workingPayload.ruta_asignada && !isUUID(workingPayload.ruta_asignada)) {
          if (routeDetails?.routeUuid) {
            console.warn('[Supabase UUID Adapt] Asignando UUID a ruta_asignada:', routeDetails.routeUuid);
            workingPayload.ruta_asignada = routeDetails.routeUuid;
          } else {
            console.warn('[Supabase UUID Adapt] Omitiendo texto no-UUID en ruta_asignada');
            delete workingPayload.ruta_asignada;
          }
          modified = true;
        }

        if (workingPayload.id_ruta && !isUUID(workingPayload.id_ruta)) {
          if (routeDetails?.routeUuid) {
            workingPayload.id_ruta = routeDetails.routeUuid;
          } else {
            delete workingPayload.id_ruta;
          }
          modified = true;
        }

        if (workingPayload.ruta_id && !isUUID(workingPayload.ruta_id)) {
          if (routeDetails?.routeUuid) {
            workingPayload.ruta_id = routeDetails.routeUuid;
          } else {
            delete workingPayload.ruta_id;
          }
          modified = true;
        }

        if (modified) continue;
      }

      // Unrecoverable error or RLS constraint
      return res;
    }

    return {
      data: null,
      error: new Error('No fue posible insertar la inspección preoperacional en Supabase tras varios intentos adaptativos.')
    };
  };

  // Background synchronize queue to Supabase (only when online)
  const triggerSyncQueue = async () => {
    const stored = localStorage.getItem('inspecciones_pendientes_sync');
    if (!stored) return;
    
    let queue: any[] = [];
    try {
      queue = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse offline sync queue:', e);
      return;
    }
    
    if (!Array.isArray(queue) || queue.length === 0) {
      setPendingSyncCount(0);
      return;
    }

    // Do not run parallel syncs
    setIsSyncing(true);

    console.log(`[Online Background Sync] Iniciando sincronización de ${queue.length} inspecciones en cola...`);

    const remainingQueue: any[] = [];
    
    for (const item of queue) {
      try {
        console.log(`[Sync] Enviando inspección preoperacional encolada: ${item.id_inspeccion}`);
        const { error } = await insertInspectionWithAdaptiveSchema(
          activeSupabase,
          item.payload,
          item.routeDetails
        );
          
        if (error) {
          // If already inserted (23505 duplicate code), bypass safely
          if (error.code === '23505') {
            console.warn(`[Sync] Registro ${item.id_inspeccion} ya existe. Omitiendo duplicado.`);
          } else {
            console.error(`[Sync] Falló inserción para ${item.id_inspeccion}:`, error.message);
            remainingQueue.push(item);
          }
        } else {
          console.log(`[Sync] Sincronización exitosa para inspección ${item.id_inspeccion}`);
        }
      } catch (err: any) {
        console.error(`[Sync] Error de red sincronizando ${item.id_inspeccion}:`, err.message || err);
        remainingQueue.push(item);
      }
    }

    try {
      if (remainingQueue.length > 0) {
        localStorage.setItem('inspecciones_pendientes_sync', JSON.stringify(remainingQueue));
      } else {
        localStorage.removeItem('inspecciones_pendientes_sync');
      }
      setPendingSyncCount(remainingQueue.length);
    } catch (e) {
      console.error('Error actualizando cola de sincronización localStorage:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize online listeners and execute first check
  useEffect(() => {
    setPendingSyncCount(getPendingSyncCount());

    const handleOnline = () => {
      setIsOnline(true);
      triggerSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-trigger sync if we start as online
    if (window.navigator.onLine) {
      triggerSyncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // DECORATION STATES
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel] = useState('98%');
  const [highContrast, setHighContrast] = useState(false);

  // SCROLL CONTAINER REF & SCROLL HANDLER FOR DETECTOR
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const reachedBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 60;
    if (reachedBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // Initialize hasScrolledToBottom and showScrollAlert to false on step changes or mount
  useEffect(() => {
    setHasScrolledToBottom(false);
    setShowScrollAlert(false);
  }, [step]);

  const handleNextStep = () => {
    let scrolled = hasScrolledToBottom;
    if (scrollContainerRef.current) {
      const target = scrollContainerRef.current;
      const reachedBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 70;
      if (reachedBottom) {
        scrolled = true;
        setHasScrolledToBottom(true);
      }
    }

    if (!scrolled) {
      setShowScrollAlert(true);
    } else {
      setShowScrollAlert(false);
      setStep(3);
      setHasScrolledToBottom(false);
    }
  };

  // Real-time status bar clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hrs = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setCurrentTime(`${hrs}:${mins} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // REAL SUPABASE OPERATOR VERIFICATION DEBOUNCE
  useEffect(() => {
    if (operatorSession) {
      // Skip live lookup debouncing if we already have an active operator session
      return;
    }
    const cleanId = driverId.trim();
    if (cleanId.length === 0) {
      setOperatorName(null);
      setOperatorUuid(null);
      setOperatorError(null);
      return;
    }

    if (cleanId.length < 5) {
      setOperatorName(null);
      setOperatorUuid(null);
      setOperatorError('Escriba mínimo 5 dígitos');
      return;
    }

    setIsSearchingOperator(true);
    setOperatorError(null);

    const taskDebounce = setTimeout(async () => {
      try {
        const { data, error } = await activeSupabase
          .from('operadores')
          .select('id, nombres_apellidos')
          .eq('identificacion', cleanId)
          .eq('activo', true)
          .maybeSingle();

        if (error) {
          console.error('Error consultando operador:', error);
          setOperatorError(`Error consulta: ${error.message}`);
          setOperatorName(null);
          setOperatorUuid(null);
        } else if (data) {
          setOperatorName(data.nombres_apellidos);
          setOperatorUuid(data.id);
          setOperatorError(null);
        } else {
          setOperatorError('Operador no encontrado o inactivo en base de datos');
          setOperatorName(null);
          setOperatorUuid(null);
        }
      } catch (err: any) {
        console.error('Falla conexión operadores:', err);
        setOperatorError(`Error de conexión o tabla inexistente`);
        setOperatorName(null);
        setOperatorUuid(null);
      } finally {
        setIsSearchingOperator(false);
      }
    }, 500);

    return () => clearTimeout(taskDebounce);
  }, [driverId, activeSupabase]);

  // MANUAL VEHICLE SEARCH FUNCTION TRIGGERED ONLY BY BUTTON CLICK
  const validarVehiculoManual = async () => {
    const tcInput = numeroBus;
    if (tcInput.trim().length === 0) {
      setVehiclePlate(null);
      setVehicleUuid(null);
      setVehicleError('Por favor ingrese un TC para validar');
      setUltimoKm(null);
      setVehicleDocs(null);
      return;
    }

    setIsSearchingVehicle(true);
    setVehicleError(null);

    try {
      const tcClean = tcInput.trim();
      let queryResult: { data: any; error: any } = { data: null, error: null };

      // Attempt 1: Try exact match (handles both text strings and automatic SQL matching)
      const tryExact = await activeSupabase
        .from('vehiculos')
        .select('*')
        .eq('tc', tcClean)
        .maybeSingle();

      if (!tryExact.error && tryExact.data) {
        queryResult = tryExact;
      } else {
        // Attempt 2: If tcClean is numeric, try casting to match integer column types
        const parsedNumber = Number(tcClean);
        if (!isNaN(parsedNumber)) {
          const tryNumeric = await activeSupabase
            .from('vehiculos')
            .select('*')
            .eq('tc', parsedNumber)
            .maybeSingle();

          if (!tryNumeric.error && tryNumeric.data) {
            queryResult = tryNumeric;
          } else {
            // Attempt 3: Try matching with 'TC' prefix if not present, e.g. tc = 'TC1102'
            const tryPrefix = await activeSupabase
              .from('vehiculos')
              .select('*')
              .eq('tc', `TC${tcClean}`)
              .maybeSingle();

            if (!tryPrefix.error && tryPrefix.data) {
              queryResult = tryPrefix;
            } else {
              queryResult = tryExact; // Fallback to report initial state or error
            }
          }
        } else {
          // Attempt 4: Dynamic case-insensitive ILIKE matching for flexible string columns
          const tryILike = await activeSupabase
            .from('vehiculos')
            .select('*')
            .ilike('tc', tcClean)
            .maybeSingle();

          if (!tryILike.error && tryILike.data) {
            queryResult = tryILike;
          } else {
            queryResult = tryExact; // Fallback to report initial state or error
          }
        }
      }

      const { data: vehiculo, error } = queryResult;

      if (error) {
        console.error('Error real de Supabase:', error);
        alert(`⚠️ ERROR DE SUPABASE:\n${error.message}\nCódigo: ${error.code}`);
        setVehicleError(`Error de base de datos: ${error.message}`);
        setVehiclePlate(null);
        setVehicleUuid(null);
        setVehicleDocs(null);
        setUltimoKm(null);
      } else if (!vehiculo) {
        setVehicleError('El TC no está registrado en el sistema');
        setVehiclePlate(null);
        setVehicleUuid(null);
        setVehicleDocs(null);
        setUltimoKm(null);
      } else {
        // Check vehicle state
        const estadoVehiculo = vehiculo.estado || '';
        if (estadoVehiculo !== 'Activo' && estadoVehiculo !== 'Operativo') {
          alert(`Atención: El vehículo se encuentra en estado '${estadoVehiculo}' y no se recomienda operar en estas condiciones.`);
        }

        setVehiclePlate(vehiculo.placa);
        setVehicleUuid(vehiculo.id);
        setVehicleTipo(vehiculo.tipo_vehiculo || vehiculo.tipo || null);
        setVehicleDocs({
          estado_soat: vehiculo.estado_soat,
          estado_rtm: vehiculo.estado_rtm,
          estado_rcc: vehiculo.estado_rcc,
          estado_rce: vehiculo.estado_rce,
          vencimiento_soat: vehiculo.vencimiento_soat,
          rtm_vencimiento: vehiculo.rtm_vencimiento,
          vencimiento_rcc: vehiculo.vencimiento_rcc,
          vencimiento_rce: vehiculo.vencimiento_rce
        });

        // Las fechas de vencimiento de los extintores deben ser ingresadas manualmente por el operador
        setVehicleError(null);

        // Obtener el kilometraje base directamente de la tabla vehiculos
        try {
          const { data: dataVehiculo, error: kmError } = await activeSupabase
            .from('vehiculos')
            .select('kilometraje')
            .eq('id', vehiculo.id)
            .maybeSingle();

          if (kmError) {
            console.error('Error al consultar kilometraje en vehiculos:', kmError);
          }

          const rawKm = dataVehiculo?.kilometraje ?? vehiculo.kilometraje;
          if (rawKm !== null && rawKm !== undefined && rawKm !== '') {
            const parsedKm = Number(rawKm);
            setUltimoKm(!isNaN(parsedKm) && parsedKm > 0 ? parsedKm : null);
          } else {
            // Si es null o no está configurado por Mantenimiento, se deja en null para que el operador ingrese desde cero
            setUltimoKm(null);
          }
        } catch (milErr) {
          console.error('Error al recuperar kilometraje de vehiculos:', milErr);
          setUltimoKm(null);
        }
      }
    } catch (err: any) {
      console.error('Falla conexión vehículos:', err);
      setVehicleError('El TC no está registrado en el sistema');
      setVehiclePlate(null);
      setVehicleUuid(null);
      setVehicleDocs(null);
      setUltimoKm(null);
    } finally {
      setIsSearchingVehicle(false);
    }
  };

  const handleClearOperator = () => {
    setDriverId('');
    setOperatorUuid(null);
    setOperatorName(null);
    setOperatorError(null);
  };

  const handleClearVehicle = () => {
    setNumeroBus('');
    setVehicleUuid(null);
    setVehiclePlate(null);
    setVehicleTipo(null);
    setVencimientoExtintor1('');
    setVencimientoExtintor2('');
    setVehicleError(null);
    setUltimoKm(null);
    setVehicleDocs(null);
  };

  // MANUAL ROUTE VERIFICATION FROM SUPABASE (CASE INSENSITIVE UPPERCASE AS REQUESTED)
  const validarRutaManual = async () => {
    const routeInput = codigoRuta.trim();
    if (routeInput.length === 0) {
      setRutaSeleccionada(null);
      setRouteError('Por favor ingrese un código de ruta para validar');
      return;
    }
    setIsSearchingRoute(true);
    setRouteError(null);

    try {
      // Look up in rutas table by nume_ruta (exact case insensitive), or id_ruta, or codigo_ruta
      let queryResult = await activeSupabase
        .from('rutas')
        .select('*')
        .eq('nume_ruta', routeInput.toUpperCase())
        .maybeSingle();

      if (queryResult.error || !queryResult.data) {
        // Try fallback search by ilike or other identifiers
        const fallbackSearch = await activeSupabase
          .from('rutas')
          .select('*')
          .or(`nume_ruta.ilike.${routeInput},id_ruta.ilike.${routeInput}`)
          .limit(1)
          .maybeSingle();

        if (!fallbackSearch.error && fallbackSearch.data) {
          queryResult = fallbackSearch;
        }
      }

      const { data, error } = queryResult;

      if (error) {
        console.error('Error real de Supabase al buscar ruta:', error);
        setRouteError(`Error de base de datos: ${error.message}`);
        setRutaSeleccionada(null);
      } else if (!data) {
        setRouteError('La ruta no está registrada en el sistema');
        setRutaSeleccionada(null);
      } else {
        console.log('[Ruta validada con éxito en Supabase]:', data);
        setRutaSeleccionada(data);
        setRouteError(null);
      }
    } catch (err: any) {
      console.error('Falla conexión de ruta:', err);
      setRouteError('La ruta no está registrada en el sistema');
      setRutaSeleccionada(null);
    } finally {
      setIsSearchingRoute(false);
    }
  };

  const odoValue = odometer ? parseInt(odometer) : 0;
  const isMileageLowerThanLast = ultimoKm !== null && ultimoKm > 0 && odoValue > 0 && odoValue < ultimoKm;
  const isMileageExcessive = ultimoKm !== null && ultimoKm > 0 && odoValue > 0 && (odoValue - ultimoKm) > 100;

  // Step 1 validation
  const isStep1Valid = 
    operatorUuid !== null && 
    operatorName !== null && 
    vehicleUuid !== null && 
    vehiclePlate !== null && 
    rutaSeleccionada !== null &&
    vencimientoExtintor1.trim() !== '' &&
    vencimientoExtintor2.trim() !== '' &&
    odometer.trim() !== '' && 
    parseInt(odometer) > 0 &&
    !isMileageLowerThanLast &&
    !isMileageExcessive;

  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!operatorUuid) {
      setValidationError('Debe ingresar y validar una cédula de conductor activa.');
      return;
    }
    if (!vehicleUuid) {
      setValidationError('Debe ingresar y validar un código de Tarjeta de Operación (TC).');
      return;
    }
    if (!vencimientoExtintor1 || !vencimientoExtintor2) {
      setValidationError('Debe ingresar la fecha de vencimiento de ambos extintores.');
      return;
    }
    if (!rutaSeleccionada) {
      setValidationError('Debe ingresar y validar una ruta de despacho activa.');
      return;
    }
    const odoValue = parseInt(odometer);
    if (isNaN(odoValue) || odoValue <= 0) {
      setValidationError('Registre un kilometraje válido de odómetro mayor a cero.');
      return;
    }

    // Advance to Step 2
    setStep(2);
  };

  // Checklist calculation helper
  const handleAnswerQuestion = (qId: number, value: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [qId]: value
    }));
  };

  const answeredCount = Object.keys(checklist).length;
  const isChecklistComplete = answeredCount === QUESTIONS.length;
  const currentFailsCount = QUESTIONS.filter(q => checklist[q.id] === false).length;

  const handleAutoGenerateReport = () => {
    const fails = QUESTIONS.filter(q => checklist[q.id] === false).map(q => q.text);
    if (fails.length > 0) {
      setObservations(`Inspección de despacho finalizada con novedades mecánicas. Elemento(s) fuera de tolerancia: ${fails.join(', ')}. Pendiente en el taller de mantenimiento.`);
    } else {
      setObservations(`Vehículo inspeccionado bajo las ${QUESTIONS.length} normas del estándar de seguridad preoperacional. Se encuentra en condiciones óptimas y estables para operación regular.`);
    }
  };

  // REAL SUPABASE DATABASE SUBMISSION
  const handleSubmitInspection = async () => {
    if (!operatorUuid || !vehicleUuid) {
      setSubmitError('Faltan identificadores únicos obligatorios del conductor o vehículo.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const payloadId = generateUUID();

    try {
      // 1. Resolve route primary ID and UUID
      const routeId =
        rutaSeleccionada?.id_ruta ??
        rutaSeleccionada?.id ??
        rutaSeleccionada?.ruta_id ??
        rutaSeleccionada?.uuid ??
        null;

      const routeCode =
        rutaSeleccionada?.nume_ruta ??
        rutaSeleccionada?.codigo_ruta ??
        null;

      const routeUuid =
        routeId && isUUID(routeId)
          ? routeId
          : rutaSeleccionada?.id && isUUID(rutaSeleccionada.id)
          ? rutaSeleccionada.id
          : rutaSeleccionada?.id_ruta && isUUID(rutaSeleccionada.id_ruta)
          ? rutaSeleccionada.id_ruta
          : null;

      console.log('[Inspección Submission] Identificadores de Ruta:', {
        routeId,
        routeCode,
        routeUuid,
        rawRuta: rutaSeleccionada
      });

      // 2. Build dynamic checklist payload mapping
      const checklistPayload: Record<string, boolean> = {};
      QUESTIONS.forEach(q => {
        checklistPayload[q.dbKey] = checklist[q.id] !== false;
      });

      // 3. Build complete insertion payload ensuring route ID is populated
      const horaInicioCapturada = sessionStorage.getItem('horaInicioPreoperacional');

      const payload: Record<string, any> = {
        id_inspeccion: payloadId,
        vehiculo_id: vehicleUuid,
        operador_id: operatorUuid,
        kilometraje: parseInt(odometer),
        hora_inicio: horaInicioCapturada || new Date().toISOString(),
        // Send route identifiers to all standard schema candidate columns
        id_ruta: routeUuid || routeId || null,
        ruta_id: routeUuid || routeId || null,
        ruta_asignada: routeUuid || routeId || routeCode || null,
        observaciones_hallazgos: observations.trim() || null,
        exp_extintor_1: vencimientoExtintor1 || null,
        exp_extintor_2: vencimientoExtintor2 || null,
        // 22 Preoperacional checklist criteria
        ...checklistPayload
      };

      // OFFLINE BRANCH: Capture inspection local queue
      if (!isOnline) {
        console.log('[Offline-First] Red fuera de servicio. Encolando preoperacional localmente:', payloadId);

        let queue: any[] = [];
        try {
          const stored = localStorage.getItem('inspecciones_pendientes_sync');
          if (stored) {
            queue = JSON.parse(stored);
            if (!Array.isArray(queue)) queue = [];
          }
        } catch (e) {
          console.error('Error reading offline queue:', e);
        }

        queue.push({
          id_inspeccion: payloadId,
          payload,
          routeDetails: { routeId, routeCode, routeUuid },
          timestamp: new Date().toISOString()
        });

        localStorage.setItem('inspecciones_pendientes_sync', JSON.stringify(queue));
        setPendingSyncCount(queue.length);
        sessionStorage.removeItem('horaInicioPreoperacional');

        const offlineId = `OFF-${payloadId.slice(0, 4).toUpperCase()}`;
        setIdRegistro(offlineId);
        setSubmitSuccessId(offlineId);
        setIdInspeccion(offlineId);
        setSavedFecha(new Date().toISOString());
        setStep('success');
        setIsSubmitting(false);
        return;
      }

      console.log('Insertando planilla en inspecciones_preoperacionales con ID único:', payloadId);

      const insertResponse = await insertInspectionWithAdaptiveSchema(
        activeSupabase,
        payload,
        { routeId, routeCode, routeUuid }
      );

      const { data, error } = insertResponse;

      if (error) {
        throw new Error(error.message);
      }

      sessionStorage.removeItem('horaInicioPreoperacional');

      const verifiedId = data ? (data.codigo_preoperacional || data.id_inspeccion) : `REG-${Date.now().toString().slice(-4)}`;

      setIdRegistro(verifiedId);
      setSubmitSuccessId(verifiedId);
      setIdInspeccion(verifiedId);
      setSavedFecha(data ? (data.created_at || data.fecha_creacion) : new Date().toISOString());

      setIsSubmitting(false);
      setStep('success');

    } catch (err: any) {
      console.error('Error al insertar en Supabase:', err);
      const rawErrorMsg = (err?.message || '').toLowerCase();
      
      // Manejo específico para el trigger de validación de kilometraje / odómetro
      if (
        rawErrorMsg.includes('kilometraje') || 
        rawErrorMsg.includes('límite') || 
        rawErrorMsg.includes('limite') ||
        rawErrorMsg.includes('odometro') ||
        rawErrorMsg.includes('odómetro')
      ) {
        setSubmitError(
          'Error en el Odómetro: El kilometraje ingresado es ilógico. No puede ser menor al registrado ayer, ni superar los 300 km de recorrido. Verifique el tablero del bus.'
        );
      } else {
        setSubmitError(err.message || 'Error de comunicación de datos con el servidor.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateBypass = () => {
    setSubmitError(null);
    const simulatedId = `REG-LOC-${Date.now().toString().slice(-4)}`;
    setIdRegistro(simulatedId);
    setSubmitSuccessId(simulatedId);
    setIdInspeccion(simulatedId);
    setSavedFecha(new Date().toISOString());
    setStep('success');
  };

  const failsCount = (checklistState: Record<number, boolean>) => {
    return QUESTIONS.filter(q => checklistState[q.id] === false).length;
  };

  const handleResetApp = () => {
    setDriverId('');
    setOperatorUuid(null);
    setOperatorName(null);
    setOperatorError(null);
    setNumeroBus('');
    setVehicleUuid(null);
    setVehiclePlate(null);
    setVehicleTipo(null);
    setVencimientoExtintor1('');
    setVencimientoExtintor2('');
    setVehicleError(null);
    setOdometer('');
    const initial: Record<number, boolean> = {};
    QUESTIONS.forEach(q => {
      initial[q.id] = true;
    });
    setChecklist(initial);
    setHasScrolledToBottom(false);
    setObservations('');
    setValidationError(null);
    setSubmitError(null);
    setSubmitSuccessId(null);
    setIdRegistro('');
    setIdInspeccion('');
    setUltimoKm(null);
    setVehicleDocs(null);
    setStep(1);
  };

  const isLight = theme === 'light';

  const bgStyle = isLight 
    ? 'bg-white text-slate-900' 
    : 'bg-black text-zinc-150';
  
  const textWhite = isLight 
    ? 'text-slate-900 font-extrabold' 
    : 'text-white';
  
  const textMuted = isLight 
    ? 'text-slate-800 font-extrabold' 
    : 'text-zinc-400 font-medium';
  
  const cardBg = isLight 
    ? 'bg-slate-50 border border-slate-205 shadow-xs text-slate-900' 
    : 'bg-zinc-950/50 border border-zinc-800 text-zinc-100';
  
  const focusBorder = isLight 
    ? 'focus:border-blue-600 focus:ring-1 focus:ring-blue-200 border-slate-205' 
    : 'focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-550/20 border-zinc-800';

  return (
    <div className={`w-full min-h-screen ${bgStyle} flex flex-col justify-between overflow-x-hidden font-sans relative select-none transition-colors duration-300`}>
      {/* GLARIFYING SOLAR OVERLAYS */}
      {!isLight && (
        <>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-full filter blur-3xl pointer-events-none" />
        </>
      )}

      {/* TOP STATUS BAR (SMARTPHONE REPLICA) */}
      <header className={`w-full py-3 px-6 shrink-0 z-50 flex items-center justify-between text-[11px] font-mono tracking-wider transition-colors duration-300 ${
        isLight 
          ? 'bg-slate-100 border-b border-slate-200 text-slate-800 shadow-xs' 
          : 'bg-black/50 border-b border-white/5 text-slate-400'
      }`}>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`} />
          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white/90'}`}>{currentTime || '12:00 PM'}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span className={`font-bold uppercase tracking-widest text-[10px] ${isLight ? 'text-slate-800' : 'text-emerald-400'}`}>PATIOS DIGITAL</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme switcher: Sol / Noche */}
          <button 
            type="button"
            onClick={toggleTheme}
            className={`px-3 py-1 rounded text-[9px] font-extrabold border transition-all flex items-center gap-1 cursor-pointer tracking-wider ${
              isLight 
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm' 
                : 'bg-slate-850 text-slate-300 hover:bg-slate-800 border-slate-705'
            }`}
          >
            <Sun className="w-2.5 h-2.5" />
            <span>{isLight ? 'NOCHE' : 'SOL (PATIO)'}</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`px-2 py-0.5 rounded text-[9px] font-extrabold border transition-all flex items-center gap-1 cursor-pointer ${
                isLight 
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-105 hover:text-rose-900 font-black' 
                  : 'border-rose-900 bg-rose-955/35 text-rose-300 hover:bg-rose-900 hover:text-white'
              }`}
            >
              <LogOut className="w-2.5 h-2.5" />
              <span>SALIR</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT: Centered phone layout max-w-md, expanded entirely on mobile screens */}
      <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-start px-5 pt-4 pb-8 relative z-20">
        
        {/* INDICADOR OFFLINE O SINCRONIZACIÓN AUTOMÁTICA EN SEGUNDO PLANO */}
        {!isOnline && (
          <div className={`mb-4 p-3 rounded-2xl border flex items-start gap-2.5 transition-all animate-bounce ${
            isLight 
              ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm' 
              : 'bg-rose-950/20 border border-rose-900/30 text-rose-350'
          }`} id="offline-signal-banner">
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-rose-600' : 'text-rose-450'}`} />
            <div className="space-y-0.5">
              <h5 className="font-extrabold text-[11px] uppercase tracking-wide">Modo Fuera de Línea Activo</h5>
              <p className="text-[10px] leading-relaxed font-semibold opacity-90">
                Tu señal es inestable o nula. No te preocupes: diligencia tu preoperacional normalmente y lo guardaremos de forma segura en tu teléfono para enviarla tan pronto vuelvas a tener señal en los patios.
              </p>
            </div>
          </div>
        )}

        {pendingSyncCount > 0 && isOnline && (
          <div className={`mb-4 p-3 rounded-2xl border flex items-center justify-between transition-all ${
            isLight 
              ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm' 
              : 'bg-amber-950/20 border border-amber-805/30 text-amber-300'
          }`} id="sync-pending-signal">
            <div className="flex items-start gap-2.5">
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              )}
              <div className="space-y-0.5">
                <h5 className="font-black text-[11px] uppercase tracking-wide">
                  {isSyncing ? 'Sincronizando inspecciones...' : 'Registros pendientes por subir'}
                </h5>
                <p className="text-[10px] font-semibold opacity-90">
                  Tienes {pendingSyncCount} {pendingSyncCount === 1 ? 'inspección preoperacional' : 'inspecciones preoperacionales'} guardadas sin subir.
                </p>
              </div>
            </div>
            
            {!isSyncing && (
              <button
                type="button"
                onClick={triggerSyncQueue}
                className="px-2.5 py-1.5 bg-amber-200 hover:bg-amber-250 text-amber-955 rounded-xl text-[10px] font-extrabold transition-all border border-amber-400 cursor-pointer"
              >
                Subir Ahora
              </button>
            )}
          </div>
        )}

        {/* LOGISTICS BRAND CONTAINER */}
        <div className={`flex flex-col gap-3 pb-3.5 mb-4 border-b ${isLight ? 'border-slate-350' : 'border-slate-800/80'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 text-[10px] font-extrabold tracking-widest rounded border uppercase ${
                isLight 
                  ? 'bg-blue-50 text-blue-700 border-blue-300' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                Norma SURA
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
                isLight 
                  ? 'bg-slate-100 text-slate-800 border-slate-300' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
              }`}>
                Vía Segura
              </span>
            </div>
            
            <div className="text-right font-mono">
              <span className="text-[9px] text-slate-500 block uppercase font-bold">DESPACHO</span>
              <span className="text-xs font-black text-rose-500 tracking-wider uppercase">
                {step === 'success' ? 'LISTO' : `PASO ${step} / 3`}
              </span>
            </div>
          </div>

          {/* Authenticated/Identified Operator Profile card */}
          {(operatorSession || operatorName) && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                isLight 
                  ? 'bg-slate-50 border border-slate-205 shadow-sm' 
                  : 'bg-zinc-950 border border-zinc-800'
              }`}
            >
              <div className={`p-2 rounded-full shrink-0 flex items-center justify-center ${
                isLight 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-black uppercase tracking-wide truncate ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {(operatorSession?.nombres_apellidos || operatorSession?.nombre || operatorName || '').toUpperCase()}
                </span>
                <span className={`text-[10px] font-bold tracking-wider uppercase block mt-0.5 ${
                  isLight ? 'text-blue-600 font-black' : 'text-emerald-400'
                }`}>
                  {(operatorSession?.cargo || 'OPERADOR DE BUS').toUpperCase()}
                </span>
                <span className={`text-[10px] font-semibold tracking-wider uppercase block mt-0.5 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'
                }`}>
                  C.C. {operatorSession?.cedula || operatorSession?.identificacion || driverId || 'N/D'}
                </span>
              </div>
            </motion.div>
          )}

          <h2 className={`text-lg font-black tracking-tight mt-1.5 ${textWhite}`}>
            Planilla Preoperacional
          </h2>
        </div>



        <AnimatePresence mode="wait">

          {/* STEP 1: IDENTIFICATION & HARD SUPABASE LOOKUP */}
          {step === 1 && (
            <motion.form
              key="step1-view"
              onSubmit={handleContinueToStep2}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="flex-1 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-5">
                
                {/* VEHICLE TC CODE BLOCK */}
                <div className="space-y-2" id="vehicle-tc-validated">
                  <div className="flex justify-between items-center px-1">
                    <label className={`text-xs font-extrabold uppercase tracking-wider ${textMuted}`}>
                      TC del Vehículo <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">EJ: 1102, 1145</span>
                  </div>

                  <div className="flex items-stretch gap-2.5">
                    <div className="relative flex-grow">
                      <Bus className={`absolute left-4.5 top-4.5 w-6 h-6 z-10 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                      <input
                        type="text"
                        required
                        placeholder="Ej: 1102"
                        value={numeroBus}
                        onChange={(e) => setNumeroBus(e.target.value)}
                        disabled={vehicleUuid !== null}
                        autoFocus
                        className={`w-full pl-13 pr-12 py-4.5 border-2 rounded-3xl font-mono text-lg font-bold tracking-widest text-center focus:outline-none transition-all uppercase ${
                          vehicleUuid 
                            ? isLight 
                              ? 'border-blue-600 text-blue-800 bg-blue-50' 
                              : 'border-amber-404/50 text-amber-405 bg-zinc-950/60' 
                            : isLight 
                              ? 'bg-slate-50 border-slate-205 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-105 placeholder:text-slate-400' 
                              : 'bg-zinc-950/60 border-zinc-850 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-zinc-650'
                        }`}
                      />
                      {vehicleUuid && (
                        <button
                          type="button"
                          onClick={handleClearVehicle}
                          className={`absolute right-3 top-3.5 w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full font-mono active:scale-90 ${
                            isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-zinc-800 text-zinc-350 hover:text-white'
                          }`}
                          title="Cambiar Vehículo"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {!vehicleUuid && (
                      <button
                        type="button"
                        onClick={validarVehiculoManual}
                        disabled={isSearchingVehicle || numeroBus.trim().length === 0}
                        className={`px-5 py-3.5 font-bold text-xs uppercase tracking-wider rounded-3xl shrink-0 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                          isLight 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isSearchingVehicle ? (
                          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Search className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isSearchingVehicle ? 'Buscando' : 'Validar'}</span>
                      </button>
                    )}
                  </div>

                  {/* VEHICLE LOOKUP FEEDBACK */}
                  <div className="mt-1.5 min-h-[45px]">
                    {isSearchingVehicle && (
                      <div className={`py-2.5 px-4 border border-dashed rounded-2xl flex items-center gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-700' : 'bg-zinc-950 border-zinc-800 text-emerald-400'
                      }`}>
                        <RefreshCw className={`w-4 h-4 animate-spin ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                        <span className="text-xs font-semibold font-mono">Buscando vehículo...</span>
                      </div>
                    )}

                    {vehiclePlate && (
                      <div className={`py-4.5 px-5 rounded-3xl flex items-center gap-3.5 shadow-xl font-bold animate-scaleIn ${
                        isLight ? 'bg-blue-600 text-white' : 'bg-amber-400 text-black'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isLight ? 'bg-white/20' : 'bg-black/10'}`}>
                          <Check className={`w-5 h-5 stroke-[3] ${isLight ? 'text-white' : 'text-black'}`} />
                        </div>
                        <div className="overflow-hidden w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className={`text-[10px] uppercase tracking-wider font-extrabold block ${isLight ? 'text-blue-105' : 'text-black/70'}`}>Bus Identificado</span>
                            <span className={`text-[8.5px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full font-black ${isLight ? 'bg-blue-700 text-blue-100' : 'bg-black/20 text-black'}`}>Conexión TC BD</span>
                          </div>
                          <span className="text-base font-extrabold tracking-wide block">PLACA: {vehiclePlate} <span className={`font-normal text-xs font-mono ${isLight ? 'text-blue-105' : 'text-black/80'}`}>(Código: TC{numeroBus})</span></span>
                        </div>
                      </div>
                    )}

                    {/* Document Traffic-Light Control Center */}
                    {vehiclePlate && vehicleDocs && (
                      <div className={`mt-3 rounded-3xl p-4.5 space-y-3.5 shadow-lg animate-fadeIn ${cardBg}`}>
                        <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-slate-205' : 'border-zinc-800'}`}>
                          <ShieldCheck className={`w-4.5 h-4.5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                          <span className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-zinc-300'}`}>Semáforo de Control y Documental Sura</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {renderDocumentStatus("SOAT", vehicleDocs.estado_soat, vehicleDocs.vencimiento_soat)}
                          {renderDocumentStatus("RTM (Técno-Mecánica)", vehicleDocs.estado_rtm, vehicleDocs.rtm_vencimiento)}
                          {renderDocumentStatus("RCC Contractual", vehicleDocs.estado_rcc, vehicleDocs.vencimiento_rcc)}
                          {renderDocumentStatus("RCE Extracontractual", vehicleDocs.estado_rce, vehicleDocs.vencimiento_rce)}
                        </div>
                      </div>
                    )}

                    {vehicleError && (
                      <div className={`py-3 px-4 border-2 rounded-2xl flex items-center gap-2.5 animate-shake ${
                        isLight ? 'bg-rose-50 border-rose-350 text-rose-955 font-extrabold' : 'bg-rose-955/20 border-rose-550/30 text-rose-303'
                      }`}>
                        <AlertCircle className={`w-4.5 h-4.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-450'}`} />
                        <span className="text-xs font-semibold">{vehicleError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTROL DE VENCIMIENTO DE EXTINTORES */}
                <div className={`p-4.5 sm:p-5 rounded-3xl border-2 space-y-4 shadow-md transition-all ${
                  isLight ? 'bg-amber-50/40 border-amber-200/80' : 'bg-zinc-950/70 border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between border-b pb-3 border-amber-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isLight ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <Flame className="w-4.5 h-4.5 fill-current" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                          Vencimiento de Extintores
                        </h4>
                        <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                          Control de recarga de extintores de 10 lbs
                        </p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      isLight ? 'bg-amber-200/80 text-amber-900' : 'bg-amber-900/40 text-amber-300 border border-amber-800/40'
                    }`}>
                      2 EXTINTORES
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* EXTINTOR 1 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className={`text-[11px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                          Extintor 1 <span className="text-rose-500">*</span>
                        </label>
                        {vencimientoExtintor1 && (
                          <span className={`text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full ${
                            getExtintorStatus(vencimientoExtintor1).color === 'emerald'
                              ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/60 text-emerald-300'
                              : getExtintorStatus(vencimientoExtintor1).color === 'amber'
                              ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/60 text-amber-300'
                              : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950/60 text-rose-300'
                          }`}>
                            {getExtintorStatus(vencimientoExtintor1).text}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Calendar className={`absolute left-3.5 top-3.5 w-5 h-5 pointer-events-none ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                        <input
                          type="date"
                          required
                          value={vencimientoExtintor1}
                          onChange={(e) => setVencimientoExtintor1(e.target.value)}
                          className={`w-full pl-11 pr-3 py-3 rounded-2xl font-mono text-xs font-bold focus:outline-none transition-all border-2 ${
                            isLight 
                              ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600' 
                              : 'bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* EXTINTOR 2 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className={`text-[11px] font-extrabold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                          Extintor 2 <span className="text-rose-500">*</span>
                        </label>
                        {vencimientoExtintor2 && (
                          <span className={`text-[9.5px] font-black uppercase px-2 py-0.2 rounded-full ${
                            getExtintorStatus(vencimientoExtintor2).color === 'emerald'
                              ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-950/60 text-emerald-300'
                              : getExtintorStatus(vencimientoExtintor2).color === 'amber'
                              ? isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-950/60 text-amber-300'
                              : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-950/60 text-rose-300'
                          }`}>
                            {getExtintorStatus(vencimientoExtintor2).text}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Calendar className={`absolute left-3.5 top-3.5 w-5 h-5 pointer-events-none ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                        <input
                          type="date"
                          required
                          value={vencimientoExtintor2}
                          onChange={(e) => setVencimientoExtintor2(e.target.value)}
                          className={`w-full pl-11 pr-3 py-3 rounded-2xl font-mono text-xs font-bold focus:outline-none transition-all border-2 ${
                            isLight 
                              ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600' 
                              : 'bg-zinc-900 border-zinc-800 text-white focus:border-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RUTA FIELD */}
                <div className="space-y-2" id="route-validated">
                  <div className="flex justify-between items-center px-1">
                    <label className={`text-xs font-extrabold uppercase tracking-wider ${textMuted}`}>
                      Ruta Asignada <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">EJ: T101, X102, A101</span>
                  </div>

                  <div className="flex items-stretch gap-2.5">
                    <div className="relative flex-grow">
                      <Search className={`absolute left-4.5 top-4.5 w-6 h-6 z-10 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                      <input
                        type="text"
                        required
                        placeholder="Ej: T101"
                        value={codigoRuta || ''}
                        onChange={(e) => setCodigoRuta(e.target.value)}
                        disabled={rutaSeleccionada !== null}
                        className={`w-full pl-13 pr-12 py-4.5 border-2 rounded-3xl font-mono text-lg font-bold tracking-widest text-center focus:outline-none transition-all uppercase ${
                          rutaSeleccionada 
                            ? isLight 
                              ? 'border-blue-600 text-blue-800 bg-blue-50' 
                              : 'border-emerald-500/50 text-emerald-400 bg-zinc-950/60' 
                            : isLight 
                              ? 'bg-slate-50 border-slate-205 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-105 placeholder:text-slate-400' 
                              : 'bg-zinc-950/60 border-zinc-850 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-zinc-650'
                        }`}
                      />
                      {rutaSeleccionada && (
                        <button
                          type="button"
                          onClick={handleClearRoute}
                          className={`absolute right-3 top-3.5 w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full font-mono active:scale-90 ${
                            isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-zinc-800 text-zinc-350 hover:text-white'
                          }`}
                          title="Cambiar Ruta"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {!rutaSeleccionada && (
                      <button
                        type="button"
                        onClick={validarRutaManual}
                        disabled={isSearchingRoute || codigoRuta.trim().length === 0}
                        className={`px-5 py-3.5 font-bold text-xs uppercase tracking-wider rounded-3xl shrink-0 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                          isLight 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md hover:shadow-lg'
                        }`}
                      >
                        {isSearchingRoute ? (
                          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Search className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isSearchingRoute ? 'Buscando' : 'Validar'}</span>
                      </button>
                    )}
                  </div>

                  {/* ROUTE LOOKUP FEEDBACK */}
                  <div className="mt-1.5 min-h-[45px]">
                    {isSearchingRoute && (
                      <div className={`py-2.5 px-4 border border-dashed rounded-2xl flex items-center gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-705 shadow-sm' : 'bg-zinc-950 border-zinc-800 text-emerald-400'
                      }`}>
                        <RefreshCw className={`w-4 h-4 animate-spin ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                        <span className="text-xs font-semibold font-mono">Buscando ruta...</span>
                      </div>
                    )}

                    {rutaSeleccionada && (
                      <div className={`py-4.5 px-5 rounded-3xl flex items-center gap-3.5 border shadow-sm font-bold animate-scaleIn ${
                        isLight 
                          ? 'bg-indigo-50/50 border-indigo-100' 
                          : 'bg-indigo-950/20 border-indigo-900/40'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-900/50 text-indigo-400'
                        }`}>
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                        <div className="overflow-hidden w-full">
                          <div className="flex justify-between items-center w-full">
                            <span className={`text-[10px] uppercase tracking-wider font-semibold block ${
                              isLight ? 'text-slate-500' : 'text-indigo-300'
                            }`}>Ruta Autorizada</span>
                            <span className={`text-[8.5px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full font-black ${
                              isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/40 text-indigo-300 border border-indigo-800/30'
                            }`}>CONEXIÓN BD</span>
                          </div>
                          <span className={`text-sm font-extrabold tracking-wide block uppercase mt-0.5 ${
                            isLight ? 'text-indigo-950' : 'text-zinc-100'
                          }`}>
                            Destino: {rutaSeleccionada.sitio_ru || 'No especificado'} <span className={`text-xs font-mono font-bold ${
                              isLight ? 'text-indigo-600' : 'text-indigo-400'
                            }`}>({rutaSeleccionada.nume_ruta})</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {routeError && (
                      <div className={`py-3 px-4 border-2 rounded-2xl flex items-center gap-2.5 animate-shake ${
                        isLight ? 'bg-rose-50 border-rose-350 text-rose-955 font-extrabold' : 'bg-rose-955/20 border-rose-550/30 text-rose-303'
                      }`}>
                        <AlertCircle className={`w-4.5 h-4.5 shrink-0 ${isLight ? 'text-rose-600' : 'text-rose-450'}`} />
                        <span className="text-xs font-semibold">{routeError}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KILOMETRAJE ODOMETER INPUT */}
                <div className="space-y-2" id="odometer-milestone">
                  <div className="flex justify-between items-center px-1">
                    <label className={`text-xs font-extrabold uppercase tracking-wider ${textMuted}`}>
                      Kilometraje de Despacho (Odómetro) <span className="text-rose-500">*</span>
                    </label>
                    {ultimoKm !== null && ultimoKm > 0 ? (
                      <span className="text-[13px] text-emerald-400 font-mono font-bold" style={{ width: '127.846px', fontSize: '13px' }}>
                        Último Guardado: {ultimoKm} KM
                      </span>
                    ) : (
                      <span className="text-[13px] text-zinc-500 font-mono font-bold" style={{ width: '127.846px', fontSize: '13px' }}>REGISTRO INICIAL</span>
                    )}
                  </div>

                  <div className="relative">
                    <Gauge className={`absolute left-4.5 top-4.5 w-6 h-6 z-10 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder={ultimoKm ? `Mínimo recomendado: ${ultimoKm}` : "Ingrese kilometraje actual"}
                      value={odometer}
                      onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
                      className={`w-full pl-13 pr-14 py-4.5 border-2 rounded-3xl font-mono text-lg font-bold tracking-widest text-center focus:outline-none transition-all ${
                        (isMileageLowerThanLast || isMileageExcessive) 
                          ? isLight 
                            ? 'border-rose-500 text-rose-800 bg-rose-50 placeholder:text-rose-455 focus:border-rose-600' 
                            : 'border-rose-550 text-rose-400 bg-zinc-950/20 focus:border-rose-500 placeholder:text-rose-700/50' 
                          : odometer.trim() !== '' && !isMileageLowerThanLast && !isMileageExcessive
                            ? isLight 
                              ? 'border-emerald-600 text-emerald-850 bg-emerald-50' 
                              : 'border-emerald-500 text-emerald-405 bg-zinc-950/60'
                            : isLight 
                              ? 'bg-slate-50 border-slate-205 text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-105 placeholder:text-slate-400' 
                              : 'bg-zinc-950/60 border-zinc-850 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 placeholder:text-zinc-650'
                      }`}
                    />
                    <span className="absolute right-4.5 top-5.5 text-sm font-black text-zinc-500 font-mono">KM</span>
                  </div>

                  {isMileageLowerThanLast && (
                    <div className={`mt-1 text-xs font-semibold flex items-center gap-1.5 animate-shake p-2.5 border-2 rounded-3xl ${
                      isLight ? 'bg-rose-50 border-rose-350 text-rose-955' : 'bg-rose-955/20 border-rose-500/35 text-rose-400'
                    }`}>
                      <AlertTriangle className={`w-4.5 h-4.5 shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-500'}`} />
                      <span>Alerta de seguridad: El kilometraje ingresado no puede ser menor al último guardado ({ultimoKm} KM). Ajuste la cifra.</span>
                    </div>
                  )}

                  {isMileageExcessive && (
                    <div className={`mt-1 text-xs font-semibold flex items-center gap-1.5 animate-shake p-2.5 border-2 rounded-3xl ${
                      isLight ? 'bg-rose-50 border-rose-350 text-rose-955' : 'bg-rose-955/20 border-rose-500/35 text-rose-400'
                    }`}>
                      <AlertTriangle className={`w-4.5 h-4.5 shrink-0 ${isLight ? 'text-rose-700' : 'text-rose-500'}`} />
                      <span>Alerta de odómetro: El kilometraje ingresado excede el límite permitido por despacho (+100 KM máx).</span>
                    </div>
                  )}
                </div>

              </div>

              {/* ACTION AREA: Errors and Step Transition Trigger */}
              <div className="space-y-4 pt-4">
                
                {validationError && (
                  <div className={`p-3.5 border-2 rounded-3xl flex items-center gap-2.5 text-xs font-medium ${
                    isLight ? 'bg-rose-50 border-rose-250 text-rose-955' : 'bg-rose-955/20 border-rose-500/25 text-rose-300'
                  }`}>
                    <AlertCircle className={`w-5 h-5 shrink-0 ${isLight ? 'text-rose-650' : 'text-rose-450'}`} />
                    <p className="leading-tight">{validationError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!isStep1Valid}
                  className={`w-full py-5 font-black tracking-wider text-xs rounded-4xl cursor-pointer flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 outline-none ${
                    isStep1Valid 
                      ? isLight 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10' 
                        : 'bg-emerald-500 text-black hover:bg-emerald-450 shadow-emerald-500/10'
                      : isLight 
                        ? 'bg-slate-100 border border-slate-205 text-slate-405 cursor-not-allowed' 
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-655 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                  <span>CONTINUAR A CHECKLIST DE SEGURIDAD</span>
                  <ArrowRight className="w-5 h-5 stroke-[3.5] ml-1" />
                </button>

                {isMileageExcessive && (
                  <div className="text-center px-4 py-2 mt-1 rounded-2xl bg-rose-50 dark:bg-rose-955/10 border border-rose-200 dark:border-rose-900/40 animate-pulse">
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 leading-normal">
                      ⚠️ El kilometraje ingresado excede el límite permitido por despacho (máximo 100 km adicionales). Máximo permitido: {ultimoKm ? (ultimoKm + 100) : 'N/A'} KM.
                    </p>
                  </div>
                )}
              </div>

            </motion.form>
          )}

          {/* STEP 2: SURA 14 VIAL SAFETY QUESTIONS */}
          {step === 2 && (
            <motion.div
              key="step2-view"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex-1 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                
                {/* Stats board overview */}
                <div className={`flex justify-between items-center p-4 rounded-3xl ${isLight ? 'bg-slate-100 border border-slate-300/80 text-slate-900' : 'bg-slate-900/95 border border-slate-800'}`}>
                  <div>
                    <span className={`text-[10px] font-mono uppercase block font-bold ${isLight ? 'text-slate-705' : 'text-slate-500'}`}>Respondidas</span>
                    <span className={`text-sm font-extrabold ${isLight ? 'text-slate-950' : 'text-white'}`}>{answeredCount} / {QUESTIONS.length}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-mono uppercase block font-bold ${isLight ? 'text-slate-705' : 'text-slate-500'}`}>Novedades</span>
                    <span className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded-lg ${currentFailsCount > 0 ? (isLight ? 'bg-red-100 border border-red-400 text-red-700 font-black animate-pulse' : 'bg-red-950 border border-red-500/20 text-red-404 animate-pulse') : (isLight ? 'text-emerald-700 bg-emerald-100 font-extrabold' : 'text-emerald-400 bg-emerald-950/40')}`}>
                      {currentFailsCount} {currentFailsCount === 1 ? 'Novedad' : 'Novedades'}
                    </span>
                  </div>
                </div>

                {/* Vertical Questions array container */}
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="space-y-4 h-[calc(100vh-220px)] min-h-[350px] overflow-y-auto pr-1 text-slate-900 dark:text-zinc-100"
                >
                  {QUESTIONS.map((question, index) => {
                    const ans = checklist[question.id];
                    const isYes = ans === true;
                    const isNo = ans === false;

                    return (
                      <div 
                        key={question.id}
                        className={`p-4 rounded-3xl transition-all duration-200 border-2 ${
                          isYes 
                            ? isLight 
                              ? 'bg-emerald-50/50 border-emerald-550' 
                              : 'bg-emerald-950/10 border-emerald-500/30' 
                            : isNo 
                            ? isLight 
                              ? 'bg-rose-50/50 border-red-550' 
                              : 'bg-red-955/20 border-red-500/30 ring-2 ring-red-500/10' 
                            : isLight 
                            ? 'bg-white border-slate-300' 
                            : 'bg-slate-900/40 border-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          {(() => {
                            const cat = (question.category || '').toLowerCase().trim();
                            let iconEl = null;
                            const iconClass = isLight ? 'text-blue-600' : 'text-emerald-400';

                            if (cat.includes('operador') || cat.includes('conductor') || cat.includes('salud')) {
                              iconEl = <User className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('exterior')) {
                              iconEl = <Bus className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('motor')) {
                              iconEl = <Wrench className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('freno')) {
                              iconEl = <AlertCircle className={`w-3.5 h-3.5 ${iconClass} animate-pulse`} />;
                            } else if (cat.includes('luces') || cat.includes('visibilidad') || cat.includes('parabrisas')) {
                              iconEl = <Sun className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('cabina')) {
                              iconEl = <Sliders className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('carrocer') || cat.includes('puerta') || cat.includes('rampa') || cat.includes('timbre')) {
                              iconEl = <Bus className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('seguridad') || cat.includes('emergen') || cat.includes('angel')) {
                              iconEl = <ShieldCheck className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('recaudo') || cat.includes('torniquete')) {
                              iconEl = <CreditCard className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('document')) {
                              iconEl = <FileText className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else if (cat.includes('chasis') || cat.includes('suspension') || cat.includes('direccion')) {
                              iconEl = <Gauge className={`w-3.5 h-3.5 ${iconClass}`} />;
                            } else {
                              iconEl = <Gauge className={`w-3.5 h-3.5 ${iconClass}`} />;
                            }

                            const catStyle = isLight 
                              ? 'bg-slate-100 border border-slate-300 text-slate-900 font-extrabold shadow-xs' 
                              : 'bg-zinc-950/45 border border-zinc-805 text-emerald-400 font-bold';

                            return (
                              <span className={`px-2.5 py-1.5 rounded-xl text-[10px] tracking-wider uppercase shrink-0 flex items-center gap-1.5 ${catStyle}`}>
                                {iconEl}
                                <span>{question.category}</span>
                              </span>
                            );
                          })()}
                          <span className={`text-xs font-mono font-extrabold ${isLight ? 'text-slate-700' : 'text-slate-500'}`}>
                            Pregunta {index + 1} de {QUESTIONS.length}
                          </span>
                        </div>

                        <h4 className={`text-sm font-extrabold mb-1 ${isLight ? 'text-slate-950' : 'text-white'}`}>
                          {question.text}
                        </h4>
                        <p className={`text-[11px] leading-relaxed font-normal mb-3 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                          {question.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => handleAnswerQuestion(question.id, true)}
                            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all tracking-wider cursor-pointer ${
                              isYes 
                                ? isLight 
                                  ? 'bg-emerald-600 text-white border-2 border-emerald-500 shadow-md font-black'
                                  : 'bg-emerald-500 text-emerald-950 border-2 border-emerald-400 shadow-md shadow-emerald-500/10 scale-[1.01]' 
                                : isLight 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                            }`}
                          >
                            <Check className={`w-4.5 h-4.5 ${isYes ? 'stroke-[2.5]' : (isLight ? 'text-slate-650' : 'text-slate-500')}`} />
                            <span>SÍ (Cumple)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAnswerQuestion(question.id, false)}
                            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all tracking-wider cursor-pointer ${
                              isNo 
                                ? isLight 
                                  ? 'bg-rose-600 text-white border-2 border-rose-550 shadow-md font-black'
                                  : 'bg-red-500 text-red-950 border-2 border-red-445 shadow-md shadow-red-500/10 scale-[1.01]' 
                                : isLight 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                            }`}
                          >
                            <span className={`text-sm ${isNo ? 'text-white font-extrabold' : (isLight ? 'text-slate-650' : 'text-slate-500')}`}>✕</span>
                            <span>NO (Falla)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Navigation Actions */}
              <div className="pt-3 space-y-3">
                {showScrollAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={`p-3.5 text-center text-xs font-black rounded-2xl animate-pulse tracking-wide uppercase border-2 ${
                      isLight 
                        ? 'bg-red-50 border-red-500 text-red-900 shadow-md' 
                        : 'bg-red-955/20 border-red-800/80 text-red-404'
                    }`}
                  >
                    ⚠️ No puede avanzar: Por favor, desplácese y revise todo el checklist de esta sección hasta el final.
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`py-4 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 cursor-pointer border ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700' 
                        : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-805 text-zinc-355'
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={`py-4 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer border ${
                      hasScrolledToBottom 
                        ? isLight 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 active:scale-95 border-blue-650'
                          : 'bg-emerald-500 text-black hover:bg-emerald-450 shadow-md border-emerald-400 active:scale-95'
                        : isLight
                          ? 'bg-slate-200 text-slate-705 hover:bg-slate-300 border-slate-300 border font-extrabold shadow-sm'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-805 border-zinc-800 border font-extrabold shadow-sm'
                    }`}
                  >
                    <span>Siguiente paso</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* STEP 3: DICTAMEN FINAL & SUBMIT TO SUPABASE */}
          {step === 3 && (
            <motion.div
              key="step3-view"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                
                {/* Dictamen summary card */}
                <div className={`p-5 rounded-3xl space-y-2.5 ${cardBg}`}>
                  <h4 className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isLight ? 'text-slate-900 font-black' : 'text-zinc-500'}`}>Consolidado Preoperacional</h4>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>Operador:</span>
                    <span className={`font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>{operatorName}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>Número de Bus / TC:</span>
                    <span className={`font-bold font-mono ${isLight ? 'text-blue-600 font-black' : 'text-emerald-455'}`}>{numeroBus}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs gap-3">
                    <span className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>Ruta:</span>
                    <span className={`font-bold truncate text-right ${isLight ? 'text-slate-950' : 'text-white'}`}>
                      {rutaSeleccionada ? `${rutaSeleccionada.nume_ruta} (${rutaSeleccionada.sitio_ru || 'No especificado'})` : 'Sin asignar'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>Odómetro:</span>
                    <span className={`font-bold font-mono ${isLight ? 'text-slate-950' : 'text-white'}`}>{odometer} KM</span>
                  </div>
                  
                  <div className={`pt-2 border-t flex justify-between items-center text-xs ${isLight ? 'border-slate-200' : 'border-zinc-805/60'}`}>
                    <span className={isLight ? 'text-slate-900 font-extrabold' : 'text-slate-400'}>Diagnóstico SURA:</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9.5px] uppercase ${
                      currentFailsCount > 0 
                        ? isLight 
                          ? 'bg-rose-100 text-rose-800 border-2 border-rose-400 font-black shadow-xs' 
                          : 'bg-rose-955 text-rose-455 border border-rose-900/50' 
                        : isLight 
                          ? 'bg-emerald-150 text-emerald-900 border-2 border-emerald-500 font-black shadow-xs' 
                          : 'bg-emerald-950 text-emerald-404 border border-emerald-900/50'
                    }`}>
                      {currentFailsCount > 0 ? `CON NOVEDAD (${currentFailsCount} FALLAS)` : 'APROBADO SIN NOVEDAD'}
                    </span>
                  </div>
                </div>

                {/* Comments box area */}
                <div className={`${cardBg} rounded-3xl p-4.5 space-y-3`}>
                  <div className="flex justify-between items-center">
                    <label className={`text-xs font-bold block uppercase tracking-wide ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      Observaciones o Hallazgos
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateReport}
                      className={`px-2 py-0.5 border text-[10px] rounded font-bold cursor-pointer transition-colors ${
                        isLight 
                          ? 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-700' 
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      Generar Texto Auto
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="Escriba aquí los detalles correspondientes a novedades, fallas o comentarios adicionales de seguridad vial..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className={`w-full p-3 rounded-xl text-xs resize-none font-sans leading-relaxed border focus:outline-none ${
                      isLight 
                        ? 'bg-slate-50 border-slate-202 text-slate-900 focus:border-blue-650 placeholder:text-slate-400' 
                        : 'bg-zinc-950/50 border-zinc-805 text-white focus:border-emerald-500 placeholder:text-zinc-650'
                    }`}
                  />
                  <p className="text-[10px] text-slate-550 leading-tight">
                    * El texto se transmitirá firmado digitalemente a la base de datos central de patios.
                  </p>
                </div>

              </div>

              {/* Action submission buttons */}
              <div className="space-y-4 pt-2">
                {submitError && (
                  <div className="space-y-3">
                    {(submitError.toLowerCase().includes('row-level security') || 
                      submitError.toLowerCase().includes('rls') || 
                      submitError.toLowerCase().includes('policy')) ? (
                      <div className={`p-4 border-2 text-xs rounded-2xl flex flex-col gap-2.5 ${
                        isLight ? 'bg-rose-50 border-rose-250 text-rose-955' : 'bg-rose-955/20 border-rose-500/25 text-rose-300'
                      }`}>
                        <div className="flex items-center gap-2.5 font-bold">
                          <AlertCircle className={`w-5 h-5 shrink-0 ${isLight ? 'text-rose-650' : 'text-rose-450'}`} />
                          <span className="text-[13px] tracking-tight">Error de Seguridad (RLS) en Base de Datos</span>
                        </div>
                        <p className="leading-relaxed opacity-90 text-[11px]">
                          El registro falló debido a una política de Seguridad a Nivel de Fila (RLS) en la tabla <strong className="font-mono bg-black/10 px-1 py-0.5 rounded">inspecciones_preoperacionales</strong> de Supabase.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          La tabla tiene activa una política restrictiva o ninguna política para usuarios no autenticados en Supabase Auth (como el inicio de sesión de operadores mediante RPC). Corrígelo con este DDL SQL o simula de forma local.
                        </p>

                        <div className={`mt-1 p-2.5 rounded-xl text-[9px] font-mono select-all overflow-x-auto border ${
                          isLight ? 'bg-white border-slate-205 text-slate-800' : 'bg-black/40 border-zinc-800 text-zinc-300'
                        }`}>
{`ALTER TABLE public.inspecciones_preoperacionales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserciones publicas" 
ON public.inspecciones_preoperacionales 
FOR INSERT TO anon, authenticated, public
WITH CHECK (true);

CREATE POLICY "Permitir lecturas publicas" 
ON public.inspecciones_preoperacionales 
FOR SELECT TO anon, authenticated, public
USING (true);`}
                        </div>

                        <div className="flex gap-2.5 mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const sql = `ALTER TABLE public.inspecciones_preoperacionales ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Permitir inserciones publicas" \nON public.inspecciones_preoperacionales \nFOR INSERT TO anon, authenticated, public\nWITH CHECK (true);\n\nCREATE POLICY "Permitir lecturas publicas" \nON public.inspecciones_preoperacionales \nFOR SELECT TO anon, authenticated, public\nUSING (true);`;
                              navigator.clipboard.writeText(sql);
                              setCopiedSql(true);
                              setTimeout(() => setCopiedSql(false), 2000);
                            }}
                            className={`flex-1 py-2 text-[10.5px] font-black rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              isLight
                                ? 'bg-white hover:bg-slate-50 border-slate-250 text-slate-800 active:bg-slate-100'
                                : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-100 active:bg-zinc-800'
                            }`}
                          >
                            <span>{copiedSql ? '¡Copiado!' : 'Copiar DDL SQL'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSimulateBypass}
                            className="flex-1 py-2 text-[10.5px] font-black rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-850 text-white border border-amber-500/10 flex items-center justify-center gap-1 cursor-pointer transition-all"
                          >
                            <span>Modo Demo (Local)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-3.5 border-2 text-xs font-medium rounded-2xl flex items-center gap-2.5 ${
                        isLight ? 'bg-rose-50 border-rose-250 text-rose-955' : 'bg-rose-955/20 border-rose-500/25 text-rose-300'
                      }`}>
                        <AlertCircle className={`w-5 h-5 shrink-0 ${isLight ? 'text-rose-650' : 'text-rose-450'}`} />
                        <p className="leading-tight">{submitError}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setStep(2)}
                    className={`py-4 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 cursor-pointer transition-colors border ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700' 
                        : 'bg-zinc-955 hover:bg-zinc-900 border-zinc-805 text-zinc-355'
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmitInspection}
                    className={`py-4 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all text-center ${
                      isSubmitting
                        ? isLight
                          ? 'bg-slate-200 text-slate-404 border border-slate-300 cursor-not-allowed opacity-50'
                          : 'bg-zinc-900 hover:bg-zinc-900 text-zinc-650 border border-zinc-805 cursor-not-allowed opacity-40'
                        : isLight 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer'
                          : 'bg-emerald-500 text-black hover:bg-emerald-450 cursor-pointer shadow-md'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className={`w-3.5 h-3.5 animate-spin ${isLight ? 'text-white' : 'text-black'}`} />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className={`w-3.5 h-3.5 ${isLight ? 'text-white fill-white' : 'text-black fill-black'}`} />
                        <span>ENVIAR PLANILLA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </motion.div>
          )}

          {/* SUCCESS DISPATCH REASSURANCE SCREEN */}
          {step === 'success' && (
            <motion.div
              key="success-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col justify-center items-center text-center space-y-6 py-8"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto animate-bounce shadow-lg border ${
                isLight ? 'bg-blue-500/15 border-blue-550/40' : 'bg-emerald-500/15 border border-emerald-500/40'
              }`}>
                <ShieldCheck className={`w-10 h-10 stroke-[2.5] ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className={`text-xl font-black leading-tight ${isLight ? 'text-slate-955' : 'text-white'}`}>
                  {idRegistro.startsWith('OFF-') ? 'Preoperacional Guardado Local' : 'Planilla Enviada con Éxito'}
                </h3>
                <p className={`text-xs max-w-xs mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {idRegistro.startsWith('OFF-') 
                    ? 'Inspección guardada localmente en tu teléfono. Se sincronizará automáticamente al detectar señal.'
                    : 'Inspección guardada y firmada digitalmente en Supabase de Cartagena de manera segura.'}
                </p>
              </div>

              {(() => {
                const getFormattedDateTime = () => {
                  try {
                    const fechaBase = savedFecha || new Date().toISOString();
                    let normalized = fechaBase;
                    if (fechaBase.includes(' ') && !fechaBase.includes('T')) {
                      normalized = fechaBase.replace(' ', 'T');
                    }
                    const fechaObj = new Date(normalized);
                    const fechaFormateada = fechaObj.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    });
                    const horaFormateada = fechaObj.toLocaleTimeString('es-CO', { 
                      hour12: false, 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    });
                    return { fechaFormateada, horaFormateada };
                  } catch (e) {
                    console.error("Error formatting date/time:", e);
                    return { fechaFormateada: '---', horaFormateada: '---' };
                  }
                };

                const { fechaFormateada, horaFormateada } = getFormattedDateTime();
                const containerStyle = isLight 
                  ? 'bg-slate-50 border-slate-202' 
                  : 'bg-zinc-950/50 border-zinc-805';
                
                const labelStyle = isLight
                  ? 'text-blue-600 font-extrabold'
                  : 'text-emerald-400 font-bold';

                const valStyle = isLight
                  ? 'text-slate-900 font-extrabold'
                  : 'text-white font-bold';

                return (
                  <div className={`w-full p-5 rounded-3xl space-y-4 text-left font-sans shadow-xl border ${containerStyle}`}>
                    <div className={`border-b pb-3.5 text-center ${isLight ? 'border-slate-202' : 'border-zinc-800'}`}>
                      <h5 className={`text-[10px] font-extrabold uppercase tracking-widest mb-2 ${isLight ? 'text-blue-600 font-black' : 'text-zinc-500'}`}>
                        NÚMERO DE PLANILLA
                      </h5>
                      <div className={`inline-block px-5 py-2 rounded-2xl ${
                        isLight ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-950/45 border border-emerald-900/40'
                      }`}>
                        <span className={`text-2xl font-black font-mono tracking-wider animate-pulse ${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
                          {idRegistro || 'Cargando...'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2.5 pt-1.5 font-mono text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Operador:</span>
                        <span className={`font-sans truncate text-right ${valStyle}`}>{operatorName}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Número de Bus / TC:</span>
                        <span className={`${valStyle}`}>{numeroBus}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Ruta:</span>
                        <span className={`font-sans truncate text-right ${valStyle}`}>
                          {rutaSeleccionada ? `${rutaSeleccionada.nume_ruta} (${rutaSeleccionada.sitio_ru || 'No especificado'})` : 'Sin asignar'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Odómetro:</span>
                        <span className={`${valStyle}`}>{odometer} KM</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Fecha:</span>
                        <span className={`${valStyle}`}>{fechaFormateada}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`${labelStyle}`}>Hora:</span>
                        <span className={`${valStyle}`}>{horaFormateada}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className={`p-3 rounded-2xl text-[11px] leading-normal text-left flex gap-2 border ${
                isLight ? 'bg-blue-50 border-blue-200 text-blue-805' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}>
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                <span>Puede iniciar ruta de transporte. Presente este comprobante digital al despachador del patio.</span>
              </div>

              <div className="w-full space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="w-full py-4 text-xs font-black tracking-widest rounded-3xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all uppercase text-center"
                >
                  <FileDown className="w-4 h-4" />
                  Descargar Formato PDF (Oficial)
                </button>

                <button
                  type="button"
                  onClick={handleResetApp}
                  className={`w-full py-4 text-xs font-black tracking-widest rounded-3xl border cursor-pointer active:scale-95 transition-all uppercase text-center ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-202 border-slate-205 text-slate-800' 
                      : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}
                >
                  Registrar Otra Planilla
                </button>

                <button
                  type="button"
                  onClick={handleCerrarSesion}
                  className="w-full py-4 text-xs font-black tracking-widest rounded-3xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 border border-red-500 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all uppercase text-center"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión y Salir
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* MOBILE DEVICE BOTTOM MATTE */}
      <footer className={`w-full py-3 text-center shrink-0 text-[10px] font-mono tracking-widest select-none z-30 border-t ${
        isLight 
          ? 'bg-slate-100 border-slate-200 text-slate-505' 
          : 'bg-black border-zinc-900/60 text-zinc-650'
      }`}>
        Cartagena Logística Co. • Despacho Seguro de Patio
      </footer>

      {showPdfModal && (
        <ModalPreoperacionalPDF
          data={{
            codigo: idRegistro || idInspeccion,
            fecha: savedFecha || new Date().toISOString(),
            operador_nombre: operatorName || 'Operador Registrado',
            identificacion: driverId || 'N/D',
            placa: vehiclePlate || 'N/D',
            tc: numeroBus || 'N/D',
            vehiculo_id: vehicleUuid || undefined,
            tipo_vehiculo: vehicleTipo || undefined,
            kilometraje: odometer || 'N/D',
            ruta_asignada: rutaSeleccionada?.nume_ruta || (rutaSeleccionada ? `${rutaSeleccionada.nume_ruta}` : 'X101'),
            estado_autorizacion: 'Pendiente de Salida Vial',
            vencimiento_soat: vehicleDocs?.vencimiento_soat,
            estado_soat: vehicleDocs?.estado_soat,
            rtm_vencimiento: vehicleDocs?.rtm_vencimiento,
            estado_rtm: vehicleDocs?.estado_rtm,
            vencimiento_rcc: vehicleDocs?.vencimiento_rcc,
            estado_rcc: vehicleDocs?.estado_rcc,
            vencimiento_rce: vehicleDocs?.vencimiento_rce,
            estado_rce: vehicleDocs?.estado_rce,
            exp_extintor_1: vencimientoExtintor1,
            exp_extintor_2: vencimientoExtintor2,
            vencimiento_extintor_1: vencimientoExtintor1,
            vencimiento_extintor_2: vencimientoExtintor2,
            estado_extintor_1: getExtintorStatus(vencimientoExtintor1).label,
            estado_extintor_2: getExtintorStatus(vencimientoExtintor2).label,
            observaciones_hallazgos: observations || 'Sin novedades reportadas.',
            estado_salud: checklist[1] ?? true,
            estado_llantas_guardapolvos: checklist[2] ?? true,
            motor_correas_radiador_mangueras: checklist[3] ?? true,
            niveles_liquidos: checklist[4] ?? true,
            fugas_fluidos: checklist[5] ?? true,
            presion_fugas_aire: checklist[6] ?? true,
            estado_frenos: checklist[7] ?? true,
            luces_bocina: checklist[8] ?? true,
            parabrisas: checklist[9] ?? true,
            espejos: checklist[10] ?? true,
            switch_alarma_retroceso: checklist[11] ?? true,
            elementos_retencion: checklist[12] ?? true,
            luces_tablero_testigos: checklist[13] ?? true,
            puertas_vidrios: checklist[14] ?? true,
            rampa_pmr: checklist[15] ?? true,
            timbre_senalizacion: checklist[16] ?? true,
            angel_guardian: checklist[17] ?? true,
            equipos_prevencion: checklist[18] ?? true,
            martillos_salidas_emergencia: checklist[19] ?? true,
            equipos_recaudo: checklist[20] ?? true,
            documentos: checklist[21] ?? true,
            estado_suspension_direccion: checklist[22] ?? true
          }}
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
