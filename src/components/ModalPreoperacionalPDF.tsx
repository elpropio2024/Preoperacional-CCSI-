import React, { useRef, useState, useEffect } from 'react';
import { Download, X, Loader2, FileText } from 'lucide-react';
import { PreoperacionalData, LISTA_CRITERIOS, getCriterioValue, generarPreoperacionalPDF, CriterioItem } from '../utils/exportPreoperacionalPDF';
import { supabase } from '../lib/apiClients';
import logoCcsi from '../assets/logo-ccsi.jpg';
import { LOGO_CCSI_BASE64 } from '../assets/logoBase64';

interface ModalPreoperacionalPDFProps {
  data: PreoperacionalData;
  isOpen: boolean;
  onClose: () => void;
}

// Componente del Logo Institucional CCSI de Alta Fidelidad
const LogoCCSI = ({ logoSrc }: { logoSrc?: string }) => (
  <div className="flex items-center gap-2">
    <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm border border-slate-200/80 shrink-0 overflow-hidden">
      <img
        src={logoSrc || LOGO_CCSI_BASE64}
        alt="CCSI - Cartagena Complementaria y Social"
        className="w-full h-full object-contain block"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        loading="eager"
      />
    </div>
  </div>
);

// Encabezado institucional reutilizable para ambas páginas
const HeaderPlantilla = ({ numeroRadicado, logoSrc }: { numeroRadicado: string; logoSrc?: string }) => (
  <div>
    <div className="bg-[#07152B] text-white px-5 py-3 rounded-t-sm flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        <LogoCCSI logoSrc={logoSrc} />
        <div>
          <h1 className="text-[13px] font-black tracking-wide uppercase leading-tight text-white">
            INSPECCIÓN PREOPERACIONAL
          </h1>
          <h2 className="text-[12px] font-extrabold tracking-wide uppercase leading-tight text-slate-100">
            DE VEHÍCULO
          </h2>
          <p className="text-[8px] text-slate-300 font-medium tracking-wide mt-0.5">
            CCSI · Cartagena Complementaria y Social · SURA
          </p>
        </div>
      </div>

      <div className="bg-white text-slate-900 px-5 py-1.5 rounded border border-slate-200 text-center min-w-[140px] shadow-sm">
        <span className="block text-[7.5px] font-black tracking-widest text-[#07152B] uppercase">
          N° PREOPERACIONAL
        </span>
        <span className="block text-[13px] font-black tracking-wider text-slate-900 mt-0.5 font-mono">
          {numeroRadicado}
        </span>
      </div>
    </div>

    {/* Línea de acento naranja inferior */}
    <div className="h-[2.5px] w-full bg-[#E64A19]"></div>
  </div>
);

// Pie de página institucional
const FooterPlantilla = () => (
  <div className="pt-2 border-t border-slate-200/80 text-[8px] text-slate-400 italic">
    CCSI — Documento generado automáticamente — Plantilla de Inspección Preoperacional
  </div>
);

export default function ModalPreoperacionalPDF({ data, isOpen, onClose }: ModalPreoperacionalPDFProps) {
  const [generando, setGenerando] = useState(false);
  const [cedulaAsync, setCedulaAsync] = useState<string | null>(null);
  const [tipoVehiculoAsync, setTipoVehiculoAsync] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string>(LOGO_CCSI_BASE64);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  // El logo ya viene pre-cargado en Base64 instantáneo para html2canvas
  useEffect(() => {
    if (!logoBase64) {
      setLogoBase64(LOGO_CCSI_BASE64);
    }
  }, [logoBase64]);

  // Extraer cédula de múltiples alias posibles
  const rawCedula = 
    data.identificacion || 
    data.conductor_cedula || 
    data.conductor_identificacion || 
    data.operador_identificacion || 
    data.operador_cedula || 
    data.cedula || 
    data.cedula_conductor || 
    data.cedula_operador || 
    data.numero_identificacion || 
    data.documento || 
    data.doc_operador || 
    data.operador?.identificacion || 
    data.operador?.cedula || 
    data.operadores?.identificacion || 
    data.operadores?.cedula || 
    data.driverId ||
    (data.operador_id && !String(data.operador_id).includes('-') && /^\d+$/.test(String(data.operador_id)) ? String(data.operador_id) : null) || 
    (data.conductor_id && !String(data.conductor_id).includes('-') && /^\d+$/.test(String(data.conductor_id)) ? String(data.conductor_id) : null);

  // Extraer tipo de vehículo si viene en la carga de datos
  const rawTipoVehiculo = 
    data.tipo_vehiculo || 
    data.vehiculo?.tipo_vehiculo || 
    data.vehiculos?.tipo_vehiculo || 
    data.tipo || 
    data.vehiculo_tipo;

  useEffect(() => {
    if (!isOpen) return;

    // 1. Resolver Cédula
    if (rawCedula && rawCedula !== 'N/D' && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(rawCedula))) {
      setCedulaAsync(String(rawCedula));
    } else {
      let isMounted = true;
      const buscarCedulaOperador = async () => {
        try {
          const opId = data.operador_id || data.conductor_id || data.operador?.id || data.operadores?.id;
          if (opId) {
            const { data: opData } = await supabase
              .from('operadores')
              .select('identificacion, nombres_apellidos')
              .or(`id.eq.${opId},identificacion.eq.${opId}`)
              .maybeSingle();

            if (isMounted && opData?.identificacion) {
              setCedulaAsync(String(opData.identificacion));
              return;
            }
          }

          const opNombre = data.operador_nombre || data.nombres_apellidos || data.nombre || data.conductor_nombre;
          if (opNombre && opNombre !== 'Operador Registrado' && opNombre !== 'N/D') {
            const { data: opDataName } = await supabase
              .from('operadores')
              .select('identificacion, nombres_apellidos')
              .ilike('nombres_apellidos', `%${opNombre.trim()}%`)
              .maybeSingle();

            if (isMounted && opDataName?.identificacion) {
              setCedulaAsync(String(opDataName.identificacion));
              return;
            }
          }
        } catch (e) {
          console.warn('Error resolviendo cédula en ModalPreoperacionalPDF:', e);
        }
      };

      buscarCedulaOperador();
      return () => { isMounted = false; };
    }
  }, [isOpen, data, rawCedula]);

  // Efecto para buscar tipo_vehiculo en la tabla vehiculos
  useEffect(() => {
    if (!isOpen) return;

    if (rawTipoVehiculo && rawTipoVehiculo !== 'N/D') {
      setTipoVehiculoAsync(String(rawTipoVehiculo));
      return;
    }

    let isMounted = true;
    const buscarTipoVehiculo = async () => {
      try {
        const vehId = data.vehiculo_id || data.vehiculo?.id || data.vehiculos?.id;
        const vehPlaca = data.placa || data.vehiculo_placa || data.vehiculo?.placa || data.vehiculos?.placa;
        const vehTc = data.tc || data.vehiculo_tc || data.numero_interno || data.vehiculo?.tc || data.vehiculos?.tc;

        if (vehId) {
          const { data: vData } = await supabase
            .from('vehiculos')
            .select('tipo_vehiculo')
            .eq('id', vehId)
            .maybeSingle();

          if (isMounted && vData?.tipo_vehiculo) {
            setTipoVehiculoAsync(String(vData.tipo_vehiculo));
            return;
          }
        }

        if (vehPlaca && vehPlaca !== 'N/D') {
          const { data: vDataPlaca } = await supabase
            .from('vehiculos')
            .select('tipo_vehiculo')
            .ilike('placa', String(vehPlaca).trim())
            .maybeSingle();

          if (isMounted && vDataPlaca?.tipo_vehiculo) {
            setTipoVehiculoAsync(String(vDataPlaca.tipo_vehiculo));
            return;
          }
        }

        if (vehTc && vehTc !== 'N/D') {
          const tcClean = String(vehTc).replace(/^TC[-_ ]?/i, '').trim();
          const { data: vDataTc } = await supabase
            .from('vehiculos')
            .select('tipo_vehiculo')
            .or(`tc.eq.${vehTc},tc.eq.${tcClean},tc.ilike.%${tcClean}%`)
            .maybeSingle();

          if (isMounted && vDataTc?.tipo_vehiculo) {
            setTipoVehiculoAsync(String(vDataTc.tipo_vehiculo));
            return;
          }
        }
      } catch (e) {
        console.warn('Error resolviendo tipo_vehiculo en ModalPreoperacionalPDF:', e);
      }
    };

    buscarTipoVehiculo();
    return () => { isMounted = false; };
  }, [isOpen, data, rawTipoVehiculo]);

  if (!isOpen) return null;

  // Formato número preoperacional
  const formatNumeroPreoperacional = (val: any) => {
    if (!val) return 'PREO-0001';
    const str = String(val).trim();
    if (str.toUpperCase().startsWith('PREO-')) return str.toUpperCase();
    if (/^\d+$/.test(str)) {
      return `PREO-${str.padStart(4, '0')}`;
    }
    const clean = str.replace(/[^a-zA-Z0-9]/g, '');
    return `PREO-${clean.slice(-6).toUpperCase() || '0001'}`;
  };

  const rawRadicado = data.codigo || data.codigo_preoperacional || data.id_inspeccion || data.id || 'PREO-0001';
  const numeroRadicado = formatNumeroPreoperacional(rawRadicado);

  // Formato de fecha
  let fechaRegistroStr = 'N/D';
  if (data.fecha || data.created_at) {
    try {
      const d = new Date(data.fecha || data.created_at || '');
      if (!isNaN(d.getTime())) {
        fechaRegistroStr = d.toLocaleString('es-CO', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch(e) {}
  }

  const nombreOperador = data.operador_nombre || data.nombres_apellidos || data.nombre || data.conductor_nombre || 'Operador Registrado';
  const cedulaOperador = cedulaAsync || (rawCedula && rawCedula !== 'N/D' && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(String(rawCedula)) ? String(rawCedula) : 'N/D');

  const placaVehiculo = data.placa || data.vehiculo_placa || 'N/D';
  const tcVehiculo = data.tc || data.vehiculo_tc || data.numero_interno || 'N/D';
  const tipoVehiculo = tipoVehiculoAsync || rawTipoVehiculo || 'N/D';
  const kmVehiculo = data.kilometraje || data.odometro ? `${Number(data.kilometraje || data.odometro).toLocaleString('es-CO')} km` : 'N/D';

  const parseCleanRuta = (raw: any): string => {
    if (!raw) return 'X101 (Sitio)';
    const str = String(raw).trim();
    if (str.length > 20 && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(str)) return 'X101';
    return str;
  };

  const rutaAsignada = parseCleanRuta(data.ruta_asignada || data.nume_ruta || data.codigo_ruta || data.ruta || data.nombre_ruta);

  const formatFechaVenc = (val: any, fallback: string = '2026-12-31') => {
    if (!val) return fallback;
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s;
  };

  const soatVenc = formatFechaVenc(data.hist_vencimiento_soat || data.vencimiento_soat || data.soat_vencimiento, 'N/D');
  const rtmVenc = formatFechaVenc(data.hist_rtm_vencimiento || data.rtm_vencimiento || data.tecnico_vencimiento, 'N/D');
  const rccVenc = formatFechaVenc(data.hist_vencimiento_rcc || data.vencimiento_rcc, 'N/D');
  const rceVenc = formatFechaVenc(data.hist_vencimiento_rce || data.vencimiento_rce, 'N/D');
  const ext1Venc = formatFechaVenc(data.exp_extintor_1 || data.vencimiento_extintor_1 || data.vencimiento_extintor1 || data.fecha_vencimiento_extintor1, 'N/D');
  const ext2Venc = formatFechaVenc(data.exp_extintor_2 || data.vencimiento_extintor_2 || data.vencimiento_extintor2 || data.fecha_vencimiento_extintor2, 'N/D');

  // Estado de salud (sección 1)
  const estadoSalud = getCriterioValue(data, ['estado_salud', 'p1_salud_descanso', 'p1']);
  
  // Observaciones
  const obsOperador = data.observaciones_hallazgos || data.observaciones || 'Sin observaciones reportadas en la inspección.';

  // Partición de los 21 ítems:
  // Página 1: Ítems 1 a 8 (EXTERIOR, MOTOR, FRENOS, LUCES Y VISIBILIDAD)
  const itemsPagina1 = LISTA_CRITERIOS.slice(0, 8);
  // Página 2: Ítems 9 a 21 (CABINA, CARROCERÍA, SEGURIDAD Y EMERGENCIAS, RECAUDO, DOCUMENTOS, CHASIS)
  const itemsPagina2 = LISTA_CRITERIOS.slice(8, 21);

  // Agrupación por categoría para renderizado visual
  const agruparPorCategoria = (items: CriterioItem[]) => {
    const grupos: { categoria: string; items: CriterioItem[] }[] = [];
    items.forEach(item => {
      let grupo = grupos.find(g => g.categoria === item.categoria);
      if (!grupo) {
        grupo = { categoria: item.categoria, items: [] };
        grupos.push(grupo);
      }
      grupo.items.push(item);
    });
    return grupos;
  };

  const gruposPagina1 = agruparPorCategoria(itemsPagina1);
  const gruposPagina2 = agruparPorCategoria(itemsPagina2);

  const handleDescargar = async () => {
    if (!page1Ref.current || !page2Ref.current) return;
    setGenerando(true);
    try {
      const cleanPlaca = String(placaVehiculo).replace(/[^a-zA-Z0-9]/g, '');
      const cleanDate = new Date().toISOString().slice(0, 10);
      const filename = `Preoperacional_${cleanPlaca}_${cleanDate}.pdf`;
      await generarPreoperacionalPDF(page1Ref.current, page2Ref.current, filename);
    } catch (err) {
      console.error(err);
      alert('Hubo un problema al generar el archivo PDF. Intente de nuevo.');
    } finally {
      setGenerando(false);
    }
  };

  // Renderizador de Tabla de Chequeo
  const renderTablaChequeo = (grupos: { categoria: string; items: CriterioItem[] }[]) => (
    <table className="w-full text-[9px] border-collapse">
      <thead>
        <tr className="bg-[#07152B] text-white">
          <th className="py-1 px-2 text-left w-10 font-bold border-r border-slate-700">N°</th>
          <th className="py-1 px-3 text-left font-bold border-r border-slate-700">Criterio de Inspección</th>
          <th className="py-1 px-4 text-center w-52 font-bold">Resultado</th>
        </tr>
      </thead>
      <tbody>
        {grupos.map((grupo, gIdx) => (
          <React.Fragment key={gIdx}>
            {/* Fila de Encabezado de Categoría */}
            <tr className="bg-[#E8EDF5] border-t border-b border-slate-300/80">
              <td colSpan={3} className="py-1 px-2.5 font-extrabold text-[#07152B] text-[8.5px] uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-3 bg-[#07152B] inline-block rounded-xs"></span>
                  <span>{grupo.categoria}</span>
                </div>
              </td>
            </tr>

            {/* Ítems dentro de la categoría */}
            {grupo.items.map((item) => {
              const cumple = getCriterioValue(data, item.keys);
              return (
                <tr key={item.num} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="py-1.5 px-2 text-left font-bold text-slate-800 border-r border-slate-200">
                    {item.num}
                  </td>
                  <td className="py-1.5 px-3 text-left text-slate-900 font-medium border-r border-slate-200 leading-snug">
                    {item.criterio}
                  </td>
                  <td className="py-1.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-5">
                      {/* Opción CUMPLE */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          cumple 
                            ? 'border-slate-800 bg-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {cumple && <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>}
                        </span>
                        <span className={`text-[8.5px] font-bold tracking-tight ${cumple ? 'text-slate-900' : 'text-slate-400'}`}>
                          CUMPLE
                        </span>
                      </div>

                      {/* Opción NO CUMPLE */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          !cumple 
                            ? 'border-rose-600 bg-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {!cumple && <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>}
                        </span>
                        <span className={`text-[8.5px] font-bold tracking-tight ${!cumple ? 'text-rose-600' : 'text-slate-400'}`}>
                          NO CUMPLE
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Barra Superior del Modal */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Plantilla Oficial de Preoperacional (PDF)
              </h3>
              <p className="text-xs text-slate-400">
                Formato institucional CCSI · Cartagena Complementaria y Social · SURA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDescargar}
              disabled={generando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {generando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container with PDF Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/60 flex flex-col items-center gap-8">
          
          {/* ==================== PÁGINA 1 ==================== */}
          <div
            ref={page1Ref}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 p-8 shadow-xl flex flex-col justify-between font-sans shrink-0 select-text"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-4">
              {/* Encabezado */}
              <HeaderPlantilla numeroRadicado={numeroRadicado} logoSrc={logoBase64} />

              {/* Mensaje de Advertencia Institucional */}
              <p className="text-[8.5px] text-[#555] italic leading-tight">
                Revisa cada punto antes de iniciar tu recorrido para evitar varadas o accidentes. Si algún elemento no cumple, informa de inmediato al encargado de la flota.
              </p>

              {/* 1. Datos del Operador (Conductor) */}
              <div>
                <h3 className="text-[11px] font-extrabold text-[#B71C1C] uppercase tracking-wide border-b border-slate-900 pb-0.5">
                  1. Datos del Operador (Conductor)
                </h3>
                
                {/* Fila de Información General */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-2 text-[9px]">
                  <div>
                    <span className="block font-bold text-slate-900">Fecha y Hora de Registro</span>
                    <span className="block text-slate-700 font-mono mt-0.5">{fechaRegistroStr}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Nombres y Apellidos</span>
                    <span className="block text-slate-900 font-bold uppercase mt-0.5">{nombreOperador}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Cédula de Ciudadanía</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{cedulaOperador}</span>
                  </div>
                </div>

                {/* Pregunta de Salud */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[9px]">
                  <div>
                    <span className="block font-bold text-slate-900">
                      ¿Estás en condiciones de salud y descanso para conducir?
                    </span>
                    <span className="block text-[8px] text-slate-400 italic mt-0.5">
                      estado_salud · sin malestar, mareo, sueño u otros síntomas
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        estadoSalud ? 'border-slate-800 bg-white' : 'border-slate-300 bg-white'
                      }`}>
                        {estadoSalud && <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>}
                      </span>
                      <span className={`text-[8.5px] font-bold ${estadoSalud ? 'text-slate-900' : 'text-slate-400'}`}>
                        SÍ
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        !estadoSalud ? 'border-rose-600 bg-white' : 'border-slate-300 bg-white'
                      }`}>
                        {!estadoSalud && <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>}
                      </span>
                      <span className={`text-[8.5px] font-bold ${!estadoSalud ? 'text-rose-600' : 'text-slate-400'}`}>
                        NO
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Datos del Vehículo y Operación */}
              <div>
                <h3 className="text-[11px] font-extrabold text-[#B71C1C] uppercase tracking-wide border-b border-slate-900 pb-0.5">
                  2. Datos del Vehículo y Operación
                </h3>

                <div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-2 text-[9px]">
                  <div>
                    <span className="block font-bold text-slate-900">Placa</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{placaVehiculo}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">TC del Vehículo (código interno)</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{tcVehiculo}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Tipo de Vehículo</span>
                    <span className="block text-slate-800 mt-0.5">{tipoVehiculo}</span>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-900">Kilometraje</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{kmVehiculo}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Ruta Asignada</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{rutaAsignada}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Vigencia SOAT</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{soatVenc}</span>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-900">Vigencia Técnico-Mecánica (RTM)</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{rtmVenc}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Vigencia RCC</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{rccVenc}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Vigencia RCE</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{rceVenc}</span>
                  </div>

                  <div>
                    <span className="block font-bold text-slate-900">Vigencia Extintor 1</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{ext1Venc}</span>
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Vigencia Extintor 2</span>
                    <span className="block text-slate-800 font-mono mt-0.5">{ext2Venc}</span>
                  </div>
                  <div></div>
                </div>
              </div>

              {/* 3. Lista de Chequeo — Condición del Vehículo (Página 1: Ítems 1 a 8) */}
              <div>
                <h3 className="text-[11px] font-extrabold text-[#B71C1C] uppercase tracking-wide border-b border-slate-900 pb-0.5 mb-2">
                  3. Lista de Chequeo — Condición del Vehículo
                </h3>

                {renderTablaChequeo(gruposPagina1)}
              </div>
            </div>

            {/* Pie de página Página 1 */}
            <FooterPlantilla />
          </div>


          {/* ==================== PÁGINA 2 ==================== */}
          <div
            ref={page2Ref}
            className="w-[794px] min-h-[1123px] bg-white text-slate-900 p-8 shadow-xl flex flex-col justify-between font-sans shrink-0 select-text"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-4">
              {/* Encabezado Página 2 */}
              <HeaderPlantilla numeroRadicado={numeroRadicado} logoSrc={logoBase64} />

              {/* Continuación de Lista de Chequeo (Ítems 9 a 21) */}
              <div>
                {renderTablaChequeo(gruposPagina2)}
              </div>

              {/* 4. Observaciones y Cierre */}
              <div className="mt-4">
                <h3 className="text-[11px] font-extrabold text-[#B71C1C] uppercase tracking-wide border-b border-slate-900 pb-0.5">
                  4. Observaciones y Cierre
                </h3>

                <div className="mt-2 text-[9px]">
                  <span className="block font-bold text-slate-900 mb-0.5">
                    Observaciones y Hallazgos
                  </span>
                  <span className="block text-[8px] text-slate-400 italic mb-1.5">
                    observaciones_hallazgos
                  </span>
                  <div className="w-full min-h-[120px] p-3 rounded-xs border border-slate-300 bg-slate-50/40 text-slate-800 text-[9.5px] leading-relaxed">
                    {obsOperador}
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de página Página 2 */}
            <FooterPlantilla />
          </div>

        </div>

      </div>
    </div>
  );
}

