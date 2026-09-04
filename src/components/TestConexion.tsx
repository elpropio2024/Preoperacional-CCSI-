import { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Play, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function TestConexion() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    success: boolean;
    mensaje: string;
    detalles: string;
  } | null>(null);

  const probarConexion = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*');

      if (error) {
        setResultado({
          success: false,
          mensaje: 'Supabase retornó un error al consultar la tabla "operadores":',
          detalles: JSON.stringify(error, null, 2),
        });
      } else {
        setResultado({
          success: true,
          mensaje: `Conexión exitosa. Se recibieron ${data?.length || 0} filas de la tabla "operadores":`,
          detalles: JSON.stringify(data, null, 2),
        });
      }
    } catch (err: any) {
      setResultado({
        success: false,
        mensaje: 'Error de excepción inesperado de Javascript/Red:',
        detalles: err.stack || err.message || JSON.stringify(err, null, 2),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 p-6 rounded-2xl border border-slate-200 dark:border-zinc-805 bg-white dark:bg-black text-slate-900 dark:text-white transition-all duration-300 shadow-xl" id="diagnostic-test-view">
      <div className="border-b border-slate-200 dark:border-zinc-800 pb-4 mb-6">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Terminal de Diagnóstico de Supabase Real
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-500 font-medium">
          Prueba el estado de conexión directa de la tabla "operadores" y la resolución del cliente de Supabase (URL / API Key).
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-start">
          <button
            type="button"
            onClick={probarConexion}
            disabled={loading}
            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white dark:text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ejecutando Test...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 shrink-0" />
                <span>Probar Conexión con Supabase</span>
              </>
            )}
          </button>
        </div>

        {resultado && (
          <div className="space-y-4 animate-fade-in">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              resultado.success 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
            }`}>
              {resultado.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-650 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wide block">
                  {resultado.success ? 'Diagnóstico Completado con Éxito' : 'Fallo en la Conexión de Supabase'}
                </span>
                <p className="text-xs font-semibold leading-relaxed">
                  {resultado.mensaje}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest font-mono text-slate-400 dark:text-zinc-600 block">
                Salida de la Base de Datos (Terminal Console)
              </span>
              <pre className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-emerald-300 font-mono text-xs overflow-auto max-h-96 border border-slate-205 dark:border-zinc-900/80 leading-relaxed shadow-inner">
                {resultado.detalles}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
