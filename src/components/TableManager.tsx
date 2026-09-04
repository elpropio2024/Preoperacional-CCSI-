import React, { useState, useEffect } from 'react';
import {
  TableInfo,
  TableColumn,
} from '../types';
import {
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Database,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface TableManagerProps {
  supabaseClient: any;
  tableInfo: TableInfo;
  onRefreshTableInfo: () => void;
}

export default function TableManager({
  supabaseClient,
  tableInfo,
  onRefreshTableInfo,
}: TableManagerProps) {
  const { name: tableName, columns } = tableInfo;

  // Data state
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically compute columns to display
  const activeColumns = React.useMemo(() => {
    const isPlaceholder = columns.length === 1 && columns[0].name === 'placeholder_manual_id';
    if ((columns.length === 0 || isPlaceholder) && rows.length > 0) {
      const firstRow = rows[0];
      const keys = Object.keys(firstRow);
      return keys.map(key => {
        const val = firstRow[key];
        const t = typeof val;
        return {
          name: key,
          type: t === 'number' ? 'integer' : t === 'boolean' ? 'boolean' : 'text',
          isNullable: true,
          isPrimaryKey: key.toLowerCase() === 'id' || key.toLowerCase() === 'uuid'
        };
      });
    }
    return columns;
  }, [columns, rows]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Search/Filter state
  const [searchColumn, setSearchColumn] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Action targets
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);

  // Find primary key or guess one
  const primaryKeyColumn = activeColumns.find(c => c.isPrimaryKey) || activeColumns[0];

  // Set default search column
  useEffect(() => {
    if (activeColumns.length > 0) {
      const defaultSearchCol = activeColumns.find(c => c.type.toLowerCase().includes('char') || c.type.toLowerCase().includes('text'))?.name || activeColumns[0].name;
      setSearchColumn(defaultSearchCol);
    }
    // Reset page and query on table reload
    setPage(1);
    setSearchQuery('');
    setFilterActive(false);
    setRows([]);
    setTotalRows(0);
    setError(null);
  }, [tableName, activeColumns]);

  // Fetch Rows Core
  const fetchRows = async () => {
    if (!tableName) return;
    setLoading(true);
    setError(null);

    const fromOffset = (page - 1) * pageSize;
    const toOffset = fromOffset + pageSize - 1;

    try {
      let query = supabaseClient.from(tableName).select('*', { count: 'exact' });

      // Apply Search if configured and active
      if (searchQuery.trim() !== '' && searchColumn) {
        // Simple filter based on column type
        const colType = activeColumns.find(c => c.name === searchColumn)?.type.toLowerCase() || '';
        const cleanQuery = searchQuery.trim();
        
        if (colType.includes('char') || colType.includes('text')) {
          query = query.ilike(searchColumn, `%${cleanQuery}%`);
        } else if (colType.includes('int') || colType.includes('num') || colType.includes('float')) {
          const numValue = Number(cleanQuery);
          if (!isNaN(numValue)) {
            query = query.eq(searchColumn, numValue);
          } else {
            throw new Error(`Por favor ingresa un número válido para filtrar por ${searchColumn}`);
          }
        } else if (colType.includes('bool')) {
          const isTrue = ['true', '1', 'yes', 'si', 's'].includes(cleanQuery.toLowerCase());
          const isFalse = ['false', '0', 'no', 'n'].includes(cleanQuery.toLowerCase());
          if (isTrue || isFalse) {
            query = query.eq(searchColumn, isTrue);
          } else {
            throw new Error(`Por favor ingresa 'true' o 'false' para filtrar por ${searchColumn}`);
          }
        } else {
          // Fallback query matching exact
          query = query.eq(searchColumn, cleanQuery);
        }
      }

      // Order by Primary key defaults
      if (primaryKeyColumn) {
        query = query.order(primaryKeyColumn.name, { ascending: true });
      }

      // Range bindings
      query = query.range(fromOffset, toOffset);

      const { data, error: fetchErr, count } = await query;

      if (fetchErr) throw fetchErr;

      setRows(data || []);
      setTotalRows(count || 0);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err?.message || "Ocurrió un error inesperado al leer los datos de la tabla.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [tableName, page, pageSize, filterActive]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilterActive(prev => !prev || true); // trigger reload
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
    if (searchQuery.trim() !== '') {
      setFilterActive(prev => !prev || true);
    }
  };

  // Open insert form
  const handleOpenCreateForm = () => {
    const freshData: Record<string, any> = {};
    activeColumns.forEach(col => {
      // prefill defaults if any
      if (col.defaultValue !== undefined && col.defaultValue !== null) {
        freshData[col.name] = col.defaultValue;
      } else if (col.type.toLowerCase().includes('bool')) {
        freshData[col.name] = false;
      } else {
        freshData[col.name] = '';
      }
    });
    setFormData(freshData);
    setFormMode('create');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEditForm = (row: any) => {
    setEditingRow(row);
    setFormData({ ...row });
    setFormMode('edit');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Form Input Changes
  const handleFormInputChange = (colName: string, value: any, type: string) => {
    let parsedValue = value;
    const lowerType = type.toLowerCase();
    
    // Convert text inputs appropriately
    if (parsedValue === '') {
      parsedValue = null; // Send null for empty inputs unless it is pk/not nullable
    } else if (lowerType.includes('bool')) {
      parsedValue = value === true || value === 'true';
    } else if (lowerType.includes('int') || lowerType.includes('num') || lowerType.includes('float')) {
      const num = Number(value);
      parsedValue = isNaN(num) ? value : num;
    }

    setFormData(prev => ({
      ...prev,
      [colName]: parsedValue
    }));
  };

  // Submit Row Creation or Update
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Clean up primary key identity columns if creating
      const submittedData = { ...formData };
      
      if (formMode === 'create') {
        // If the primary key is numeric identity/autoincrement, let's omit it if it's empty to let db write it
        if (primaryKeyColumn && 
            (primaryKeyColumn.type.toLowerCase().includes('int') || primaryKeyColumn.type.toLowerCase().includes('serial')) && 
            !submittedData[primaryKeyColumn.name]) {
          delete submittedData[primaryKeyColumn.name];
        }

        // Insert
        const { error: insErr } = await supabaseClient
          .from(tableName)
          .insert([submittedData]);

        if (insErr) throw insErr;
      } else {
        // Update: filter out changes based on primary key identifier
        if (!primaryKeyColumn) throw new Error("No se puede actualizar este registro porque no se encuentra la clave primaria.");
        
        const pkVal = editingRow[primaryKeyColumn.name];
        
        // Remove primary key from being updated directly to prevent issues
        const updatePayload = { ...submittedData };
        delete updatePayload[primaryKeyColumn.name];

        const { error: updErr } = await supabaseClient
          .from(tableName)
          .update(updatePayload)
          .eq(primaryKeyColumn.name, pkVal);

        if (updErr) throw updErr;
      }

      // Success
      setIsFormOpen(false);
      fetchRows();
      onRefreshTableInfo(); // update counts
    } catch (err: any) {
      console.error("Error writing data:", err);
      setFormError(err?.message || "Ocurrió un error al persistir los cambios.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Record Trigger
  const handleDeleteRow = async () => {
    if (!rowToDelete || !primaryKeyColumn) return;
    setLoading(true);
    setError(null);
    const pkVal = rowToDelete[primaryKeyColumn.name];

    try {
      const { error: delErr } = await supabaseClient
        .from(tableName)
        .delete()
        .eq(primaryKeyColumn.name, pkVal);

      if (delErr) throw delErr;

      setRowToDelete(null);
      fetchRows();
      onRefreshTableInfo(); // refresh count stats
    } catch (err: any) {
      console.error("Error deleting:", err);
      setError(`Error al eliminar registro: ${err?.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Visual badge color helper for database column types
  const colTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('int') || t.includes('num') || t.includes('float') || t.includes('double') || t.includes('precision')) {
      return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
    if (t.includes('bool') || t.includes('bit')) {
      return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    }
    if (t.includes('date') || t.includes('time')) {
      return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
    if (t.includes('uuid')) {
      return 'bg-pink-500/10 border-pink-500/20 text-pink-400';
    }
    if (t.includes('json')) {
      return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
    }
    return 'bg-slate-500/10 border-slate-500/30 text-slate-400'; // Default text string
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 flex flex-col h-full font-sans relative" id="table-manager-container">
      
      {/* Table Header Section */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
            <span className="text-xs text-slate-500 font-mono tracking-wider">TABLA ACTIVA</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {tableName}
            <span className="text-xs font-normal font-mono text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/55">
              {totalRows} {totalRows === 1 ? 'fila' : 'filas'}
            </span>
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRows}
            disabled={loading}
            title="Recargar datos"
            className="w-10 h-10 bg-slate-950/65 border border-slate-800 rounded-xl hover:border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateForm}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Insertar Fila</span>
          </button>
        </div>
      </div>

      {/* Schema quick stats bar */}
      <div className="px-6 py-3.5 bg-slate-950/15 border-b border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-mono" id="schema-meta-bar">
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 text-[11px]">Columnas:</span>
          <div className="flex gap-1 flex-wrap">
            {activeColumns.map(c => (
              <span key={c.name} className={`px-1.5 py-0.5 rounded text-[10px] border ${c.isPrimaryKey ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-semibold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                {c.name}{c.isPrimaryKey && ' 🔑'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Query Search / Filter Controls */}
      <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800 flex items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <div className="text-xs text-slate-400 flex items-center gap-1 font-medium select-none shrink-0">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filtro de Consulta:</span>
          </div>

          <div className="flex flex-1 items-center gap-2 w-full">
            {/* Column Selector */}
            <select
              value={searchColumn}
              onChange={(e) => setSearchColumn(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500/40 cursor-pointer"
            >
              {activeColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>

            {/* Input query search terms */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ingresa un valor para filtrar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/30 transition-all font-light"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1.5 w-5 h-5 rounded-md hover:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="py-1.5 px-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-auto p-6" id="table-crud-grid">
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/20 text-red-300 rounded-2xl flex items-start gap-3 text-xs mb-6 max-w-4xl animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block">Error al cargar datos</span>
              <p className="opacity-90 leading-relaxed font-mono">{error}</p>
              <div className="pt-2">
                <button
                  onClick={fetchRows}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-xs font-mono">Cargando registros...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto flex flex-col items-center justify-center space-y-3.5 border border-dashed border-slate-800 bg-slate-950/15 p-8 rounded-3xl">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-1">
              <Database className="w-5 h-5 text-slate-500" />
            </div>
            <h3 className="text-sm font-semibold text-white">No se encontraron registros</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {searchQuery
                ? `Ningún registro en ${tableName} coincide con la búsqueda '${searchQuery}' en la columna ${searchColumn}.`
                : `La tabla ${tableName} está conectada pero actualmente no contiene registros.`}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreateForm}
                className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insertar Primera Fila</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/60 border-b border-slate-800/70 text-slate-400 select-none">
                    {/* Actions Column */}
                    <th className="py-3 px-4 text-center font-semibold w-20">Acciones</th>
                    
                    {/* Table Schema columns headers */}
                    {activeColumns.map((col) => (
                      <th key={col.name} className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white">{col.name}</span>
                          <span className={`text-[9px] px-1 py-0.5 rounded border border-transparent font-normal select-none ${colTypeBadge(col.type)}`}>
                            {col.type}
                          </span>
                          {col.isPrimaryKey && (
                            <span title="Clave Primaria" className="text-[10px] select-none">🔑</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {rows.map((row, idx) => {
                    const rowId = primaryKeyColumn ? row[primaryKeyColumn.name] : idx;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/40 transition-colors group">
                        {/* CRUD actions buttons inline */}
                        <td className="py-2.5 px-4 text-center border-r border-slate-800/40">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditForm(row)}
                              title="Editar registro"
                              className="w-7 h-7 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setRowToDelete(row)}
                              title="Eliminar registro"
                              className="w-7 h-7 rounded-lg border border-slate-800 hover:border-red-500/20 bg-slate-900 hover:bg-slate-830 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {activeColumns.map((col) => {
                          const val = row[col.name];
                          let rendered = '';
                          
                          if (val === null || val === undefined) {
                            rendered = 'null';
                          } else if (typeof val === 'boolean') {
                            rendered = val ? 'true' : 'false';
                          } else if (typeof val === 'object') {
                            rendered = JSON.stringify(val);
                          } else {
                            rendered = String(val);
                          }

                          const isNull = val === null || val === undefined;
                          const isBool = typeof val === 'boolean';

                          return (
                            <td key={col.name} className="py-2.5 px-4 align-middle truncate max-w-xs font-mono text-[11px]">
                              <span className={
                                isNull ? 'text-slate-600 italic font-light' : 
                                isBool ? 'text-purple-400' :
                                typeof val === 'number' ? 'text-blue-400' : 'text-slate-200'
                              }>
                                {rendered}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls footer inside grid dashboard */}
            <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs select-none">
              <div className="text-slate-400 flex items-center gap-1.5">
                <span>Registros del</span>
                <span className="text-white font-semibold">{(page - 1) * pageSize + 1}</span>
                <span>al</span>
                <span className="text-white font-semibold">{Math.min(page * pageSize, totalRows)}</span>
                <span>de</span>
                <span className="text-white font-semibold">{totalRows}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>Filas por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 text-slate-300 py-1 px-1.5 rounded-lg focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                  >
                    {[5, 10, 20, 50].map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-7 h-7 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-7 h-7 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-400 mx-1">
                    Pág. <span className="text-white font-semibold">{page}</span> de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-7 h-7 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-7 h-7 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-900 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-all cursor-pointer"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row INSERT & CREATE Dynamic Slideover Panel */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-end z-50 animate-fadeIn" id="crud-row-modal">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            
            {/* Header */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {formMode === 'create' ? 'Insertar nuevo registro' : 'Editar registro'}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">Tabla: {tableName}</span>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form container */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl flex items-start gap-2.5 text-xs animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-4" id="row-modal-fields">
                  {activeColumns.map((col) => {
                    const isReadOnly = formMode === 'edit' && col.isPrimaryKey;
                    const isAutoGenerate = formMode === 'create' && col.isPrimaryKey && (col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('serial') || col.type.toLowerCase().includes('uuid'));
                    
                    return (
                      <div key={col.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                            <span className="font-mono">{col.name}</span>
                            {col.isPrimaryKey && <span title="Clave Primaria">🔑</span>}
                            {!col.isNullable && <span className="text-red-500" title="Requerido">*</span>}
                          </label>
                          <span className="text-[10px] font-mono text-slate-500">{col.type}</span>
                        </div>

                        {/* Input switch based on column types schema */}
                        {isAutoGenerate ? (
                          <div className="px-3.5 py-2.5 bg-slate-950/40 border border-dashed border-slate-800/80 rounded-xl text-xs text-slate-500 italic select-none">
                            Generado automáticamente por la base de datos (clave primaria)
                          </div>
                        ) : col.type.toLowerCase().includes('bool') ? (
                          <div className="flex items-center gap-3 py-1 bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
                            <input
                              type="checkbox"
                              checked={!!formData[col.name]}
                              disabled={isReadOnly}
                              onChange={(e) => handleFormInputChange(col.name, e.target.checked, col.type)}
                              className="w-4 h-4 bg-slate-950 text-emerald-500 focus:ring-emerald-500/10 rounded border-slate-800 accent-emerald-500 cursor-pointer disabled:opacity-40"
                            />
                            <span className="text-xs text-slate-400">Verdadero (True)</span>
                          </div>
                        ) : col.type.toLowerCase().includes('json') ? (
                          <textarea
                            disabled={isReadOnly}
                            rows={3}
                            placeholder='{"key": "value"}'
                            value={formData[col.name] !== null && formData[col.name] !== undefined ? (typeof formData[col.name] === 'object' ? JSON.stringify(formData[col.name], null, 2) : formData[col.name]) : ''}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                handleFormInputChange(col.name, parsed, col.type);
                              } catch {
                                handleFormInputChange(col.name, e.target.value, col.type);
                              }
                            }}
                            className="w-full px-3.5 py-2 bg-slate-1000/60 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/10 text-xs font-mono placeholder:text-slate-600 disabled:opacity-40 resize-none font-light leading-relaxed"
                          />
                        ) : (
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={formData[col.name] !== null && formData[col.name] !== undefined ? formData[col.name] : ''}
                            onChange={(e) => handleFormInputChange(col.name, e.target.value, col.type)}
                            placeholder={isReadOnly ? 'No editable (clave primaria)' : col.isNullable ? 'null (vacío)' : 'Ingresa valor'}
                            className={`w-full px-3.5 py-2 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 focus:border-emerald-500/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/10 text-xs font-mono placeholder:text-slate-600 disabled:opacity-40 font-light`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </form>
            </div>

            {/* Footer Form Button Controls */}
            <div className="border-t border-slate-800 pt-5 mt-8 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-medium rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer select-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{formMode === 'create' ? 'Agregar Fila' : 'Actualizar Fila'}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Row DELETE Confirmation Dialog Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn" id="delete-confirmation-dialog">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2">¿Eliminar este registro?</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-5">
              Esta acción eliminará de forma permanente el registro seleccionado de la tabla <span className="font-semibold text-slate-200">{tableName}</span> en tu servidor de Supabase. Esta operación no se puede deshacer.
            </p>

            {primaryKeyColumn && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-6 font-mono text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Registro:</span>
                  <span className="text-emerald-400 font-semibold">{primaryKeyColumn.name} = {rowToDelete[primaryKeyColumn.name]}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRowToDelete(null)}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteRow}
                className="py-2 px-4.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
