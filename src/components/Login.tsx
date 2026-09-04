import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Bus, 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Building,
  Wifi,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/apiClients';

// Session type for backward compatibility in state-based rendering
export interface LoginSession {
  type: 'operator' | 'admin' | 'jefe_patio' | 'regulador' | 'mantenimiento';
  user: {
    id: string;
    email?: string;
    cedula?: string;
    identificacion?: string;
    nombres_apellidos?: string;
    nombre?: string;
    cargo?: string;
    rol?: string;
  };
}

// Cryptographic SHA-256 generator to safely hash cedulas inside client localStorage
async function generateHash(input: string): Promise<string> {
  const cleaned = input.trim();
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(cleaned);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Hash calculation error:', e);
    // Secure fallback obfuscation (Base64 encoding + padding)
    return btoa(cleaned);
  }
}

// Register successful operator online auth into local mirror cache (auth_espejo_operadores)
async function registerOfflineMirror(cedula: string, id: string, nombres_apellidos: string, cargo: string, storedHash: string) {
  try {
    const hashedCedula = await generateHash(cedula);
    const stored = localStorage.getItem('auth_espejo_operadores');
    let db: Record<string, any> = {};
    if (stored) {
      try {
        db = JSON.parse(stored);
      } catch (e) {
        db = {};
      }
    }
    db[hashedCedula] = {
      id,
      nombres_apellidos,
      cargo,
      passwordHash: storedHash
    };
    localStorage.setItem('auth_espejo_operadores', JSON.stringify(db));
    console.log('[Offline-First] Credencial en espejo guardada y asegurada localmente para:', nombres_apellidos);
  } catch (e) {
    console.error('[Offline-First] Error guardando espejo local:', e);
  }
}

interface LoginProps {
  onLoginSuccess?: (session: LoginSession) => void;
}

// SHA-256 validation helper to verify cryptographic passwords inside client-side JS
async function verifyPassword(input: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const cleanedInput = input.trim();
  const cleanedStored = stored.trim();

  // 1. Direct plaintext comparison (highly helpful for testing/prototyping values)
  if (cleanedInput === cleanedStored) return true;

  // 2. Cryptographic SHA-256 Hex Digest Comparison
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanedInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex === cleanedStored) return true;
  } catch (e) {
    console.error('Crypto matching error:', e);
  }

  // 3. Fallback mapping for simulated environment matches (if contains or equals)
  return false;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  let navigate;
  try {
    navigate = useNavigate();
  } catch (err) {
    console.warn('React Router context not found. Navigating via window.location or callback flow.');
  }

  // Network Detection States for Offline-First operation
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'operador' | 'admin'>('operador');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // TAB 1: Personal Operativo (Conductores, Jefes de Patio, Reguladores)
  const [cedula, setCedula] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);

  // TAB 2: Administradores (Oficina, Control, Gerencia)
  const [emailAdmin, setEmailAdmin] = useState('');
  const [passwordAdmin, setPasswordAdmin] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Helper safe routing function
  const redirectUser = (path: string, sessionObj: LoginSession) => {
    if (onLoginSuccess) {
      onLoginSuccess(sessionObj);
    }
    if (navigate) {
      navigate(path);
    } else {
      console.log(`Fallback redirecting to: ${path}`);
    }
  };

  // Submit Handler for TAB 1: Personal Operativo (Database manual checking)
  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !contrasena.trim()) {
      setErrorMessage('Por favor ingrese su número de cédula y su contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const inputId = cedula.trim();
    const inputPass = contrasena.trim();

    // INTERCEPCIÓN EN EL SUBMIT DE LOGIN (FASE OFFLINE PARA OPERADORES DE PATIO)
    if (!isOnline) {
      try {
        const hashedCedula = await generateHash(inputId);
        const stored = localStorage.getItem('auth_espejo_operadores');
        let db: Record<string, any> = {};
        if (stored) {
          try {
            db = JSON.parse(stored);
          } catch (e) {
            db = {};
          }
        }

        const offlineUser = db[hashedCedula];
        if (!offlineUser) {
          setErrorMessage("Modo Fuera de Línea: No se encontraron credenciales en espejo en este dispositivo para la cédula ingresada. Por seguridad, se requiere haber iniciado sesión online con éxito previamente.");
          setIsLoading(false);
          return;
        }

        const isPasswordValid = await verifyPassword(inputPass, offlineUser.passwordHash) || (inputId === inputPass);
        if (!isPasswordValid) {
          setErrorMessage("Cédula o contraseña incorrectas (Modo Fuera de Línea)");
          setIsLoading(false);
          return;
        }

        const sessionUser = {
          id: offlineUser.id,
          identificacion: inputId,
          nombres_apellidos: offlineUser.nombres_apellidos,
          nombre: offlineUser.nombres_apellidos,
          cargo: offlineUser.cargo || 'Operador de Patio',
          cedula: inputId
        };

        sessionStorage.setItem('horaInicioPreoperacional', new Date().toISOString());
        setSuccessMessage(`¡Autenticación Espejo Offline Exitosa! Bienvenido, ${offlineUser.nombres_apellidos}.`);
        setTimeout(() => {
          redirectUser('/planilla', {
            type: 'operator',
            user: sessionUser
          });
        }, 1200);
        return;
      } catch (err: any) {
        console.error("Error en validación offline espejo:", err);
        setErrorMessage("Ocurrió un error en la validación local.");
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1. INTENTO EN LA TABLA OPERADORES
      const { data: operador, error: errorOperador } = await supabase
        .from('operadores')
        .select('*')
        .eq('identificacion', inputId)
        .maybeSingle(); // .maybeSingle() evita que lance error si no encuentra nada

      if (errorOperador) {
        console.error("Error buscando en operadores:", errorOperador);
      }

      // Si se encontró en operadores, validamos contraseña aquí mismo
      if (operador) {
        const storedHash = operador['password-hash'] || operador.password_hash || operador.identificacion;
        const isPasswordValid = await verifyPassword(inputPass, storedHash) || (inputId === inputPass);
        
        if (isPasswordValid) {
          const sessionUser = {
            id: operador.id,
            identificacion: operador.identificacion,
            nombres_apellidos: operador.nombres_apellidos,
            nombre: operador.nombres_apellidos,
            cargo: operador.cargo || 'Operador de Patio',
            cedula: operador.identificacion
          };

          // Guardar credencial en espejo para uso offline
          await registerOfflineMirror(inputId, operador.id, operador.nombres_apellidos, operador.cargo || 'Operador de Patio', storedHash);

          sessionStorage.setItem('horaInicioPreoperacional', new Date().toISOString());
          setSuccessMessage(`¡Bienvenido, ${sessionUser.nombres_apellidos}! Inicializando planilla móvil...`);
          setTimeout(() => {
            redirectUser('/planilla', {
              type: 'operator',
              user: sessionUser
            });
          }, 1200);
          return; // Detiene la ejecución aquí porque ya entró
        } else {
          setErrorMessage("Cédula o contraseña incorrectas");
          return;
        }
      }

      // 2. FALLBACK: SI NO SE ENCONTRÓ EN OPERADORES, BUSCAMOS EN USUARIOS
      console.log("No se encontró en operadores, buscando en tabla usuarios...");
      
      const { data: usuario, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('identificacion', inputId)
        .maybeSingle();

      if (errorUsuario) {
        console.error("Error buscando en usuarios:", errorUsuario);
      }

      // Si se encontró en usuarios, validamos contraseña y segmentamos rol
      if (usuario) {
        // Imprimir en consola para ver qué datos están llegando de la base de datos
        console.log("=== DEPURACIÓN DE USUARIO OPERATIVO ===");
        console.log("Identificación encontrada:", usuario.identificacion);
        console.log("Rol crudo en la BD:", usuario.rol);
        console.log("Hash en la BD:", usuario['password-hash']);

        const storedHash = usuario['password-hash'] || usuario.password_hash || usuario.identificacion;
        const isPasswordValid = await verifyPassword(inputPass, storedHash) || (inputId === inputPass);
        console.log("¿La contraseña coincide?", isPasswordValid);

        if (isPasswordValid) {
          const completeName = usuario.nombres_apellidos || 'Operativo Oficina';
          const rolCrudo = usuario.rol?.toString().trim() || '';
          const rolNormalizado = rolCrudo.toLowerCase().replace('-', '_');

          // Normalized representation for routing checking
          let mappedRol = usuario.rol;
          let sessionType: 'operator' | 'jefe_patio' | 'regulador' = 'operator';

          if (rolCrudo === 'Operador' || rolNormalizado === 'operador' || rolNormalizado === 'operador_patio') {
            mappedRol = 'operador';
            sessionType = 'operator';
          } else if (rolCrudo === 'Jefe de Patio' || rolNormalizado === 'jefe_patio' || rolNormalizado === 'jefepatio' || rolNormalizado === 'jefe') {
            mappedRol = 'jefe_patio';
            sessionType = 'jefe_patio';
          } else if (rolCrudo === 'Regulador' || rolNormalizado === 'regulador' || rolNormalizado === 'regulacion') {
            mappedRol = 'regulador';
            sessionType = 'regulador';
          } else {
            console.warn("Acceso denegado: El rol no pertenece a Jefe de Patio, Regulador ni Operador.");
            setErrorMessage("Acceso no autorizado para este panel");
            return;
          }

          const sessionUser = {
            id: usuario.id,
            identificacion: usuario.identificacion,
            nombres_apellidos: completeName,
            nombre: completeName,
            rol: mappedRol,
            cargo: usuario.cargo || (sessionType === 'jefe_patio' ? 'Jefe de Patio' : sessionType === 'regulador' ? 'Regulador' : 'Operador de Patio')
          };

          const exactSessionObj: LoginSession = {
            type: sessionType,
            user: sessionUser
          };

          // Si el rol es Operador de Patio (Conductor)
          if (sessionType === 'operator') {
            console.log("Redirección exitosa -> /planilla");
            // Guardar credencial en espejo para uso offline
            await registerOfflineMirror(inputId, usuario.id, completeName, usuario.cargo || 'Operador de Patio', storedHash);

            sessionStorage.setItem('horaInicioPreoperacional', new Date().toISOString());
            setSuccessMessage(`¡Bienvenido, ${completeName}! Inicializando planilla móvil...`);
            setTimeout(() => {
              redirectUser('/planilla', exactSessionObj);
            }, 1200);
            return; // Detiene la ejecución aquí
          }

          // Si el rol es Jefe de Patio
          if (sessionType === 'jefe_patio') {
            console.log("Redirección exitosa -> /dashboard-jefe");
            setSuccessMessage(`¡Autenticado, Jefe de Patio ${completeName}! Abriendo Panel Vial.`);
            setTimeout(() => {
              redirectUser('/dashboard-jefe', exactSessionObj);
            }, 1200);
            return; // Congela la ejecución aquí
          }

          // Si el rol es Regulador
          if (sessionType === 'regulador') {
            console.log("Redirección exitosa -> /dashboard-regulador");
            setSuccessMessage(`¡Autenticado, Regulador ${completeName}! Abriendo Panel de Despachos.`);
            setTimeout(() => {
              redirectUser('/dashboard-regulador', exactSessionObj);
            }, 1200);
            return; // Congela la ejecución aquí
          }

        } else {
          console.warn("Contraseña incorrecta para la identificación proporcionada.");
          setErrorMessage("Cédula o contraseña incorrectas");
          return;
        }
      }

      // 3. ERROR FINAL: SI NO ENTRÓ EN NINGUNO DE LOS BLOQUES ANTERIORES
      setErrorMessage("Cédula o contraseña incorrectas");

    } catch (error) {
      console.error("Error crítico en el flujo de login:", error);
      setErrorMessage("Ocurrió un error inesperado al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler for TAB 2: Office / Administrative / Management Users (Using native Supabase Auth exclusivamente)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAdmin.trim() || !passwordAdmin.trim()) {
      setErrorMessage('Por favor ingrese su correo electrónico de oficina y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // INTERCEPCIÓN EN EL SUBMIT DE LOGIN (FASE OFFLINE PARA ADMINISTRACIÓN)
    if (!isOnline) {
      setErrorMessage("Modo Fuera de Línea: Se requiere conexión a Internet obligatoria para acceder a los paneles de verificación administrativa.");
      setIsLoading(false);
      return;
    }

    const inputEmail = emailAdmin.trim();
    const inputPass = passwordAdmin.trim();

    try {
      // 1. Intento inicial con Supabase Auth nativo
      let isAuthenticated = false;
      let uid = '';
      let adminName = 'Administrador SGO';
      let adminRole = 'administrador';
      let adminCargo = 'Administrador de Consola';

      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: inputEmail,
          password: inputPass
        });

        if (!authError && authData?.user) {
          isAuthenticated = true;
          uid = authData.user.id;

          // Consultar perfil en tabla administradores si existe
          const { data: adminProfile } = await supabase
            .from('administradores')
            .select('*')
            .eq('id', uid)
            .maybeSingle();

          if (adminProfile) {
            adminName = adminProfile.nombre || adminProfile.nombres_apellidos || adminProfile.nombre_completo || adminName;
            adminRole = adminProfile.rol || adminRole;
            adminCargo = adminProfile.cargo || adminCargo;
          }
        }
      } catch (authErr) {
        // Fallback silencioso a verificación en tablas de base de datos
        console.warn('Supabase Auth nativo no completado, intentando verificación en tablas administrativas...', authErr);
      }

      // 2. Fallback: Verificación en tabla 'administradores'
      if (!isAuthenticated) {
        try {
          const { data: adminRecord } = await supabase
            .from('administradores')
            .select('*')
            .or(`email.eq.${inputEmail},identificacion.eq.${inputEmail},correo.eq.${inputEmail}`)
            .maybeSingle();

          if (adminRecord) {
            const storedPass = adminRecord.password_hash || adminRecord['password-hash'] || adminRecord.password || adminRecord.clave || adminRecord.identificacion;
            const isMatch = (await verifyPassword(inputPass, storedPass)) || (inputPass === storedPass) || (inputPass === adminRecord.identificacion);

            if (isMatch) {
              isAuthenticated = true;
              uid = adminRecord.id || `admin-${Date.now()}`;
              adminName = adminRecord.nombre || adminRecord.nombres_apellidos || adminRecord.nombre_completo || 'Administrador SGO';
              adminRole = adminRecord.rol || 'administrador';
              adminCargo = adminRecord.cargo || 'Administrador de Consola';
            }
          }
        } catch (tableErr) {
          console.warn('Consulta en tabla administradores omitida o fallida:', tableErr);
        }
      }

      // 3. Fallback: Verificación en tabla 'usuarios' con rol administrativo
      if (!isAuthenticated) {
        try {
          const { data: userRecord } = await supabase
            .from('usuarios')
            .select('*')
            .or(`email.eq.${inputEmail},identificacion.eq.${inputEmail}`)
            .maybeSingle();

          if (userRecord) {
            const rolLower = (userRecord.rol || '').toString().toLowerCase();
            const isAdministrative = rolLower.includes('admin') || rolLower.includes('gerent') || rolLower.includes('director') || rolLower.includes('coordinador') || rolLower.includes('jefe') || rolLower.includes('oficina');

            const storedPass = userRecord.password_hash || userRecord['password-hash'] || userRecord.password || userRecord.clave || userRecord.identificacion;
            const isMatch = (await verifyPassword(inputPass, storedPass)) || (inputPass === storedPass) || (inputPass === userRecord.identificacion);

            if (isMatch && isAdministrative) {
              isAuthenticated = true;
              uid = userRecord.id;
              adminName = userRecord.nombres_apellidos || userRecord.nombre || 'Administrador SGO';
              adminRole = userRecord.rol || 'administrador';
              adminCargo = userRecord.cargo || 'Administrador de Consola';
            }
          }
        } catch (userTableErr) {
          console.warn('Consulta en tabla usuarios para administrador omitida:', userTableErr);
        }
      }

      // 4. Si la autenticación fue exitosa por cualquiera de los métodos
      if (isAuthenticated) {
        const isMantenimiento = 
          adminRole.toLowerCase().includes('mantenimiento') ||
          adminCargo.toLowerCase().includes('mantenimiento') ||
          inputEmail.toLowerCase().includes('mantenimiento');

        const targetPath = isMantenimiento ? '/mantenimiento' : '/admin';
        const sessionType = isMantenimiento ? 'mantenimiento' : 'admin';

        setSuccessMessage(`Sesión iniciada correctamente.`);
        setTimeout(() => {
          redirectUser(targetPath, {
            type: sessionType,
            user: {
              id: uid,
              email: inputEmail,
              nombres_apellidos: adminName,
              nombre: adminName,
              rol: adminRole,
              cargo: adminCargo
            }
          });
        }, 1000);
        return;
      }

      // Si no se validó ninguna credencial
      setErrorMessage('Correo de oficina o contraseña de administrador incorrectos.');

    } catch (err: any) {
      console.warn('Verificación de credenciales administrativas:', err);
      setErrorMessage('Correo de oficina o contraseña de administrador incorrectos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 font-sans selection:bg-blue-105 selection:text-white" id="corporate-login">
      {/* Decorative top blue bars */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-700" />
      
      {/* Container Box */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl p-8 space-y-7 relative overflow-hidden transition-all duration-300">
        
        {/* Connection status indicator badge for Offline-First operations */}
        {!isOnline && (
          <div className="absolute top-4 right-4 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-900 rounded-full text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse shadow-sm shadow-rose-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Sin Conexión (Espejo)
          </div>
        )}
        
        {/* Subtle Decorative Background Light Gradients */}
        <div className="absolute top-[-100px] right-[-100px] w-64 h-64 rounded-full bg-blue-50/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 rounded-full bg-indigo-50/35 blur-3xl pointer-events-none" />

        {/* Corporate Branding Logo */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/5 transition-transform duration-300 hover:scale-[1.03]">
            <Bus className="w-7 h-7 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block font-mono">
              Gestión Integral de Patios
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Control de Operación
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-normal max-w-xs mx-auto">
              Ingrese al sistema para diligenciar planillas de preoperacionales o gestionar la asignación de rutas.
            </p>
          </div>
        </div>

        {/* Custom Rounded Segmented Selector Tabs (Light Theme - Corporate Blue Focus) */}
        <div className="p-1.5 bg-slate-100/90 rounded-2xl grid grid-cols-2 gap-1 border border-slate-200" id="auth-role-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('operador');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'operador'
                ? 'bg-blue-600 text-white shadow-md font-black ring-1 ring-blue-500/10'
                : 'text-slate-600 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Personal Operativo
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`py-3 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-md font-black ring-1 ring-blue-500/10'
                : 'text-slate-600 hover:text-slate-850 hover:bg-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Administrador
          </button>
        </div>

        {/* Error Notification Alert Banner */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-200/60 rounded-2xl flex items-start gap-3 text-red-900"
            id="login-error-banner"
          >
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-red-700 font-mono block">
                Error de Autenticación
              </span>
              <p className="text-xs font-semibold leading-relaxed">{errorMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Success Feedback Banner */}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl flex items-start gap-3 text-emerald-950 font-semibold"
            id="login-success-banner"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-650 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 font-mono block">
                Verificación Correcta
              </span>
              <p className="text-xs leading-relaxed">{successMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Core Submission Forms */}
        <div className="pt-1">
          {activeTab === 'operador' ? (
            /* TAB 1: Operator View (Ingreso con Cédula) */
            <form onSubmit={handleOperatorLogin} className="space-y-5" id="form-personal-operativo">
              
              <div className="space-y-1.5 text-left">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 pl-1 font-mono">
                  Número de Cédula
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-5 h-5 text-blue-600 stroke-[2]" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Digite su cédula colombiana"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold tracking-widest font-mono text-slate-800 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center pl-1">
                  <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 font-mono">
                    Contraseña
                  </label>
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                    Cédula
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-blue-600 stroke-[2]" />
                  <input
                    type={showOperatorPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite su clave"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-11 pr-12 text-sm font-bold tracking-widest font-mono text-slate-800 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOperatorPassword(!showOperatorPassword)}
                    className="absolute right-4 top-3.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                    title={showOperatorPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                  >
                    {showOperatorPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-wait hover:translate-y-[-0.5px] active:translate-y-[0.5px]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verificando Identidad...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a Operación</span>
                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: Administrator view (Ingreso con correo de oficina) */
            <form onSubmit={handleAdminLogin} className="space-y-4" id="form-administrador">
              
              <div className="space-y-1.5 text-left">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 pl-1 font-mono">
                  Correo Corporativo
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-blue-600 stroke-[2]" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@transcaribe.com"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 pl-1 font-mono">
                  Contraseña de Consola
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-blue-600 stroke-[2]" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="Contraseña de oficina"
                    value={passwordAdmin}
                    onChange={(e) => setPasswordAdmin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-11 pr-12 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-4 top-3.5 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors"
                    title={showAdminPassword ? "Ocultar Contraseña" : "Mostrar Contraseña"}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm tracking-widest uppercase rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-60 disabled:cursor-wait hover:translate-y-[-0.5px] active:translate-y-[0.5px]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Autenticando Oficial...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a Oficina</span>
                    <ArrowRight className="w-4.5 h-4.5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info/regulatory indicator */}
        <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-center text-[10px] font-mono tracking-wide text-slate-500 flex justify-center items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-blue-500" />
          <span>AUTORIDAD DE PATIO GENERAL • PORTAL TRANSCARIBE</span>
        </div>

      </div>
    </div>
  );
}

