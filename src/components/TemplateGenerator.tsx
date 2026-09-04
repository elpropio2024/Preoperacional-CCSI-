import React, { useState } from 'react';
import { TableInfo } from '../types';
import { Copy, Check, FileCode, Sliders, Play, Settings, AlertCircle, Info, Keyboard } from 'lucide-react';

interface TemplateGeneratorProps {
  tables: TableInfo[];
  selectedTable: string | null;
  onSelectTable: (name: string | null) => void;
}

export default function TemplateGenerator({
  tables,
  selectedTable,
  onSelectTable,
}: TemplateGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'component' | 'hook' | 'setup'>('component');
  const [copied, setCopied] = useState(false);

  const tInfo = tables.find(t => t.name === selectedTable) || tables[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (tables.length === 0) {
    return (
      <div className="flex-1 bg-slate-900 text-slate-400 p-8 flex flex-col items-center justify-center font-sans">
        <div className="text-center p-8 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20 max-w-md">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white mb-2">No hay tablas cargadas</h3>
          <p className="text-xs leading-relaxed">
            Por favor, conéctate a tu base de datos de Supabase para poder generar plantillas de código a partir del esquema de tus tablas.
          </p>
        </div>
      </div>
    );
  }

  // Fallback if no table is selected
  const activeTable = tInfo || { name: 'items', columns: [{ name: 'id', type: 'integer', isPrimaryKey: true }] };
  const pkCol = activeTable.columns.find(c => c.isPrimaryKey) || activeTable.columns[0];

  // Helper arrays for generating variables
  const textCols = activeTable.columns.filter(c => !c.isPrimaryKey);
  const insertPayload = textCols.map(c => `      ${c.name}: ${c.type.toLowerCase().includes('bool') ? 'false' : c.type.toLowerCase().includes('int') || c.type.toLowerCase().includes('num') ? '0' : "''"}`).join(',\n');
  const editInputs = textCols.map(c => {
    const isBool = c.type.toLowerCase().includes('bool');
    const isNum = c.type.toLowerCase().includes('int') || c.type.toLowerCase().includes('num') || c.type.toLowerCase().includes('float');
    
    if (isBool) {
      return `              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  checked={!!formData.${c.name}}
                  onChange={(e) => setFormData(prev => ({ ...prev, ${c.name}: e.target.checked }))}
                  className="rounded border-slate-750 text-emerald-500 focus:ring-emerald-500/10"
                />
                <span className="text-xs text-slate-300 font-medium">${c.name}</span>
              </div>`;
    }

    return `              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-medium">${c.name}</span>
                <input
                  type="${isNum ? 'number' : 'text'}"
                  value={formData.${c.name} !== null && formData.${c.name} !== undefined ? formData.${c.name} : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, ${c.name}: ${isNum ? 'Number(e.target.value)' : 'e.target.value'} }))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg text-xs"
                  placeholder="Ingresa valor"
                />
              </div>`;
  }).join('\n\n');

  // React Component Snippet (CRUD Component)
  const componentCode = `import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Inicializar cliente con tus variables de entorno de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}Manager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estado para la creación / edición
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
${insertPayload}
  });

  // Leer registros
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('${activeTable.name}')
        .select('*')
        .order('${pkCol.name}', { ascending: true });

      if (err) throw err;
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Agregar o Editar Registro
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { error: err } = await supabase
          .from('${activeTable.name}')
          .update(formData)
          .eq('${pkCol.name}', editId);

        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('${activeTable.name}')
          .insert([formData]);

        if (err) throw err;
      }

      // Resetear formulario
      setFormData({
${insertPayload}
      });
      setIsEditing(false);
      setEditId(null);
      fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Eliminar un registro
  const handleDelete = async (id: any) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      const { error: err } = await supabase
        .from('${activeTable.name}')
        .delete()
        .eq('${pkCol.name}', id);

      if (err) throw err;
      fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEdit = (item: any) => {
    setFormData({ ...item });
    setEditId(item.${pkCol.name});
    setIsEditing(true);
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col md:flex-row gap-6">
      
      {/* Columna Derecha - Listado de Registros */}
      <div className="flex-1 bg-slate-900 border border-slate-805 p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
          <span>Registros de ${activeTable.name}</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-normal">
            {items.length} items
          </span>
        </h2>

        {loading ? (
          <p className="text-sm font-mono text-slate-500 py-10 text-center">Cargando...</p>
        ) : error ? (
          <p className="text-sm text-red-400 bg-red-950/20 p-4 rounded-xl border border-red-900">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-10">La tabla está vacía</p>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.${pkCol.name}} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center justify-between">
                <div className="space-y-1 truncate max-w-md">
                  <p className="text-xs font-semibold text-white">ID: {item.${pkCol.name}}</p>
                  <p className="text-xs font-mono text-slate-400 truncate">
                    {Object.entries(item)
                      .filter(([k]) => k !== '${pkCol.name}')
                      .map(([k, v]) => \`\${k}: \${v}\`).join(' | ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(item)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(item.${pkCol.name})}
                    className="px-3 py-1 bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-900 hover:text-white rounded-lg text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Columna Izquierda - Formulario */}
      <div className="w-full md:w-80 bg-slate-900 border border-slate-805 p-6 rounded-2xl shadow-xl h-fit">
        <h2 className="text-lg font-bold mb-4 text-white">
          {isEditing ? 'Actualizar Registro' : 'Crear Registro'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
${editInputs}

          <div className="pt-2 flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditId(null);
                  setFormData({
${insertPayload}
                  });
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-bold"
            >
              {isEditing ? 'Guardar Cambios' : 'Insertar Fila'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}`;

  // Custom data hook code template
  const hookCode = `import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}Row {
  ${activeTable.columns.map(c => `${c.name}${c.isNullable ? '?' : ''}: ${
    c.type.toLowerCase().includes('int') || c.type.toLowerCase().includes('num') || c.type.toLowerCase().includes('float') ? 'number' :
    c.type.toLowerCase().includes('bool') ? 'boolean' :
    c.type.toLowerCase().includes('json') ? 'any' : 'string'
  };`).join('\n  ')}
}

export function use${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}() {
  const [data, setData] = useState<${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: result, error: err } = await supabase
        .from('${activeTable.name}')
        .select('*');

      if (err) throw err;
      setData(result || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
}`;

  // Supabase installation and setup instructions
  const setupInstructions = `// 1. Instala el SDK oficial de Supabase
npm install @supabase/supabase-js

// 2. Crea un archivo 'supabaseClient.js' o .ts en tu directorio src/
import { createClient } from '@supabase/supabase-js';

// Lee de tus variables de entorno para mayor seguridad en producción
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. Agrega las variables a tu archivo .env:
VITE_SUPABASE_URL=tu_url_de_supabase_aqui
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica_aqui
`;

  const getCodeText = () => {
    if (activeTab === 'component') return componentCode;
    if (activeTab === 'hook') return hookCode;
    return setupInstructions;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 flex flex-col h-full font-sans" id="template-generator-container">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/20">
        <div className="flex items-center gap-2 mb-1">
          <FileCode className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500 font-mono tracking-wider">GENERADOR DE PLANTILLAS REACT</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Compila tu App a partir de tu BD</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Ya has conectado tu base de datos. Selecciona una tabla a continuación para generar instantáneamente componentes interactivos CRUD de React con Tailwind totalmente listos para producción.
        </p>
      </div>

      {/* Tabs & Table Selector bar */}
      <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        {/* Table selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Esquema de Tabla:</span>
          <select
            value={selectedTable || ''}
            onChange={(e) => onSelectTable(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500/40 cursor-pointer text-ellipsis max-w-[200px]"
          >
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex bg-slate-900/80 p-0.5 rounded-xl border border-slate-800/80 w-fit shrink-0">
          <button
            onClick={() => setActiveTab('component')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              activeTab === 'component' ? 'bg-slate-805 text-white bg-slate-800/80' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Componente CRUD
          </button>
          <button
            onClick={() => setActiveTab('hook')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              activeTab === 'hook' ? 'bg-slate-805 text-white bg-slate-800/80' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            React Custom Hook
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
              activeTab === 'setup' ? 'bg-slate-805 text-white bg-slate-800/80' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Instalación SDK
          </button>
        </div>
      </div>

      {/* Code Area & Tips */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
        
        {/* Code Visual Box */}
        <div className="xl:col-span-8 flex flex-col min-h-[460px] bg-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden shadow-2xl">
          
          {/* Box Header Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/90 select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
              <span className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30" />
              <span className="text-[11px] font-mono text-slate-500 ml-2">
                {activeTab === 'component' ? `${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}Manager.tsx` : activeTab === 'hook' ? `use${activeTable.name.charAt(0).toUpperCase() + activeTable.name.slice(1)}.ts` : 'supabaseClient.ts'}
              </span>
            </div>

            <button
              onClick={() => handleCopy(getCodeText())}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[11px]">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          {/* Actual Code content */}
          <div className="flex-1 p-5 overflow-auto bg-slate-950 font-mono text-xs leading-relaxed text-slate-300 max-h-[600px] select-text">
            <pre>{getCodeText()}</pre>
          </div>
        </div>

        {/* Instructions & Meta Guide Panel */}
        <div className="xl:col-span-4 space-y-5">
          <div className="p-5 bg-slate-950/40 rounded-2xl border border-slate-800/80">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400" />
              Guía de Lanzamiento Rápido
            </h3>
            
            <ul className="space-y-3.5 text-xs text-slate-400 font-light leading-relaxed">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5">1</span>
                <div>
                  <span className="text-slate-200 font-medium">Crea el cliente local</span>
                  <p className="mt-0.5">Sigue los pasos de la pestaña <span className="text-slate-300 underline underline-offset-2">Instalación SDK</span> para configurar tu cliente de Supabase local.</p>
                </div>
              </li>
              
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5">2</span>
                <div>
                  <span className="text-slate-200 font-medium">Inserta la plantilla</span>
                  <p className="mt-0.5">Crea un archivo local con el nombre del componente, pega este código limpio y conéctalo en tu <code className="text-blue-300">App.tsx</code>.</p>
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] uppercase shrink-0 mt-0.5">3</span>
                <div>
                  <span className="text-slate-200 font-medium">¡Estilo Moderno prefabricado!</span>
                  <p className="mt-0.5">El componente ya incluye clases de Tailwind CSS coherentes con una estética oscura premium, soporte responsivo y validación básica de errores.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="p-5 bg-emerald-950/10 rounded-2xl border border-emerald-500/20">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1.5">💡 ¿Qué contiene esta plantilla?</h4>
            <p className="text-xs text-slate-300 font-light leading-relaxed">
              Mapea de forma dinámica la clave primaria de tu tabla (<code className="text-emerald-300">{pkCol.name}</code>) y genera un formulario adaptado con campos listados para cada columna: <span className="text-slate-100 font-mono text-[10px] bg-slate-900 border border-slate-800 px-1 py-0.5 rounded">{textCols.map(c => c.name).slice(0, 4).join(', ')}{textCols.length > 4 && '...'}</span>.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
