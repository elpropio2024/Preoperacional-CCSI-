import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle, 
  ShieldCheck, 
  Sparkles,
  Bus,
  ArrowRight,
  RefreshCw,
  MapPin,
  Sun,
  Moon
} from 'lucide-react';
import { supabase } from '../lib/apiClients';
import { useTheme } from '../context/ThemeContext';

// Session format expected by App.tsx
export type UserSession = 
  | { type: 'operator'; user: { id: string; identificacion: string; nombres_apellidos: string; nombre?: string; cargo?: string; cedula?: string } }
  | { type: 'admin'; token: string; user: { id: string; email: string; nombre_completo: string } };

interface LoginUnificadoProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginUnificado({ onLoginSuccess }: LoginUnificadoProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'operador' | 'admin'>('operador');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // TAB 1: OPERADOR STATES
  const [cedula, setCedula] = useState('');
  const [claveCedula, setClaveCedula] = useState('');
  const [showOperatorClave, setShowOperatorClave] = useState(false);

  // TAB 2: ADMIN STATES
  const [emailAdmin, setEmailAdmin] = useState('');
  const [passwordAdmin, setPasswordAdmin] = useState('');
  const [showAdminClave, setShowAdminClave] = useState(false);

  // SUBMIT OPERADOR LOGIN
  const handleOperatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedula.trim() || !claveCedula.trim()) {
      setErrorMessage('Por favor ingrese su cédula y su contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Direct call to the PostgreSQL RPC function
      const { data, error } = await supabase.rpc('verificar_password_operador', {
        p_cedula: cedula.trim(),
        p_password_plana: claveCedula.trim()
      });

      if (error) {
        throw new Error(`Error de conexión o de base de datos: ${error.message}`);
      }

      // The RPC returns a set of or table array. We grab the first record.
      const operador = data?.[0];

      // Check validation flags returned from RPC
      if (!operador || operador.v_valido === false) {
        setErrorMessage('Error de credenciales');
        setIsLoading(false);
        return;
      }

      if (operador.v_activo === false) {
        setErrorMessage('ACCESO DENEGADO: Usuario inactivo');
        setIsLoading(false);
        return;
      }

      // If all validations pass (v_valido is true and v_activo is true), allocate session
      onLoginSuccess({
        type: 'operator',
        user: {
          id: operador.v_id,
          identificacion: cedula.trim(),
          nombres_apellidos: operador.v_nombres || 'Operador Transcaribe',
          nombre: operador.v_nombres || 'Operador Transcaribe',
          cargo: operador.v_cargo || 'Operador de Bus',
          cedula: cedula.trim()
        }
      });

    } catch (err: any) {
      console.error('Error in operator login logic via RPC:', err);
      setErrorMessage(err.message || 'Error inesperado al validar operatividad.');
    } finally {
      setIsLoading(false);
    }
  };

  // SUBMIT ADMIN LOGIN
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAdmin.trim() || !passwordAdmin.trim()) {
      setErrorMessage('Por favor ingrese correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Native official Supabase Auth signing
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailAdmin.trim(),
        password: passwordAdmin.trim()
      });

      if (error) {
        setErrorMessage(`AUTENTICACIÓN RECHAZADA: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (!data || !data.user) {
        setErrorMessage('No se pudo establecer sesión segura.');
        setIsLoading(false);
        return;
      }

      // Query verification on public administradores table
      let adminName = 'Administrador de Patio';
      try {
        const { data: adminProfile, error: profileError } = await supabase
          .from('administradores')
          .select('nombre_completo')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Error fetching custom admin metadata from administradores table:', profileError.message);
        } else if (adminProfile && adminProfile.nombre_completo) {
          adminName = adminProfile.nombre_completo;
        }
      } catch (profileErr) {
        console.warn('administradores lookup failed, fallback to login details.', profileErr);
      }

      // Complete session callback
      onLoginSuccess({
        type: 'admin',
        token: data.session?.access_token || 'native_session_token',
        user: {
          id: data.user.id,
          email: data.user.email || emailAdmin,
          nombre_completo: adminName
        }
      });

    } catch (err: any) {
      console.error('Catch admin auth logic:', err);
      setErrorMessage(err.message || 'Error al autenticarse en el servidor auth.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-screen transition-colors duration-300 flex flex-col justify-center items-center px-4 py-8 font-sans relative ${
      isLight ? 'bg-white text-slate-900' : 'bg-black text-zinc-50'
    }`} id="integrated-login-unified">
      
      {/* Upper floating theme switcher */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-3 rounded-full border transition-all duration-300 shadow-md flex items-center justify-center gap-2 font-bold text-xs cursor-pointer ${
            isLight 
              ? 'bg-white border-slate-300 hover:bg-slate-150 text-blue-600' 
              : 'bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-emerald-400'
          }`}
          title={isLight ? "Cambiar a Modo Noche" : "Cambiar a Modo Sol"}
        >
          {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          <span className="hidden sm:inline font-mono uppercase tracking-widest text-[9px]">
            {isLight ? 'Noche' : 'SOL (Patios)'}
          </span>
        </button>
      </div>

      {/* Decorative Blur Background Bulbs (Hidden or dimmed in Light Mode for max contrast) */}
      {!isLight && (
        <>
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 left-1/3 -translate-y-1/2 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
        </>
      )}

      {/* Main Centered Mobile Box max-w-md */}
      <div className={`w-full max-w-md p-6 sm:p-8 rounded-3xl transition-all duration-300 ${
        isLight 
          ? 'bg-white border-2 border-slate-200 shadow-2xl space-y-6' 
          : 'bg-black border border-zinc-800 shadow-2xl relative space-y-6'
      }`}>
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-300 ${
            isLight 
              ? 'bg-blue-50 border border-blue-205 text-blue-600' 
              : 'bg-emerald-500/10 border border-emerald-550/20 text-emerald-400'
          }`}>
            <Bus className="w-6 h-6 shrink-0" />
          </div>
          <div className="space-y-1">
            <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest font-mono ${
              isLight ? 'text-slate-550' : 'text-zinc-500'
            }`}>
              <MapPin className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              <span>TRANS CARIBE • CARTAGENA</span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-extrabold tracking-tight transition-colors ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Ingreso Centralizado
            </h2>
            <p className={`text-xs font-medium transition-colors ${
              isLight ? 'text-slate-600' : 'text-zinc-400'
            }`}>
              Gestor de preoperacionales y control vial de patios
            </p>
          </div>
        </div>

        {/* Unified High-Contrast Selector Tabs */}
        <div className={`p-1 rounded-2xl transition-colors duration-300 grid grid-cols-2 gap-1 ${
          isLight ? 'bg-slate-100 border border-slate-200' : 'bg-zinc-950 border border-zinc-850'
        }`} id="hybrid-auth-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('operador');
              setErrorMessage(null);
            }}
            className={`py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'operador' 
                ? isLight 
                  ? 'bg-blue-600 text-white shadow-md font-black' 
                  : 'bg-emerald-500 text-black shadow-md font-black' 
                : isLight 
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' 
                  : 'text-zinc-405 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Conductor / Operador
          </button>
          
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setErrorMessage(null);
            }}
            className={`py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin' 
                ? isLight 
                  ? 'bg-blue-600 text-white shadow-md font-black' 
                  : 'bg-emerald-500 text-black shadow-md font-black' 
                : isLight 
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50' 
                  : 'text-zinc-405 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Administrador
          </button>
        </div>

        {/* Dynamic Alerts Block (Semaphore Crimson Error Banner with extremely high contrast) */}
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
              isLight 
                ? 'bg-red-50 border-red-300 text-red-950 font-black'
                : 'bg-red-955/35 border-red-900/40 text-red-400 font-extrabold'
            }`}
            id="error-banner"
          >
            <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${isLight ? 'text-red-700' : 'text-red-500'}`} />
            <div className="space-y-0.5 text-left">
              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono block ${isLight ? 'text-red-800' : 'text-red-400'}`}>
                Alerta del Sistema
              </span>
              <p className="text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </motion.div>
        )}

        {/* Tab content */}
        <div className="pt-2">
          {activeTab === 'operador' ? (
            /* TAB 1: FORM CONDUCTOR / OPERADOR */
            <form onSubmit={handleOperatorLogin} className="space-y-4" id="operator-auth-form">
              <div className="space-y-1.5 text-left">
                <label className={`text-[10.5px] font-bold uppercase tracking-widest pl-1 font-mono ${
                  isLight ? 'text-slate-705' : 'text-zinc-450'
                }`}>
                  Usuario (Cédula)
                </label>
                <div className="relative">
                  <User className={`absolute left-4 top-3.5 w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Digite su cédula sin puntos"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                    className={`w-full border-2 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold tracking-widest font-mono focus:outline-none transition-all ${
                      isLight 
                        ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans' 
                        : 'bg-zinc-950/60 border-zinc-850 text-white focus:border-emerald-500 placeholder:text-zinc-650 placeholder:tracking-normal placeholder:font-sans'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className={`text-[10.5px] font-bold uppercase tracking-widest pl-1 font-mono ${
                  isLight ? 'text-slate-705' : 'text-zinc-455'
                }`}>
                  Contraseña (Cédula)
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-3.5 w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                  <input
                    type={showOperatorClave ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    placeholder="Digite su clave numérica"
                    value={claveCedula}
                    onChange={(e) => setClaveCedula(e.target.value.replace(/\D/g, ''))}
                    className={`w-full border-2 rounded-2xl py-3 pl-11 pr-12 text-sm font-bold tracking-widest font-mono focus:outline-none transition-all ${
                      isLight 
                        ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans' 
                        : 'bg-zinc-950/60 border-zinc-850 text-white focus:border-emerald-500 placeholder:text-zinc-650 placeholder:tracking-normal placeholder:font-sans'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOperatorClave(!showOperatorClave)}
                    className="absolute right-4 top-3 w-6 h-6 flex items-center justify-center text-slate-450 hover:text-slate-800 dark:hover:text-emerald-400 transition-colors"
                  >
                    {showOperatorClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 font-black text-sm tracking-wider uppercase rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-md ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.01]' 
                    : 'bg-emerald-500 hover:bg-emerald-450 text-black hover:scale-[1.01]'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className={`w-4 h-4 animate-spin ${isLight ? 'text-white' : 'text-black'}`} />
                    <span>Verificando Conductor...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a Planilla Móvil</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* TAB 2: FORM ADMINISTRADOR */
            <form onSubmit={handleAdminLogin} className="space-y-4" id="admin-auth-form">
              <div className="space-y-1.5 text-left">
                <label className={`text-[10.5px] font-bold uppercase tracking-widest pl-1 font-mono ${
                  isLight ? 'text-slate-705' : 'text-zinc-450'
                }`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-3.5 w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@transcaribe.com"
                    value={emailAdmin}
                    onChange={(e) => setEmailAdmin(e.target.value)}
                    className={`w-full border-2 rounded-2xl py-3 pl-11 pr-4 text-sm font-semibold focus:outline-none transition-all ${
                      isLight 
                        ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600 placeholder:text-slate-400' 
                        : 'bg-zinc-955 border-zinc-850 text-white focus:border-emerald-500 placeholder:text-zinc-650'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className={`text-[10.5px] font-bold uppercase tracking-widest pl-1 font-mono ${
                  isLight ? 'text-slate-705' : 'text-zinc-450'
                }`}>
                  Contraseña Personalizada
                </label>
                <div className="relative">
                  <Lock className={`absolute left-4 top-3.5 w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                  <input
                    type={showAdminClave ? 'text' : 'password'}
                    required
                    placeholder="Ingrese su clave secreta"
                    value={passwordAdmin}
                    onChange={(e) => setPasswordAdmin(e.target.value)}
                    className={`w-full border-2 rounded-2xl py-3 pl-11 pr-12 text-sm font-semibold focus:outline-none transition-all ${
                      isLight 
                        ? 'bg-white border-slate-205 text-slate-900 focus:border-blue-600 placeholder:text-slate-400' 
                        : 'bg-zinc-955 border-zinc-850 text-white focus:border-emerald-500 placeholder:text-zinc-655'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminClave(!showAdminClave)}
                    className="absolute right-4 top-3 w-6 h-6 flex items-center justify-center text-slate-450 hover:text-slate-850 dark:hover:text-emerald-400 transition-colors"
                  >
                    {showAdminClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 font-black text-sm tracking-wider uppercase rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-md ${
                  isLight 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-450 text-black'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className={`w-4 h-4 animate-spin ${isLight ? 'text-white' : 'text-black'}`} />
                    <span>Iniciando Sesión Auth...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar a Consola</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Bottom Disclaimer */}
        <div className={`p-3 rounded-2xl border text-center text-[10px] font-mono tracking-wider transition-colors duration-300 ${
          isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-950/60 border-zinc-850 text-zinc-500'
        }`}>
          Uso operativo exclusivo para personal autorizado.
        </div>

      </div>
    </div>
  );
}
