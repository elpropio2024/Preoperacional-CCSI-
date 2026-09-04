import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Bus, 
  Gauge, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  AlertTriangle, 
  Smartphone, 
  Sparkles, 
  Send, 
  Clock, 
  CheckCircle2, 
  Database,
  Search,
  BookOpen,
  Eye,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';

interface PreoperacionalMobileProps {
  supabaseClient: any;
  config: any;
  onRefreshTableInfo?: () => void;
}

// 14 standard questions from Norma SURA for road safety
interface Question {
  id: number;
  text: string;
  category: string;
  description: string;
}

const SURA_QUESTIONS: Question[] = [
  { 
    id: 1, 
    text: "Estado de salud y descanso óptimo", 
    category: "Conductor", 
    description: "Siento bienestar físico y mental, habiendo descansado al menos 7 horas consecutivas." 
  },
  { 
    id: 2, 
    text: "Estado de llantas y guardapolvos", 
    category: "Exterior del Bus", 
    description: "Revisar labrado adecuado, presión correcta, tuercas de perno completas y guardabarros firmes." 
  },
  { 
    id: 3, 
    text: "Luces operativas y bocina", 
    category: "Seguridad Activa", 
    description: "Faros principales (altas/bajas), frenos, direccionales, luces traseras y bocina ruidosa." 
  },
  { 
    id: 4, 
    text: "Posición y limpieza de espejos", 
    category: "Cabina", 
    description: "Retrovisores y espejos convexos limpios, sin trizaduras, y ajustados para evitar puntos ciegos." 
  },
  { 
    id: 5, 
    text: "Niveles de líquidos (aceite, refrigerante)", 
    category: "Motor", 
    description: "Verificar líquido de dirección, aceite de motor y refrigerante en límites seguros." 
  },
  { 
    id: 6, 
    text: "Sin fugas de fluidos en el piso", 
    category: "Motor", 
    description: "Inspeccionar el suelo debajo del bus en busca de manchas de aceite, refrigerante o combustible." 
  },
  { 
    id: 7, 
    text: "Presión y fugas de aire", 
    category: "Frenos", 
    description: "Carga rápida del compresor, barómetro estable sobre 90 PSI sin silbidos ni caídas de presión." 
  },
  { 
    id: 8, 
    text: "Respuesta y estado de frenos", 
    category: "Frenos", 
    description: "Freno de parqueo retiene con fuerza; el pedal de freno de servicio responde con rigidez óptima." 
  },
  { 
    id: 9, 
    text: "Parabrisas sin fisuras y plumillas útiles", 
    category: "Visibilidad", 
    description: "Vidrio delantero libre de astillados; plumillas de caucho barren agua limpiamente sin rayas." 
  },
  { 
    id: 10, 
    text: "Cinturón de seguridad y anclaje de sillas", 
    category: "Cabina", 
    description: "Cinturón del operador retrae y bloquea bien; sillas de pasajeros ancladas sin balanceos." 
  },
  { 
    id: 11, 
    text: "Documentos del bus vigentes en físico", 
    category: "Documentación", 
    description: "Llevar SOAT original, Tarjeta de Operación (TC) y Revisión Técnico-Mecánica vigentes." 
  },
  { 
    id: 12, 
    text: "Kit de carretera y extintor completo", 
    category: "Emergencias", 
    description: "Extintor de 10 libras vigente, botiquín completo, tacos, gato, cruceta y chaleco reflectivo." 
  },
  { 
    id: 13, 
    text: "Testigos del tablero apagados", 
    category: "Cabina", 
    description: "Al encender el motor, ningun testigo luminoso rojo o amarillo (Check Engine, ABS) queda activo." 
  },
  { 
    id: 14, 
    text: "Dirección y suspensión sin ruidos", 
    category: "Chasis", 
    description: "Maniobrabilidad suave del volante, sin durezas ni crujidos metálicos al girar las ruedas." 
  }
];

const PRESET_BUSES = [
  { id: 1, name: "TC-1102 (Padrón Mercedes - Transcaribe)" },
  { id: 2, name: "TC-1145 (Articulado Scania - Transcaribe)" },
  { id: 3, name: "TC-2101 (Buseta Alimentadora VW)" },
  { id: 4, name: "TC-2309 (Padrón Busscar)" },
  { id: 5, name: "TC-1055 (Padrón Transcaribe)" },
  { id: 6, name: "BUS-854 (Especial Escolar)" },
];

export default function PreoperacionalMobile({ supabaseClient, config, onRefreshTableInfo }: PreoperacionalMobileProps) {
  // Step navigation (1, 2, 3, or 'success')
  const [step, setStep] = useState<1 | 2 | 3 | 'success'>(1);
  
  // Step 1 states
  const [driverId, setDriverId] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [busPlate, setBusPlate] = useState('');
  const [odometer, setOdometer] = useState('');
  
  // Step 2 checklist state: id -> true (SI) or false (NO)
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});
  
  // Step 3 states
  const [observations, setObservations] = useState('');
  
  // Simulation vs real push toggle
  const [syncToSupabase, setSyncToSupabase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  
  // Dynamic UI States
  const [searchBusTerm, setSearchBusTerm] = useState('');
  const [showBusDropdown, setShowBusDropdown] = useState(false);
  const [highContrastMode, setHighContrastMode] = useState(false);
  
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [showSqlDdlModal, setShowSqlDdlModal] = useState(false);

  // Auto greet time
  const [greetingText, setGreetingText] = useState('¡Buen viaje!');

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours >= 4 && hours < 12) {
      setGreetingText('¡Buenos días, conductor! Empiece su jornada con precaución en las vías de la Heroica.');
    } else if (hours >= 12 && hours < 18) {
      setGreetingText('¡Buenas tardes, operador! Mantenga la paciencia bajo el calor de Cartagena.');
    } else {
      setGreetingText('¡Buenas noches, compañero! Conduzca con precaución y descanse al final del turno.');
    }
  }, [step]);

  // Read local history of submissions to populate simulator logs
  useEffect(() => {
    const cached = localStorage.getItem('local_preops_inspecciones');
    if (cached) {
      try {
        setRecentInspections(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Set default driver id and bus to speed up testing
  useEffect(() => {
    if (!driverId) setDriverId('1047432109');
    if (!operatorName) setOperatorName('Manuel Alejandro Gaviria');
    if (!busPlate) setBusPlate('TC-1145 (Articulado Scania - Transcaribe)');
    if (!odometer) setOdometer('245610');
  }, []);

  const handleSelectBus = (name: string) => {
    setBusPlate(name);
    setSearchBusTerm('');
    setShowBusDropdown(false);
  };

  const handleAnswerQuestion = (questionId: number, answer: boolean) => {
    setChecklist(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const currentFailsCount = SURA_QUESTIONS.filter(q => checklist[q.id] === false).length;
  const answeredCount = Object.keys(checklist).length;
  const isChecklistComplete = answeredCount === SURA_QUESTIONS.length;

  // Validation step 1
  const validateStep1 = () => {
    if (!driverId.trim() || isNaN(Number(driverId))) {
      alert("Por favor ingrese una Cédula de Operador válida (numérica).");
      return false;
    }
    if (!busPlate.trim()) {
      alert("Por favor elija o ingrese la Placa del Bus o Tarjeta de Operación.");
      return false;
    }
    if (!odometer.trim() || isNaN(Number(odometer)) || Number(odometer) <= 0) {
      alert("Por favor registre un Kilometraje de Odómetro válido.");
      return false;
    }
    return true;
  };

  // Populate quick sample observation text for demo speed
  const injectSampleObservation = () => {
    const fails = SURA_QUESTIONS.filter(q => checklist[q.id] === false).map(q => q.text);
    if (fails.length > 0) {
      setObservations(`Fallo detectado en: ${fails.join(', ')}. Revisar en el patio de Transcaribe antes del despacho.`);
    } else {
      setObservations("Inspección sin novedades. El bus se encuentra en perfectas condiciones operativas para iniciar ruta de Cartagena.");
    }
  };

  // Submit flow
  const handleSubmitInspection = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    // Build checklist values summary object for single JSON field or metadata
    const checklistMap: Record<string, string> = {};
    SURA_QUESTIONS.forEach(q => {
      checklistMap[`p_${q.id}`] = checklist[q.id] ? 'CUMPLE' : 'FALLA';
    });

    const payload = {
      cedula_conductor: driverId.trim(),
      nombre_conductor: operatorName.trim() || 'Operador Central de Patio',
      placa_bus: busPlate.trim(),
      kilometraje: parseInt(odometer) || 0,
      resultado_inspeccion: currentFailsCount > 0 ? 'CON NOVEDAD' : 'APROBADO',
      cantidad_fallas: currentFailsCount,
      observaciones: observations.trim(),
      ...checklistMap,
      fecha_registro: new Date().toISOString()
    };

    let successfullySaved = false;

    if (syncToSupabase && supabaseClient) {
      try {
        const { error: insertError } = await supabaseClient
          .from('inspecciones')
          .insert([payload]);

        if (insertError) {
          console.warn("Could not write directly to 'inspecciones' table. This is normal if the table schema was not created yet.", insertError);
          setSubmissionError(`Nota: No se pudo escribir en la tabla 'inspecciones' de Supabase (${insertError.message}). Guardado localmente en simulador.`);
        } else {
          successfullySaved = true;
          if (onRefreshTableInfo) onRefreshTableInfo(); // Refresh parent Tables
        }
      } catch (err: any) {
        console.warn("Direct connection failure to table 'inspecciones':", err);
        setSubmissionError(`La tabla 'inspecciones' no existe en tu Supabase actual. Haz click arriba para copiar la consulta SQL DDL y crearla fácilmente.`);
      }
    }

    // Save to local cache logs in all cases to preserve testing feel
    const newRecord = {
      id: `PRE-${Date.now().toString().slice(-5)}`,
      driverId: payload.cedula_conductor,
      driverName: payload.nombre_conductor,
      bus: payload.placa_bus,
      odo: payload.kilometraje,
      status: payload.resultado_inspeccion,
      fails: payload.cantidad_fallas,
      obs: payload.observaciones,
      submittedAt: new Date().toLocaleTimeString(),
      cloudSync: successfullySaved
    };

    const updatedList = [newRecord, ...recentInspections].slice(0, 15);
    setRecentInspections(updatedList);
    localStorage.setItem('local_preops_inspecciones', JSON.stringify(updatedList));

    // Wait a brief simulated moment to let screen shine
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1500);
  };

  const handleReset = () => {
    setStep(1);
    // Keep driver values but advance odometer slightly for realistic consecutive tests
    const currentOdo = parseInt(odometer);
    if (!isNaN(currentOdo)) {
      setOdometer((currentOdo + 350).toString());
    }
    // Reset checklists
    setChecklist({});
    setObservations('');
  };

  const handleCopySqlDdl = () => {
    const ddl = `CREATE TABLE public.inspecciones (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cedula_conductor TEXT NOT NULL,
  nombre_conductor TEXT,
  placa_bus TEXT NOT NULL,
  kilometraje INTEGER NOT NULL,
  resultado_inspeccion TEXT NOT NULL,
  cantidad_fallas INTEGER DEFAULT 0,
  observaciones TEXT,
  p_1 TEXT, p_2 TEXT, p_3 TEXT, p_4 TEXT, p_5 TEXT, p_6 TEXT, p_7 TEXT,
  p_8 TEXT, p_9 TEXT, p_10 TEXT, p_11 TEXT, p_12 TEXT, p_13 TEXT, p_14 TEXT
);

-- Habilitar permisos públicos para pruebas simples
ALTER TABLE public.inspecciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todos accesos públicos" ON public.inspecciones FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(ddl);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2500);
  };

  // High Contrast vs Standard dark bg color
  const bgColor = highContrastMode ? 'bg-black' : 'bg-slate-950';
  const cardColor = highContrastMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-slate-900 border border-slate-800/80';
  const labelColor = highContrastMode ? 'text-zinc-300' : 'text-slate-400';
  const inputBg = highContrastMode ? 'bg-black' : 'bg-slate-950';

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6 p-6 overflow-y-auto bg-slate-900 select-none">
      
      {/* LEFT COLUMN: Supabase Status & Simulator Control Desk */}
      <div className="w-full md:w-80 flex flex-col gap-5 shrink-0">
        
        {/* Supabase Link Status Info */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Canal Supabase</h3>
              <p className="text-[10px] text-slate-500 font-mono">Control de Persistencia</p>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Servidor Activo:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 border border-emerald-500/30 text-emerald-400 font-semibold font-mono">
                CONECTADO
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-[11px]">Sincronización:</span>
              <button 
                onClick={() => setSyncToSupabase(!syncToSupabase)}
                className={`px-2.5 py-1 text-[10px] rounded-xl font-bold transition-all cursor-pointer ${
                  syncToSupabase 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20' 
                    : 'bg-slate-800 border border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                {syncToSupabase ? 'ACTIVADA' : 'SÓLO LOCAL'}
              </button>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[10px] leading-relaxed text-slate-500">
              {syncToSupabase 
                ? 'Las planillas se escribirán directamente en la tabla "inspecciones" de tu proyecto de Supabase.'
                : 'Las planillas se guardarán localmente en la memoria del navegador para simulación rápida.'}
            </div>
          </div>

          {/* DDL Quick Helper */}
          <button
            onClick={() => setShowSqlDdlModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ver Instrucciones SQL DDL</span>
          </button>
        </div>

        {/* Sunlight Simulation Configurer */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Filtros de Visibilidad en Patio</h4>
          
          <div className="space-y-3">
            <button
              onClick={() => setHighContrastMode(false)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border text-left ${
                !highContrastMode 
                  ? 'bg-slate-900 border-emerald-500/30 text-white shadow-lg' 
                  : 'bg-zinc-950 border-slate-800 hover:bg-zinc-900 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Moon className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold block leading-tight">Slate Dark Estándar</span>
                  <span className="text-[10px] font-mono text-slate-500">Para turnos nocturnos o sombra</span>
                </div>
              </div>
              {!highContrastMode && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
            </button>

            <button
              onClick={() => setHighContrastMode(true)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer border text-left ${
                highContrastMode 
                  ? 'bg-zinc-900 border-amber-500/40 text-amber-300 shadow-amber-500/5 shadow-md' 
                  : 'bg-slate-950/40 border-slate-850 hover:bg-slate-900 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <div>
                  <span className="text-xs font-semibold block leading-tight">Alto Contraste Luz Solar</span>
                  <span className="text-[10px] font-mono text-slate-500">Negro absoluto & amarillo solar</span>
                </div>
              </div>
              {highContrastMode && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Log list of local simulated preoperacionales */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 flex-1 min-h-[180px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Turnos</span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-500">
              {recentInspections.length} guardados
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 text-xs scrollbar-thin">
            {recentInspections.length === 0 ? (
              <p className="text-center text-slate-600 italic py-6">Ninguna planilla guardada aún. Llena el formulario móvil a la derecha para iniciar.</p>
            ) : (
              recentInspections.map((ins, idx) => (
                <div key={ins.id} className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex justify-between items-center font-mono">
                    <span className="text-slate-400 font-bold">{ins.id}</span>
                    <span className="text-slate-600 text-[10px]">{ins.submittedAt}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                    <Bus className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[140px] font-medium">{ins.bus}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/40 text-[10px]">
                    <span className={`px-1.5 py-0.2 rounded-full font-bold ${
                      ins.status === 'APROBADO' 
                        ? 'bg-emerald-950 text-emerald-400 text-[9px] border border-emerald-500/20' 
                        : 'bg-rose-950 text-rose-400 text-[9px] border border-rose-500/20'
                    }`}>
                      {ins.status}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {ins.fails} fallas • Cél: {ins.driverId.slice(-4)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Mobile Iframe Shell simulator */}
      <div className="flex-1 flex justify-center items-center py-4 bg-slate-900/40 border border-slate-800/40 rounded-3xl relative overflow-hidden shadow-2xl">
        
        {/* Sunlight glare background overlay for simulator */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-white/2 to-transparent rounded-full filter blur-3xl pointer-events-none" />

        {/* MOBILE VIEWPORT CONTAINER */}
        <div className="w-full max-w-[420px] h-[780px] bg-slate-950 rounded-[48px] border-[12px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* Phone Speaker & Camera cut */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-full z-50 flex items-center justify-center gap-1.5 px-3">
            <div className="w-1.5 h-1.5 bg-black rounded-full" />
            <div className="w-12 h-1 bg-black rounded-full" />
          </div>

          {/* INTERNAL PHONE SCREEN CONTAINER */}
          <div className={`w-full h-full flex flex-col overflow-hidden text-zinc-100 ${bgColor}`}>
            
            {/* Phone Top Status Bar */}
            <div className={`pt-10 px-6 pb-2 flex justify-between items-center text-[10px] font-mono tracking-widest text-slate-500 bg-black/25 shrink-0 select-none z-10`}>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>12:40 PM</span>
              </div>
              <div className="font-semibold text-emerald-400">PATIOS CARTAGENA v2.1</div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded-md font-bold text-[9px]">4G SOL</span>
                <span className="w-2.5 h-4 border border-slate-500 rounded-sm relative inline-block p-0.5">
                  <span className="absolute top-0 left-0 bottom-0 bg-emerald-400 w-3/4 rounded-2xs" />
                </span>
              </div>
            </div>

            {/* Mobile Title Header */}
            <div className="px-5 py-4 border-b border-slate-800/30 flex items-center justify-between bg-black/15 shrink-0 z-10">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">NORMA VIAL SURA</span>
                <h1 className="text-md font-bold tracking-tight text-white leading-tight">Planilla Preoperacional</h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono block text-slate-500">Transcaribe Co.</span>
                <span className="text-[11px] font-semibold text-emerald-400">Cartagena de Indias</span>
              </div>
            </div>

            {/* PROGRESS VISUAL BAR */}
            <div className="px-5 pt-3 pb-1 select-none shrink-0 z-10 bg-black/10">
              <div className="flex justify-between items-center text-[11px] mb-2 font-mono text-slate-400">
                <span className="font-semibold">Progreso de Inspección</span>
                <span className="font-bold text-emerald-400">
                  {step === 1 ? 'Paso 1: Identificación' : step === 2 ? `Paso 2: Checklist (${answeredCount}/14)` : step === 3 ? 'Paso 3: Cierre y Observación' : 'Paso Final: Listo'}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-800">
                <div className={`h-full rounded-full transition-all duration-300 ${
                  step === 1 ? 'w-1/3 bg-emerald-500' : step === 2 ? 'w-2/3 bg-emerald-500' : 'w-full bg-emerald-500'
                }`} />
              </div>
              
              {/* Steppers visualization */}
              <div className="flex justify-between mt-2 px-1 text-[10px] font-bold text-slate-500 font-mono">
                <span className={step >= 1 ? 'text-emerald-400' : ''}>1. Datos</span>
                <span className={step >= 2 ? 'text-emerald-400' : ''}>2. Seguridad</span>
                <span className={step >= 3 ? 'text-emerald-400' : ''}>3. Cierre</span>
              </div>
            </div>

            {/* SCROLLABLE INTERACTIVE VIEWPORT */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar">

              <AnimatePresence mode="wait">
                
                {/* STEP 1: OPERATOR & VEHICLE DATA */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-3xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong className="block font-bold mb-0.5">Control de Patio Diario:</strong> 
                        Esta planilla es obligatoria antes de iniciar ruta. Ingrese con exactitud los datos del bus asignado.
                      </p>
                    </div>

                    <div className={`${cardColor} rounded-3xl p-4.5 space-y-4`}>
                      <h3 className="text-xs uppercase font-bold text-white tracking-widest mb-1">Paso 1: Identificación</h3>
                      
                      {/* Driver ID field */}
                      <div className="space-y-1.5" id="form-driver-id">
                        <label className={`text-[11px] font-bold block ${labelColor}`}>
                          Cédula del Conductor *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-8]*"
                            required
                            placeholder="Cédula de Ciudadanía"
                            value={driverId}
                            onChange={(e) => setDriverId(e.target.value.replace(/\D/g, ''))}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-2xl text-sm font-semibold tracking-wider text-white focus:outline-none focus:border-emerald-500 shadow-inner`}
                          />
                        </div>
                      </div>

                      {/* Optional Name for demo experience */}
                      <div className="space-y-1.5">
                        <label className={`text-[11px] font-bold block ${labelColor}`}>
                          Nombre Completo del Operador
                        </label>
                        <input
                          type="text"
                          placeholder="Nombre y Apellidos"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          className={`w-full px-4 py-3 bg-slate-900 border border-slate-700/60 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-emerald-500`}
                        />
                      </div>

                      {/* Bus selection with Autocomplete Helper */}
                      <div className="space-y-1.5 relative">
                        <label className={`text-[11px] font-bold block ${labelColor}`}>
                          Placa o TC de Tarjeta Operación del Bus *
                        </label>
                        <div className="relative">
                          <Bus className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                          <input
                            type="text"
                            required
                            placeholder="Eje: TC-1145, UAW-536..."
                            value={busPlate}
                            onChange={(e) => {
                              setBusPlate(e.target.value);
                              setSearchBusTerm(e.target.value);
                              setShowBusDropdown(true);
                            }}
                            onFocus={() => setShowBusDropdown(true)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-2xl text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 font-mono text-emerald-400"
                          />
                        </div>

                        {/* Autocomplete suggestions dropdown inside phone */}
                        {showBusDropdown && (
                          <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-2xl max-h-40 overflow-y-auto shadow-2xl z-20 p-1 divide-y divide-slate-800/60">
                            {PRESET_BUSES.filter(b => b.name.toLowerCase().includes(searchBusTerm.toLowerCase())).map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => handleSelectBus(b.name)}
                                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-slate-850 hover:text-emerald-400 font-sans cursor-pointer transition-colors block"
                              >
                                {b.name}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setShowBusDropdown(false)}
                              className="w-full text-center px-3 py-1.5 text-[10px] text-slate-500 hover:bg-slate-850 tracking-wider font-bold block pt-2 cursor-pointer"
                            >
                              ✕ CERRAR SUGERENCIAS
                            </button>
                          </div>
                        )}
                        <span className="text-[9px] text-slate-500 block pl-1">Prefiere los autobuses en la central de patio asignados.</span>
                      </div>

                      {/* Odometer current Mileage */}
                      <div className="space-y-1.5" id="form-odometer">
                        <label className={`text-[11px] font-bold block ${labelColor}`}>
                          Kilometraje (Odómetro) Actual *
                        </label>
                        <div className="relative">
                          <Gauge className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="Eje: 245610"
                            value={odometer}
                            onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700/60 rounded-2xl text-sm font-mono font-bold tracking-wider text-white focus:outline-none focus:border-emerald-500"
                          />
                          <span className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-500 font-mono">KM</span>
                        </div>
                        <span className="text-[9px] text-slate-500 block pl-1">Registrar valor neto de pantalla principal.</span>
                      </div>

                    </div>

                    {/* Step 1 Submit Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) {
                          setStep(2);
                        }
                      }}
                      className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950 font-bold tracking-wider text-sm rounded-3xl cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10 transition-all active:scale-[0.98]"
                    >
                      <span>INICIAR CHECKLIST DE SEGURIDAD</span>
                      <ArrowRight className="w-4 h-4 text-emerald-950 stroke-[3]" />
                    </button>
                  </motion.div>
                )}

                {/* STEP 2: CHECKLIST QUESTIONS (SURA ROAD SAFETY) */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    
                    {/* Top Stats Overview */}
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Respondidas</span>
                        <span className="text-sm font-extrabold text-white">{answeredCount} / 14</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono uppercase block">Fallas Reportadas</span>
                        <span className={`text-sm font-extrabold font-mono px-2 py-0.5 rounded-md ${currentFailsCount > 0 ? 'bg-red-950 border border-red-500/20 text-red-400' : 'text-emerald-400 bg-emerald-950/40'}`}>
                          {currentFailsCount} {currentFailsCount === 1 ? 'FALLA' : 'FALLAS'}
                        </span>
                      </div>
                    </div>

                    {/* Sequential Vertical Card Queue */}
                    <div className="space-y-3.5">
                      {SURA_QUESTIONS.map((question, index) => {
                        const answer = checklist[question.id];
                        const isNo = answer === false;
                        const isYes = answer === true;

                        // Conditional alert frame for "NO" fails
                        const pulseStyle = isNo 
                          ? 'animate-pulse border-red-650 ring-2 ring-red-500/25 bg-red-950/15' 
                          : '';

                        return (
                          <div 
                            key={question.id} 
                            id={`question-card-${question.id}`}
                            className={`p-4 rounded-3xl transition-all duration-200 border ${
                              isYes 
                                ? 'bg-emerald-950/10 border-emerald-500/40' 
                                : isNo 
                                ? pulseStyle 
                                : cardColor
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-full text-[9px] font-mono tracking-wider uppercase font-bold shrink-0">
                                {question.category}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-600">
                                #{index + 1} de 14
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-white mb-1.5 leading-snug">
                              {question.text}
                            </h4>
                            
                            <p className="text-[10.5px] leading-relaxed text-zinc-400 font-light mb-3">
                              {question.description}
                            </p>

                            {/* GIANT TACTILE BUTTONS (>44px high for robust phone manipulation) */}
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              
                              <button
                                type="button"
                                onClick={() => handleAnswerQuestion(question.id, true)}
                                className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all tracking-wider focus:outline-none cursor-pointer ${
                                  isYes 
                                    ? 'bg-emerald-500 text-emerald-950 shadow-emerald-500/20 shadow-md transform scale-[1.01] border-2 border-emerald-400' 
                                    : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                                }`}
                              >
                                <CheckCircle className={`w-4.5 h-4.5 ${isYes ? 'text-emerald-950' : 'text-slate-500'}`} />
                                <span>SÍ (Cumple)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAnswerQuestion(question.id, false)}
                                className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all tracking-wider focus:outline-none cursor-pointer ${
                                  isNo 
                                    ? 'bg-red-500 text-red-950 shadow-red-500/20 shadow-md transform scale-[1.01] border-2 border-red-400' 
                                    : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800'
                                }`}
                              >
                                <XCircle className={`w-4.5 h-4.5 ${isNo ? 'text-red-950' : 'text-slate-500'}`} />
                                <span>NO (Falla)</span>
                              </button>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Step 2 navigation actions */}
                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="py-3.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Atrás</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isChecklistComplete}
                        onClick={() => {
                          if (isChecklistComplete) {
                            setStep(3);
                          } else {
                            alert("Por favor responda las 14 preguntas de seguridad antes de continuar.");
                          }
                        }}
                        className={`py-3.5 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 transition-all text-center ${
                          isChecklistComplete 
                            ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 cursor-pointer shadow-md' 
                            : 'bg-slate-900 border border-slate-800 text-slate-650 cursor-not-allowed !pointer-events-none'
                        }`}
                      >
                        <span>Siguiente</span>
                        <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>

                    {!isChecklistComplete && (
                      <p className="text-[10px] text-amber-500 text-center font-mono my-2 italic">
                        * Debes marcar todas las 14 preguntas obligatorias SURA para habilitar el paso de Cierre.
                      </p>
                    )}

                  </motion.div>
                )}

                {/* STEP 3: CLOSURE & OBSERVATIONS */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    
                    {/* Sumary of failures */}
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
                      <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider font-mono">Consolidado Preoperacional</h4>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Placa de Bus:</span>
                        <span className="font-mono text-white tracking-wide font-semibold">{busPlate.split(' ')[0]}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Kilometraje inicial:</span>
                        <span className="font-mono text-white font-semibold">{odometer} KM</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60">
                        <span className="text-slate-400">Dictamen técnico:</span>
                        <span className={`px-2 py-0.2 rounded font-bold text-[10px] ${currentFailsCount > 0 ? 'bg-rose-950 text-rose-450 border border-rose-900/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'}`}>
                          {currentFailsCount > 0 ? 'CON NOVEDAD (REVISIÓN PATIO)' : 'APROBADO PARA RUTA'}
                        </span>
                      </div>
                    </div>

                    {/* Observations Area */}
                    <div className={`${cardColor} rounded-3xl p-4.5 space-y-3`}>
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold block text-white">
                          Observaciones / Hallazgos Específicos
                        </label>
                        <button
                          type="button"
                          onClick={injectSampleObservation}
                          className="px-2 py-0.8 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/25 text-emerald-300 text-[9.5px] rounded-lg cursor-pointer font-bold transition-all"
                        >
                          Auto-Generar Reporte
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        placeholder="Si reportaste alguna falla (NO), describe aquí los detalles o añade observaciones operativas generales del bus para el taller de mantenimiento del patio..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        className="w-full p-3.2 bg-slate-950 border border-slate-850 hover:border-slate-800 text-zinc-100 text-xs rounded-xl focus:outline-none focus:border-emerald-500 font-sans tracking-wide leading-relaxed resize-none placeholder:text-slate-650"
                      />
                      
                      <p className="text-[9.5px] text-slate-500 leading-normal font-light">
                        Este comentario será reportado de inmediato al software central de logística y despacho de talleres de Cartagena.
                      </p>
                    </div>

                    {/* Simulated Loading Indicator */}
                    {isSubmitting && (
                      <div className="p-4 bg-slate-900/90 border border-slate-850 rounded-2xl flex flex-col items-center justify-center space-y-3 p-6 text-center shadow-lg">
                        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <div>
                          <p className="text-xs font-bold text-white font-mono animate-pulse">ENVIANDO REGISTRO DE PLANILLA...</p>
                          <p className="text-[10px] text-slate-500">Conectando con base de datos de patio central</p>
                        </div>
                      </div>
                    )}

                    {/* Error indicator during insert */}
                    {submissionError && (
                      <div className="p-3 bg-red-950/20 border border-red-500/15 text-red-300 rounded-2xl text-[10px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>ALERTA DE TRANSFERENCIA</span>
                        </div>
                        <p>{submissionError}</p>
                      </div>
                    )}

                    {/* Step 3 Navigation */}
                    {!isSubmitting && (
                      <div className="space-y-3 pt-1">
                        <button
                          type="button"
                          onClick={handleSubmitInspection}
                          className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-emerald-950 font-black tracking-widest text-sm rounded-3xl cursor-pointer flex items-center justify-center gap-2 shadow-xl hover:shadow-emerald-500/15 transition-all text-center animate-pulse"
                        >
                          <Send className="w-4 h-4 text-emerald-950 stroke-[3]" />
                          <span>ENVIAR REGISTRO A PATIO</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-2xl cursor-pointer text-center transition-colors border border-slate-850"
                        >
                          Volver al Checklist
                        </button>
                      </div>
                    )}

                  </motion.div>
                )}

                {/* FINAL SUCCESS SCREEN */}
                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-5 text-center py-6"
                  >
                    
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-2 animate-bounce">
                      <CheckCircle2 className="w-9 h-9 text-emerald-400 stroke-[2.5]" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white tracking-tight">¡Inspección Guardada!</h3>
                      <p className="text-xs text-emerald-300 font-bold font-mono tracking-wider">REGISTRO SINCRO-PATIO OK</p>
                    </div>

                    <div className={`${cardColor} p-4 rounded-3xl space-y-3.5 text-left`}>
                      <div className="text-center pb-2.5 border-b border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono block">Código de Operador</span>
                        <span className="text-xs font-bold font-mono text-white bg-slate-950 px-3 py-1 rounded-full border border-slate-850 inline-block mt-0.5">
                          {driverId}
                        </span>
                      </div>

                      <div className="space-y-1 px-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Bus Despachado:</span>
                          <span className="font-bold text-white">{busPlate.split(' ')[0]}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Kilometraje Inicial:</span>
                          <span className="font-mono font-bold text-white">{odometer} KM</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Fallas registradas:</span>
                          <span className="font-semibold text-white">{currentFailsCount}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-2 border-t border-slate-800/60 items-center">
                          <span className="text-slate-400">Estado de Viaje:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${currentFailsCount > 0 ? 'bg-amber-950 border border-amber-500/30 text-amber-400' : 'bg-emerald-950 border border-emerald-500/30 text-emerald-400'}`}>
                            {currentFailsCount > 0 ? 'COMPROMETIDO (TALLER)' : 'AUTORIZADO / BUEN VIAJE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Time Greetings */}
                    <div className="p-3.5 bg-slate-900 border border-slate-850 rounded-2xl text-[11px] leading-relaxed text-slate-300 italic">
                      💡 {greetingText}
                    </div>

                    {/* Restart for next driver */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white font-bold text-xs rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>REINICIAR PARA SIGUIENTE TURNO</span>
                    </button>

                  </motion.div>
                )}

              </AnimatePresence>

            </div>

            {/* Simulated Phone Bar bottom */}
            <div className={`p-4 text-center text-[10px] text-slate-600 bg-black/15 shrink-0 select-none z-10 font-mono flex items-center justify-center gap-1 border-t border-slate-900/40`}>
              <span>POLÍTICAS DE SALUD DE CARRETERA SURA • CARTAGENA CO</span>
            </div>

            {/* Mobile Bottom Swipe Home Indicator */}
            <div className="pb-2 bg-black/15 shrink-0 flex justify-center w-full select-none">
              <div className="w-28 h-1 bg-zinc-700 rounded-full" />
            </div>

          </div>

        </div>

      </div>

      {/* SQL DDL MODAL DIALOG DISPLAY FOR CREATING SUPABASE TABLE */}
      {showSqlDdlModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-450" />
                <h3 className="text-md font-bold text-white">Esquema SQL para Supabase</h3>
              </div>
              <button 
                onClick={() => setShowSqlDdlModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Para guardar los datos reales de las planillas móviles de tus operadores, ejecuta este script en la pestaña de <strong className="text-emerald-400 font-semibold">SQL Editor</strong> en tu consola de Supabase. Esto creará la tabla y habilitará las políticas públicas correspondientes:
            </p>

            <div className="relative">
              <pre className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-[10px] font-mono leading-relaxed text-slate-300 max-h-56 scrollbar-thin">
                {`CREATE TABLE public.inspecciones (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  cedula_conductor TEXT NOT NULL,
  nombre_conductor TEXT,
  placa_bus TEXT NOT NULL,
  kilometraje INTEGER NOT NULL,
  resultado_inspeccion TEXT NOT NULL,
  cantidad_fallas INTEGER DEFAULT 0,
  observaciones TEXT,
  p_1 TEXT, p_2 TEXT, p_3 TEXT, p_4 TEXT, p_5 TEXT, p_6 TEXT, p_7 TEXT,
  p_8 TEXT, p_9 TEXT, p_10 TEXT, p_11 TEXT, p_12 TEXT, p_13 TEXT, p_14 TEXT
);

-- Habilitar Políticas Row Level Security
ALTER TABLE public.inspecciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir accesos públicos para pruebas" 
ON public.inspecciones FOR ALL USING (true) WITH CHECK (true);`}
              </pre>

              <button
                onClick={handleCopySqlDdl}
                className="absolute top-2 right-2 px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {copiedQuery ? '¡Copiado!' : 'Copiar DDL'}
              </button>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-xl text-[10px] leading-relaxed text-emerald-400 font-mono">
              💡 Una vez creada la tabla, podrás ver las respuestas de las planillas enviadas en tiempo real desde el "Gestor CRUD de Tablas" de la barra lateral izquierda seleccionando la tabla "inspecciones"!
            </div>

            <button
              onClick={() => setShowSqlDdlModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-2xl cursor-pointer text-center"
            >
              Entendido, cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
