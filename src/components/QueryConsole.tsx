import React, { useState, useEffect } from 'react';
import { TableInfo } from '../types';
import { Terminal, Play, Check, Copy, AlertCircle, Info, Sliders, Database, Eye } from 'lucide-react';

interface QueryConsoleProps {
  supabaseClient: any;
  tables: TableInfo[];
  selectedTable: string | null;
}

export default function QueryConsole({
  supabaseClient,
  tables,
  selectedTable,
}: QueryConsoleProps) {
  const [activeTable, setActiveTable] = useState(selectedTable || (tables[0]?.name || ''));
  const [method, setMethod] = useState<'SELECT' | 'INSERT_MOCK'>('SELECT');
  const [limit, setLimit] = useState(5);
  const [filterCol, setFilterCol] = useState('');
  const [filterVal, setFilterVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync active local table with parent selectedTable
  useEffect(() => {
    if (selectedTable) {
      setActiveTable(selectedTable);
    }
  }, [selectedTable]);

  const currentTableInfo = tables.find((t) => t.name === activeTable) || tables[0];

  useEffect(() => {
    if (currentTableInfo?.columns?.length > 0) {
      setFilterCol(currentTableInfo.columns[0].name);
    }
  }, [activeTable, currentTableInfo]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getJsCodeSnippet = () => {
    if (!activeTable) return '// Por favor selecciona o agrega una tabla primero';
    
    if (method === 'SELECT') {
      let code = `const { data, error } = await supabase\n  .from('${activeTable}')\n  .select('*')`;
      if (filterVal) {
        code += `\n  .eq('${filterCol}', '${filterVal}')`;
      }
      code += `\n  .limit(${limit});\n\nif (error) console.error(error);\nelse console.log(data);`;
      return code;
    } else {
      const mockObj: Record<string, any> = {};
      currentTableInfo?.columns.forEach(col => {
        if (!col.isPrimaryKey) {
          mockObj[col.name] = col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('num') ? 123 : col.type.toLowerCase().includes('bool') ? true : 'prueba_mock';
        }
      });
      return `const { data, error } = await supabase\n  .from('${activeTable}')\n  .insert([\n    ${JSON.stringify(mockObj, null, 4).replace(/\n/g, '\n    ')}\n  ]);\n\nif (error) console.error(error);\nelse console.log('Insertado con éxito!');`;
    }
  };

  const handleExecute = async () => {
    if (!activeTable) return;
    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      if (method === 'SELECT') {
        let query = supabaseClient.from(activeTable).select('*');
        
        if (filterVal) {
          query = query.eq(filterCol, filterVal);
        }
        
        query = query.limit(limit);
        
        const { data, error: qErr } = await query;
        if (qErr) throw qErr;
        
        setOutput(data);
      } else {
        // Insert mock
        const mockObj: Record<string, any> = {};
        currentTableInfo?.columns.forEach(col => {
          if (!col.isPrimaryKey) {
            mockObj[col.name] = col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('num') ? 99 : col.type.toLowerCase().includes('bool') ? true : 'Valor Prueba';
          }
        });

        const { data, error: insErr } = await supabaseClient
          .from(activeTable)
          .insert([mockObj])
          .select();

        if (insErr) throw insErr;
        setOutput({ status: 'Success!', insertedData: data });
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error executing select query.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 flex flex-col h-full font-sans" id="query-console-container">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-2 mb-1">
          <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 font-mono tracking-wider">MÓDULO DE PRUEBAS DE SDK</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">JavaScript SDK Playroom</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
          Estructura y ejecuta de forma interactiva consultas nativas de Supabase para validar que tu base de datos responde correctamente antes de importarla en tu código.
        </p>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Playroom Left Options Panel */}
        <div className="lg:col-span-4 bg-slate-950 border border-slate-800/80 rounded-3xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5 mb-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Configurador de SDK
          </h2>

          {/* Table select option */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium font-mono">Tabla Principal (.from)</label>
            <select
              value={activeTable}
              onChange={(e) => setActiveTable(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500/40 cursor-pointer"
            >
              {tables.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Method select */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium font-mono">Tipo de Consulta (.select / .insert)</label>
            <div className="grid grid-cols-2 bg-slate-900 p-0.5 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setMethod('SELECT')}
                className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${method === 'SELECT' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-500 hover:text-slate-300'}`}
              >
                SELECT (Seleccionar)
              </button>
              <button
                type="button"
                onClick={() => setMethod('INSERT_MOCK')}
                className={`py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${method === 'INSERT_MOCK' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-500 hover:text-slate-300'}`}
              >
                INSERT (Mock)
              </button>
            </div>
          </div>

          {/* Method settings inputs */}
          {method === 'SELECT' ? (
            <div className="space-y-3.5 pt-1.5 border-t border-slate-800/40">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium font-mono flex justify-between">
                  <span>Límite de Filas (.limit)</span>
                  <span className="text-emerald-400 font-bold">{limit}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-mono">Filtro de Igualdad (.eq)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterCol}
                    onChange={(e) => setFilterCol(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-[11px] font-mono focus:outline-none focus:border-emerald-500/40"
                  >
                    {currentTableInfo?.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Valor de prueba"
                    value={filterVal}
                    onChange={(e) => setFilterVal(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-[11px] font-mono focus:outline-none focus:border-emerald-500/30"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900 border border-slate-805 rounded-xl text-xs text-slate-400 font-light leading-relaxed pt-3">
              Generará e insertará un registro de prueba con valores aleatorios saludables en columnas descriptivas no opcionales ni claves autogeneradas.
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={loading || !activeTable}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/5 active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>Ejecutando...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ejecutar Consulta SDK</span>
              </>
            )}
          </button>
        </div>

        {/* Visual Code & Output Terminal split */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          
          {/* Top segment: Show Equiv code to Copy */}
          <div className="bg-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-850 bg-slate-950 p-2 text-xs font-mono select-none">
              <span className="text-slate-500 text-[11px]">CÓDIGO EQUIVALENTE EN TU APP:</span>
              <button
                onClick={() => handleCopyCode(getJsCodeSnippet())}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                {copied ? <Check className="w-3 text-emerald-400" /> : <Copy className="w-3" />}
                <span className="text-[10px]">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <div className="p-4 overflow-auto bg-slate-950/70 font-mono text-[11px] leading-relaxed text-emerald-400 max-h-40 min-h-24">
              <pre>{getJsCodeSnippet()}</pre>
            </div>
          </div>

          {/* Bottom segment: Live Interactive terminal console log outputs */}
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col relative overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-850 bg-slate-950 p-2 text-xs font-bold font-mono text-white select-none flex justify-between items-center">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                <span className="text-xs uppercase font-mono ml-2">Resultado Consola (JSON)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Live API logs</span>
            </div>

            <div className="flex-1 p-5 overflow-auto font-mono text-[11px] leading-relaxed select-text min-h-60 max-h-[380px]">
              {error && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Error: {error}</span>
                </div>
              )}

              {!error && !output && !loading && (
                <div className="text-slate-600 italic py-10 text-center">
                  Consola vacía. Haz clic en 'Ejecutar Consulta SDK' para disparar la petición y capturar las respuestas reales del servidor.
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>Esperando respuesta de tu base de datos de Supabase...</span>
                </div>
              )}

              {!error && output && (
                <pre className="text-slate-300">{JSON.stringify(output, null, 2)}</pre>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
