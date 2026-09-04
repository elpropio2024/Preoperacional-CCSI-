import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserX, 
  Search, 
  Loader2, 
  RefreshCw, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Users
} from 'lucide-react';
import { supabase } from '../lib/apiClients';

interface Conductor {
  id: string;
  identificacion: string;
  nombres_apellidos: string;
  activo: boolean;
}

export default function GestionConductores() {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track loading state per row ID to show exact spinners
  const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

  // States for adding a new operator
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newCedula, setNewCedula] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch all operators
  const fetchConductores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: bdError } = await supabase
        .from('operadores')
        .select('id, identificacion, nombres_apellidos, activo')
        .order('nombres_apellidos', { ascending: true });

      if (bdError) throw bdError;

      setConductores(data || []);
    } catch (err: any) {
      console.error('Error cargando conductores desde Supabase:', err);
      setError(`No se pudieron sincronizar los operadores con Supabase: ${err.message || err}.`);
      // Fallback with visual safety for development environment
      generateDemoConductores();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoConductores = () => {
    setConductores([
      { id: '1', identificacion: '1047432922', nombres_apellidos: 'Carlos Alberto Perez Diaz', activo: true },
      { id: '2', identificacion: '73155921', nombres_apellidos: 'Juan Camilo Mendoza Ramos', activo: true },
      { id: '3', identificacion: '1047112340', nombres_apellidos: 'Ernesto Julio Berrio', activo: false },
      { id: '4', identificacion: '33120454', nombres_apellidos: 'Marcos Antonio Perez', activo: true }
    ]);
  };

  useEffect(() => {
    fetchConductores();
  }, []);

  // Toggle active status in real-time
  const toggleEstadoConductor = async (id: string, estadoActual: boolean) => {
    if (loadingRowId) return; // Prevent concurrent requests
    setLoadingRowId(id);
    setActionSuccess(null);
    setError(null);

    const nuevoEstado = !estadoActual;

    try {
      // Direct real update to Supabase
      const { error: updateError } = await supabase
        .from('operadores')
        .update({ activo: nuevoEstado })
        .eq('id', id);

      if (updateError) throw updateError;

      // Update state locally
      setConductores(prev => 
        prev.map(c => c.id === id ? { ...c, activo: nuevoEstado } : c)
      );

      setActionSuccess(`Estado de acceso actualizado correctamente.`);
      setTimeout(() => setActionSuccess(null), 3000);

    } catch (err: any) {
      console.error('Error actualizando estado en Supabase:', err);
      // Fallback update in case of schema discrepancy or missing policies
      setConductores(prev => 
        prev.map(c => c.id === id ? { ...c, activo: nuevoEstado } : c)
      );
      setError(`Se aplicó el cambio a nivel de visor local, pero Supabase reportó: ${err.message || 'Error de permisos'}`);
    } finally {
      setLoadingRowId(null);
    }
  };

  // Create new Operator
  const handleCreateConductor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim() || !newCedula.trim()) return;

    setIsLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      // Cédula doubles as the default password_hash (which is crypt verified)
      const defaultHash = newCedula.trim(); // Simulating default password
      
      const { data, error: insertError } = await supabase
        .from('operadores')
        .insert([
          { 
            identificacion: newCedula.trim(), 
            nombres_apellidos: newNombre.trim(), 
            activo: true, 
            password_hash: defaultHash 
          }
        ])
        .select();

      if (insertError) throw insertError;

      if (data && data.length > 0) {
        setConductores(prev => [...prev, data[0]].sort((a, b) => a.nombres_apellidos.localeCompare(b.nombres_apellidos)));
      } else {
        // Fallback fetch
        await fetchConductores();
      }

      setActionSuccess(`Conductor "${newNombre}" registrado con acceso exitosamente.`);
      setNewNombre('');
      setNewCedula('');
      setIsAddingNew(false);

    } catch (err: any) {
      console.error('Error insertando conductor en Supabase:', err);
      setError(`No se pudo guardar el registro: ${err.message || 'Error de base de datos'}.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter conductores by search input
  const filteredConductores = conductores.filter(item => {
    const name = item.nombres_apellidos.toLowerCase();
    const idNum = item.identificacion.toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || idNum.includes(q);
  });

  const totalActivos = conductores.filter(c => c.activo).length;
  const totalBloqueados = conductores.filter(c => !c.activo).length;

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl" id="gestion-conductores-container">
      
      {/* Header and Controls */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-200">
              Gestión de Operadores
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Habilite o deniegue el acceso de conductores para envío de planillas móviles en Cartagena.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sincronizar Button */}
          <button
            type="button"
            onClick={fetchConductores}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl transition-all border border-slate-700/60 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            title="Refrescar Lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          {/* Registrar Conductor Button */}
          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrar Operador</span>
          </button>
        </div>

      </div>

      {/* Quick Access Status metrics */}
      <div className="grid grid-cols-3 border-b border-slate-800/60 bg-slate-950/20 text-center font-mono py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest divide-x divide-slate-800/60">
        <div>
          Total: <span className="text-white font-black">{conductores.length}</span>
        </div>
        <div className="text-emerald-400">
          Con Acceso: <span className="font-black text-emerald-350">{totalActivos}</span>
        </div>
        <div className="text-rose-450">
          Bloqueados: <span className="font-black text-rose-400">{totalBloqueados}</span>
        </div>
      </div>

      {/* Adding conduction operator modal form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-950/50 border-b border-slate-800/80"
          >
            <form onSubmit={handleCreateConductor} className="p-5 space-y-4 max-w-lg">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">Nuevo Registro de Conductor</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Carlos Enrique Perez"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600 font-semibold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 font-mono">Cédula (Usuario / Clave)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="E.g. 1047452399"
                    value={newCedula}
                    onChange={(e) => setNewCedula(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all placeholder:text-slate-600 font-bold font-mono tracking-widest"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewNombre('');
                    setNewCedula('');
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded-xl text-xs font-bold font-sans cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Guardar Conductor</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Indicators Banners */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/20 border-b border-emerald-800/40 text-emerald-400 text-xs flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/20 border-b border-rose-800/30 text-rose-450 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar Input */}
      <div className="p-4 bg-slate-950/45 border-b border-slate-800/80 flex items-center relative">
        <Search className="absolute left-7 top-7 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filtrar por nombres o cédula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800/85 text-xs rounded-2xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-semibold font-mono"
        />
      </div>

      {/* Table grid layout list */}
      <div className="overflow-x-auto">
        {isLoading && conductores.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
            <span className="text-xs text-slate-500 font-mono">Descargando padrón de conductores de Supabase...</span>
          </div>
        ) : filteredConductores.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2.5 p-6 text-center text-slate-550">
            <Database className="w-8 h-8 text-slate-800" />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-450 block">Ningún operador coincide</span>
              <span className="text-[11px] text-slate-600 mt-0.5 block">Revise la ortografía de búsqueda o agregue un nuevo operador.</span>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto min-w-[500px]">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800/80 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 font-mono">
                <th className="px-5 py-3">Nombre del Operador</th>
                <th className="px-5 py-3">Cédula</th>
                <th className="px-5 py-3">ID Interno</th>
                <th className="px-5 py-3 text-center">Permisos de Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-xs font-semibold text-slate-300">
              {filteredConductores.map((item) => {
                const isRowLoading = loadingRowId === item.id;
                
                return (
                  <tr key={item.id} className="hover:bg-slate-800/25 transition-colors">
                    
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.activo ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        <span className="text-white text-xs font-bold tracking-tight">
                          {item.nombres_apellidos}
                        </span>
                      </div>
                    </td>

                    {/* Cédula */}
                    <td className="px-5 py-4 text-[11px] font-mono font-bold text-slate-400">
                      {item.identificacion}
                    </td>

                    {/* Operator ID Code */}
                    <td className="px-5 py-4 text-[10px] text-slate-550 font-mono">
                      #{item.id.slice(0, 8)}
                    </td>

                    {/* Power control toggle button */}
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleEstadoConductor(item.id, item.activo)}
                        disabled={isRowLoading}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer border min-w-[130px] shadow-sm select-none ${
                          isRowLoading
                            ? 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-wait'
                            : item.activo
                              ? 'bg-emerald-500 hover:bg-emerald-450 text-slate-950 border-emerald-400/30 font-black'
                              : 'bg-rose-955 hover:bg-rose-900 border-rose-900/40 text-rose-300'
                        }`}
                      >
                        {isRowLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Procesando</span>
                          </>
                        ) : item.activo ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>CON ACCESO</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>BLOQUEADO</span>
                          </>
                        )}
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
