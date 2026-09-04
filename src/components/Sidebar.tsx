import React, { useState } from 'react';
import { Database, Search, LogOut, Terminal, LayoutDashboard, Code, RefreshCw, AlertCircle, Plus, Smartphone } from 'lucide-react';
import { TableInfo, ConnectionConfig } from '../types';

interface SidebarProps {
  tables: TableInfo[];
  selectedTable: string | null;
  onSelectTable: (name: string | null) => void;
  onDisconnect: () => void;
  config: ConnectionConfig;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeView: 'crud' | 'query' | 'template' | 'preoperacional';
  onViewChange: (view: 'crud' | 'query' | 'template' | 'preoperacional') => void;
  onAddCustomTable?: (tableName: string) => void;
}

export default function Sidebar({
  tables,
  selectedTable,
  onSelectTable,
  onDisconnect,
  config,
  onRefresh,
  isRefreshing,
  activeView,
  onViewChange,
  onAddCustomTable,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const submitCustomTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    if (onAddCustomTable) {
      onAddCustomTable(newTableName.trim());
      setNewTableName('');
      setShowAddForm(false);
    }
  };

  const extractProjectRef = (url: string) => {
    try {
      const match = url.match(/https:\/\/(.*?)\.supabase/);
      return match ? match[1] : url;
    } catch {
      return url;
    }
  };

  return (
    <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-screen text-slate-300 font-sans shrink-0" id="app-sidebar">
      {/* Header Info */}
      <div className="p-5 border-b border-slate-800/85 bg-slate-950/70">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white leading-none">Supabase Core</h2>
              <span className="text-[10px] text-slate-500 font-mono">Conectado</span>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            title="Desconectar base de datos"
            className="w-8 h-8 rounded-lg border border-slate-800 hover:border-red-500/20 hover:bg-red-950/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Short Connection Meta */}
        <div className="text-[11px] font-mono bg-slate-900 border border-slate-800/60 p-2.5 rounded-xl space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Ref ID:</span>
            <span className="text-slate-300 font-medium truncate max-w-[140px]">{extractProjectRef(config.url)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Servicio:</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              Online (API)
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Views */}
      <div className="px-3 py-4 border-b border-slate-800/60 space-y-1">
        <button
          onClick={() => {
            onViewChange('crud');
            // Select first table if none is selected
            if (!selectedTable && tables.length > 0) {
              onSelectTable(tables[0].name);
            }
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
            activeView === 'crud'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-md shadow-emerald-500/2'
              : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Gestor CRUD de Tablas</span>
        </button>

        <button
          onClick={() => {
            onViewChange('template');
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
            activeView === 'template'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-md shadow-emerald-500/2'
              : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Generador de Código React</span>
        </button>

        <button
          onClick={() => {
            onViewChange('preoperacional');
          }}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-250 cursor-pointer ${
            activeView === 'preoperacional'
              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/1'
              : 'bg-emerald-500/5 hover:bg-slate-900 text-emerald-400 hover:text-white border border-emerald-500/15'
          }`}
        >
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Planilla Móvil (Habilitada)</span>
          </div>
          <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
            MÓVIL
          </span>
        </button>

        <button
          onClick={() => onViewChange('query')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
            activeView === 'query'
              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-md shadow-emerald-500/2'
              : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>SQL & Consultas JS</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40">
        {activeView === 'crud' || activeView === 'template' ? (
          <>
            <div className="p-4 flex items-center justify-between">
              <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                Tablas ({filteredTables.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  title="Añadir tabla manualmente"
                  className="w-6 h-6 rounded-md hover:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title="Recargar esquema de tablas"
                  className="w-6 h-6 rounded-md hover:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all cursor-pointer disabled:opacity-30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {showAddForm && (
              <form onSubmit={submitCustomTable} className="px-4 pb-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nombre de tabla"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl focus:outline-none focus:border-emerald-500/40 placeholder:text-slate-600 font-light"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Añadir
                </button>
              </form>
            )}

            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  placeholder="Buscar tabla..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 transition-all font-light"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5" id="sidebar-tables-list">
              {filteredTables.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-600">
                  {searchTerm ? 'Ninguna tabla coincide' : 'No se encontraron tablas públicas'}
                </div>
              ) : (
                filteredTables.map((t) => {
                  const isSelected = selectedTable === t.name;
                  return (
                    <button
                      key={t.name}
                      onClick={() => onSelectTable(t.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'bg-slate-900 text-emerald-400 font-medium'
                          : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'}`} />
                        <span className="truncate">{t.name}</span>
                      </div>
                      {t.columns.length > 0 && (
                        <span className="text-[10px] bg-slate-900 border border-slate-800 group-hover:border-slate-700/60 text-slate-500 group-hover:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {t.columns.length} cols
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="p-5 text-center flex flex-col items-center justify-center h-full text-slate-500 max-w-[240px] mx-auto space-y-2">
            <Terminal className="w-8 h-8 text-slate-700" />
            <span className="text-xs font-medium text-slate-400">Consola de Consultas Activa</span>
            <p className="text-[11px] leading-relaxed">
              Utiliza el editor central para escribir scripts SQL directos o queries rápidas desde el SDK de Javascript de Supabase.
            </p>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-600 font-mono text-center">
        Creado con React y Supabase 🧪
      </div>
    </div>
  );
}
