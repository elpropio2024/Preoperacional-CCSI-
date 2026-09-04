import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  XSquare, 
  User, 
  FileText, 
  Briefcase, 
  Shield 
} from 'lucide-react';

interface FormularioRegistroUsuarioProps {
  onSuccess?: () => void;
}

export default function FormularioRegistroUsuario({ onSuccess }: FormularioRegistroUsuarioProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Form states
  const [nombresApellidos, setNombresApellidos] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [cargo, setCargo] = useState('');
  const [rol, setRol] = useState('Operador');

  // Request feedback states
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setExito(false);

    // Form validation
    if (!nombresApellidos.trim() || !identificacion.trim() || !cargo.trim()) {
      setError('Todos los campos son estrictamente obligatorios.');
      setLoading(false);
      return;
    }

    try {
      // Inserción en la tabla de Supabase 'usuarios'
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([
          {
            nombres_apellidos: nombresApellidos.trim(),
            nombre: nombresApellidos.trim(), // Duplicamos para mantener compatibilidad híbrida
            identificacion: identificacion.trim(),
            cargo: cargo.trim(),
            rol: rol,
            password_hash: identificacion.trim(), // Cédula por defecto como password_hash inicial
            activo: true,
            email: `${identificacion.trim()}@ccsi.cartagena.gov` // correo por defecto técnico
          }
        ]);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setExito(true);
      // Limpiar formulario tras éxito
      setNombresApellidos('');
      setIdentificacion('');
      setCargo('');
      setRol('Operador');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al intentar registrar el usuario en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`w-full max-w-2xl mx-auto rounded-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${
        isLight ? 'bg-white border-slate-205 text-slate-900' : 'bg-black border-zinc-900 text-white'
      }`}
      id="formulario-registro-usuario-adm"
    >
      {/* Header Form */}
      <div className={`p-6 border-b flex items-center gap-3.5 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/80 border-zinc-900'
      }`}>
        <div className={`p-3 rounded-xl border ${
          isLight ? 'bg-blue-50 border-blue-105' : 'bg-zinc-900 border-zinc-800'
        }`}>
          <UserPlus className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">
            Registrar Nuevo Personal
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-bold uppercase font-mono tracking-tight">
            Terminal de Alta Operación - Cartagena
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Banner de Éxito */}
        {exito && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <span>El registro se ha guardado exitosamente en la base de datos Supabase. La contraseña inicial corresponde al número de identificación ingresado.</span>
          </div>
        )}

        {/* Banner de Error */}
        {error && (
          <div className="p-4 rounded-xl flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-xs font-semibold animate-fade-in">
            <XSquare className="w-5 h-5 text-rose-600 dark:text-rose-500 shrink-0" />
            <span className="font-mono">Error: {error}</span>
          </div>
        )}

        {/* Input: Nombres y Apellidos */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-mono">
            <User className="w-3.5 h-3.5" />
            <span>Nombres y Apellidos COMPLETOS</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Carlos Alberto Gómez Mendoza"
            value={nombresApellidos}
            onChange={(e) => setNombresApellidos(e.target.value)}
            disabled={loading}
            className={`w-full text-xs rounded-xl px-4 py-3 font-semibold transition-all border outline-none ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10' 
                : 'bg-zinc-950 border-zinc-900 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10'
            }`}
          />
        </div>

        {/* Dos Columnas: Cédula e Identificación */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cédula */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-mono">
              <FileText className="w-3.5 h-3.5" />
              <span>Número de Cédula (Contraseña Inicial)</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 1047209355"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              disabled={loading}
              className={`w-full text-xs rounded-xl px-4 py-3 font-bold font-mono transition-all border outline-none ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10' 
                  : 'bg-zinc-950 border-zinc-900 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10'
              }`}
            />
          </div>

          {/* Cargo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-mono">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Cargo (Texto descriptivo)</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Conductor de Bus Articulado"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              disabled={loading}
              className={`w-full text-xs rounded-xl px-4 py-3 font-semibold transition-all border outline-none ${
                isLight 
                  ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10' 
                  : 'bg-zinc-950 border-zinc-900 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10'
              }`}
            />
          </div>
        </div>

        {/* Selección del Rol */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Nivel de Acceso (Rol Administrativo)</span>
          </label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            disabled={loading}
            className={`w-full text-xs rounded-xl px-4 py-3 font-bold uppercase tracking-wider transition-all border outline-none cursor-pointer ${
              isLight 
                ? 'bg-white border-slate-200 text-slate-900 focus:border-blue-500' 
                : 'bg-zinc-950 border-zinc-900 text-white focus:border-emerald-500'
            }`}
          >
            <option value="Operador">Operador (Conductor de Patio)</option>
            <option value="Regulador">Regulador de Despacho</option>
            <option value="Jefe de Patio">Jefe de Patio Central</option>
            <option value="Admin">Administrador (Control Total)</option>
          </select>
        </div>

        {/* Botón de envío */}
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-900">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
              loading 
                ? 'opacity-60 cursor-not-allowed'
                : isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-md'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Registrando en Supabase...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4.5 h-4.5" />
                <span>Confirmar Alta de Personal</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
