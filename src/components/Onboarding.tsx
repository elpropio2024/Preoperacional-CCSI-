import React, { useState, useEffect } from 'react';
import { Database, Key, Globe, ArrowRight, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import { ConnectionConfig } from '../types';

interface OnboardingProps {
  onConnect: (config: ConnectionConfig) => void;
  isLoading: boolean;
  error: string | null;
}

export default function Onboarding({ onConnect, isLoading, error }: OnboardingProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Check if system has injected environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  useEffect(() => {
    // If environment variables were pre-set, let's pre-populate them
    if (envUrl) setUrl(envUrl);
    if (envKey) setAnonKey(envKey);
  }, [envUrl, envKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) return;
    onConnect({
      url: url.trim(),
      anonKey: anonKey.trim(),
    });
  };

  const handleUseDemo = () => {
    // Try to auto-connect to env if available, or guide them
    if (envUrl && envKey) {
      onConnect({ url: envUrl, anonKey: envKey });
    } else {
      // Prompt a public placeholder or show alert
      alert("Por favor ingresa las credenciales de tu proyecto de Supabase para continuar.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-4xl grid md:grid-cols-12 gap-8 bg-slate-950/40 p-6 md:p-8 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden" id="onboarding-card">
        {/* Decorative Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Info Column (Left) */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/50 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-mono mb-4">
              <Database className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Supabase Integration Client</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white mb-3 leading-tight">
              Conecta tu <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Base de Datos
              </span>
            </h1>
            
            <p className="text-slate-400 text-sm leading-relaxed">
              Explora tablas, ejecuta operaciones CRUD, consulta esquemas y genera código de forma instantánea para comenzar a compilar tu aplicación.
            </p>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
              <div className="text-slate-300 font-semibold mb-1 flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                ¿Dónde encontrar tus claves?
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Ve a tu panel de <span className="text-slate-200">Supabase &gt; Project Settings &gt; API</span>. Copia el <span className="text-slate-200">Project URL</span> y el <span className="text-slate-200">anon public key</span>.
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/60">
              <div className="text-slate-300 font-semibold mb-1 flex items-center gap-1.5 text-xs text-blue-400">
                <HelpCircle className="w-3.5 h-3.5" />
                Persistencia Recomendada
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Para no tener que ingresarlas cada vez, añádelas como variables de entorno <code className="text-blue-300">VITE_SUPABASE_URL</code> y <code className="text-blue-300">VITE_SUPABASE_ANON_KEY</code> en la sección <span className="text-slate-200">Secrets</span> de tu barra de herramientas.
              </p>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 font-mono">
            Conexión local directa a tu API de Supabase. Tus claves nunca viajan a servidores externos.
          </div>
        </div>

        {/* Input Column (Right) */}
        <div className="md:col-span-7 bg-slate-900/50 p-6 md:p-8 rounded-2xl border border-slate-800 relative z-10 flex flex-col justify-center">
          <form onSubmit={handleSubmit} className="space-y-5" id="connection-form">
            <h2 className="text-lg font-medium text-white mb-2">Configurar Credenciales</h2>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-300 animate-fadeIn" id="error-message">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <span className="font-semibold">Error de Conexión:</span> {error}
                </div>
              </div>
            )}

            {envUrl && envKey && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-300 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Claves detectadas en Secrets</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-bold rounded-lg transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  Conectar Auto <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* URL Input */}
            <div className="space-y-1.5">
              <label htmlFor="supabase-url" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Supabase Project URL
              </label>
              <input
                id="supabase-url"
                type="url"
                required
                placeholder="https://xxxxxxxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 text-slate-100 rounded-xl border border-slate-800 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 text-sm font-mono placeholder:text-slate-600 transition-all font-light"
              />
            </div>

            {/* Anon Key Input */}
            <div className="space-y-1.5">
              <label htmlFor="supabase-anon-key" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Supabase Anon / Public API Key
              </label>
              <textarea
                id="supabase-anon-key"
                required
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ii..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 text-slate-100 rounded-xl border border-slate-800 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 text-xs font-mono placeholder:text-slate-600 transition-all resize-none leading-relaxed"
              />
            </div>

            <button
              id="submit-button"
              type="submit"
              disabled={isLoading || !url || !anonKey}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Estableciendo Conexión...</span>
                </>
              ) : (
                <>
                  <span>Conectar Base de Datos</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
