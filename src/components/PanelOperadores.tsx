import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Search, User, CheckCircle, XCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PanelOperadores() {
  // Estado para operadores
  const [operadores, setOperadores] = useState<any[]>([]);
  // Estado para búsqueda
  const [busqueda, setBusqueda] = useState('');
  // Estado de carga
  const [loading, setLoading] = useState(true);
  // Estado de error
  const [error, setError] = useState<string | null>(null);

  // Lógica de Paginación Estricta
  const [paginaActual, setPaginaActual] = useState(1);
  const FILAS_POR_PAGINA = 12;

  // Cada vez que el estado 'busqueda' cambie, resetea la página a 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  // Función asíncrona 'fetchOperadores' externa al useEffect para poder reutilizarla
  const fetchOperadores = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('operadores')
        .select('id, nombres_apellidos, identificacion, cargo, activo')
        .order('nombres_apellidos', { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setOperadores(data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión inesperado');
    } finally {
      setLoading(false);
    }
  };

  // useEffect que ejecuta la función asíncrona 'fetchOperadores'
  useEffect(() => {
    fetchOperadores();
  }, []);

  // Función de Actualización (handleToggleEstado)
  const handleToggleEstado = async (operadorId: any, estadoActual: boolean) => {
    try {
      const { error: updateErr } = await supabase
        .from('operadores')
        .update({ activo: !estadoActual })
        .eq('id', operadorId);

      if (updateErr) {
        setError(updateErr.message);
      } else {
        await fetchOperadores();
      }
    } catch (err: any) {
      setError(err.message || 'Error al intentar actualizar el estado del operador');
    }
  };

  // Filtrado en tiempo real
  const operadoresFiltrados = operadores.filter((op) => {
    const texto = busqueda.toLowerCase().trim();
    if (!texto) return true;
    const nombre = (op.nombres_apellidos || '').toLowerCase();
    const id = (op.identificacion || '').toLowerCase();
    return nombre.includes(texto) || id.includes(texto);
  });

  // Cálculo de índices para paginación
  const ultimoIndice = paginaActual * FILAS_POR_PAGINA;
  const primerIndice = ultimoIndice - FILAS_POR_PAGINA;
  const operadoresPagina = operadoresFiltrados.slice(primerIndice, ultimoIndice);
  const totalPaginas = Math.ceil(operadoresFiltrados.length / FILAS_POR_PAGINA);

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-black text-slate-900 dark:text-white transition-all duration-300 shadow-xl overflow-hidden" id="panel-operadores">
      {/* Cabecera / Barra Superior */}
      <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-black">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-900">
            <User className="w-5 h-5 text-blue-600 dark:text-emerald-450" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Gestión Integral de Operadores
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium">
              Conexión directa y segura con servicio de base de datos de Supabase.
            </p>
          </div>
        </div>

        {/* Input de búsqueda */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-emerald-400" />
          <input
            type="text"
            placeholder="Buscar por cédula o nombres..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full text-xs rounded-xl pl-10 pr-4 py-2.5 font-semibold transition-all border bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-650 focus:outline-none focus:border-blue-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-blue-500/10 dark:focus:ring-emerald-500/10"
          />
        </div>
      </div>

      {/* Banner de Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-rose-950/20 border-b border-red-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-400 text-xs font-bold font-mono flex items-center gap-2 animate-fade-in">
          <XCircle className="w-4.5 h-4.5 text-red-600 dark:text-rose-450 shrink-0" />
          <span>Error al conectar con Supabase: {error}</span>
        </div>
      )}

      {/* Área del loader y tabla */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-500 tracking-wide">
              Estableciendo enlace de red con servidor...
            </span>
          </div>
        ) : (
          <>
            {/* Rejilla Grid y Tabla 100% Responsiva */}
            <div className="w-full overflow-x-auto block whitespace-nowrap min-w-full">
              <table className="w-full text-left border-collapse table-auto min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-[10px] uppercase font-mono tracking-widest bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400">
                    <th className="px-6 py-4.5 font-extrabold">Nombres y Apellidos</th>
                    <th className="px-6 py-4.5 font-extrabold">Cédula</th>
                    <th className="px-6 py-4.5 font-extrabold">Cargo</th>
                    <th className="px-6 py-4.5 font-extrabold text-center">Estado</th>
                    <th className="px-6 py-4.5 font-extrabold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-900">
                  {operadoresPagina.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-xs font-mono text-slate-500 dark:text-zinc-600 font-bold uppercase tracking-wide">
                        Sin coincidencias registradas de operadores.
                      </td>
                    </tr>
                  ) : (
                    operadoresPagina.map((item, index) => {
                      const alternanceClass = index % 2 === 0
                        ? "bg-white dark:bg-zinc-950"
                        : "bg-slate-50 dark:bg-zinc-900/60";

                      return (
                        <tr 
                          key={item.identificacion} 
                          className={`${alternanceClass} hover:bg-slate-100/50 dark:hover:bg-zinc-900/10 transition-colors text-xs font-semibold`}
                        >
                          {/* Nombres y Apellidos */}
                          <td className="px-6 py-4.5 text-slate-900 dark:text-white">
                            <span className="font-black tracking-tight block">
                              {item.nombres_apellidos}
                            </span>
                          </td>

                          {/* Cédula */}
                          <td className="px-6 py-4.5 font-bold font-mono text-slate-900 dark:text-white">
                            {item.identificacion}
                          </td>

                          {/* Cargo */}
                          <td className="px-6 py-4.5 font-medium text-slate-900 dark:text-zinc-200">
                            {item.cargo}
                          </td>

                          {/* Estado */}
                          <td className="px-6 py-4.5 text-center">
                            {item.activo ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                                <span>Activo</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-450 border border-rose-200 dark:border-rose-900/40">
                                <XCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                                <span>Inactivo</span>
                              </div>
                            )}
                          </td>

                          {/* Acciones (Toggle Switch) */}
                          <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                            <div className="flex justify-center items-center">
                              <button
                                type="button"
                                onClick={() => handleToggleEstado(item.id, item.activo)}
                                className={`
                                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                                  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black
                                  ${item.activo ? 'bg-emerald-500' : 'bg-zinc-700'}
                                `}
                              >
                                <span
                                  className={`
                                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                                    transition duration-200 ease-in-out
                                    ${item.activo ? 'translate-x-5' : 'translate-x-0'}
                                  `}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Barra de Navegación Inferior (Paginador) */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
              <button
                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1 || totalPaginas === 0}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wide disabled:opacity-40 disabled:hover:bg-transparent transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <span className="text-xs font-bold font-mono text-slate-500 dark:text-zinc-400">
                PÁGINA {totalPaginas === 0 ? 0 : paginaActual} DE {totalPaginas}
              </span>

              <button
                onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas || totalPaginas === 0}
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
  );
}
