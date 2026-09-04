import React, { useState } from 'react';
import { FileText, XCircle, ShieldAlert, AlertTriangle, FileDown } from 'lucide-react';
import ModalPreoperacionalPDF from './ModalPreoperacionalPDF';

interface ModalRevisionPreoperacionalProps {
  selectedPreop: any;
  isLight: boolean;
  onClose: () => void;
  onAuthorize?: (id_inspeccion: string) => void | Promise<void>;
}

export default function ModalRevisionPreoperacional({
  selectedPreop,
  isLight,
  onClose,
  onAuthorize
}: ModalRevisionPreoperacionalProps) {
  const [showPdfModal, setShowPdfModal] = useState(false);
  if (!selectedPreop) return null;

  // Adapt vehicles & operators fields which could be nested or flat
  const vehObj = Array.isArray(selectedPreop.vehiculos) 
    ? selectedPreop.vehiculos[0] 
    : (selectedPreop.vehiculos || selectedPreop.vehiculo || selectedPreop);

  const operObj = Array.isArray(selectedPreop.operadores) 
    ? selectedPreop.operadores[0] 
    : (selectedPreop.operadores || selectedPreop.operador || selectedPreop);

  // Consolidated data for PDF
  const pdfPayload = {
    ...selectedPreop,
    codigo: selectedPreop.id_inspeccion || selectedPreop.codigo || `PREO-${String(selectedPreop.id || '').slice(0, 6).toUpperCase()}`,
    fecha: selectedPreop.fecha || selectedPreop.created_at,
    operador_nombre: operObj?.nombres_apellidos || selectedPreop.operador_nombre || selectedPreop.conductor_nombre,
    identificacion: operObj?.identificacion || selectedPreop.conductor_cedula || selectedPreop.identificacion || selectedPreop.cedula,
    conductor_cedula: operObj?.identificacion || selectedPreop.conductor_cedula || selectedPreop.identificacion || selectedPreop.cedula,
    placa: vehObj?.placa || selectedPreop.placa,
    tc: vehObj?.tc || selectedPreop.tc,
    tipo_vehiculo: vehObj?.tipo_vehiculo || selectedPreop.tipo_vehiculo,
    kilometraje: selectedPreop.kilometraje || selectedPreop.odometro,
    ruta_asignada: selectedPreop.ruta_asignada || 'X101',
    estado_autorizacion: selectedPreop.estado_autorizacion || 'Autorizado',
    hist_soat: selectedPreop.hist_soat,
    hist_vencimiento_soat: selectedPreop.hist_vencimiento_soat,
    hist_rtm: selectedPreop.hist_rtm,
    hist_rtm_vencimiento: selectedPreop.hist_rtm_vencimiento,
    hist_rcc: selectedPreop.hist_rcc,
    hist_vencimiento_rcc: selectedPreop.hist_vencimiento_rcc,
    hist_rce: selectedPreop.hist_rce,
    hist_vencimiento_rce: selectedPreop.hist_vencimiento_rce,
    vencimiento_soat: selectedPreop.hist_vencimiento_soat || vehObj?.vencimiento_soat,
    estado_soat: vehObj?.estado_soat,
    rtm_vencimiento: selectedPreop.hist_rtm_vencimiento || vehObj?.rtm_vencimiento,
    estado_rtm: vehObj?.estado_rtm,
    vencimiento_rcc: selectedPreop.hist_vencimiento_rcc || vehObj?.vencimiento_rcc,
    estado_rcc: vehObj?.estado_rcc,
    vencimiento_rce: selectedPreop.hist_vencimiento_rce || vehObj?.vencimiento_rce,
    estado_rce: vehObj?.estado_rce,
    observaciones_hallazgos: selectedPreop.observaciones_hallazgos || selectedPreop.observaciones,
    observaciones_jefe: selectedPreop.observaciones_jefe
  };

  // 1. SOAT Doc validity check
  let isSoatVigente = true;
  if (vehObj) {
    const rawSoatState = String(vehObj.estado_soat || "").toLowerCase();
    const rawSoatVigente = vehObj.soat_vigente;
    const rawVenc = vehObj.vencimiento_soat;
    
    if (rawSoatState.includes("vencido") || rawSoatState === "vencido" || rawSoatVigente === false || rawSoatVigente === "false") {
      isSoatVigente = false;
    } else if (rawVenc) {
      try {
        if (new Date(rawVenc) < new Date()) {
          isSoatVigente = false;
        }
      } catch (err) {
        console.warn("Error parsing SOAT expiration date:", err);
      }
    }
  }

  // 2. Tecnicomecánica (RTM) validity check
  let isRtmVigente = true;
  if (vehObj) {
    const rawRtmState = String(vehObj.estado_rtm || "").toLowerCase();
    const rawRtmVigente = vehObj.tecnico_vigente;
    const rawVenc = vehObj.rtm_vencimiento;
    
    if (rawRtmState.includes("vencido") || rawRtmState === "vencido" || rawRtmVigente === false || rawRtmVigente === "false") {
      isRtmVigente = false;
    } else if (rawVenc) {
      try {
        if (new Date(rawVenc) < new Date()) {
          isRtmVigente = false;
        }
      } catch (err) {
        console.warn("Error parsing RTM expiration date:", err);
      }
    }
  }

  // 3. Licencia de Conducción status
  let isLicenciaVigente = true;
  if (operObj) {
    const rawLicState = String(operObj.estado_licencia || "").toLowerCase();
    const rawLicVigente = operObj.licencia_vigente;
    const rawVenc = operObj.licencia_vencimiento;

    if (rawLicState.includes("vencido") || rawLicState === "vencido" || rawLicVigente === false || rawLicVigente === "false") {
      isLicenciaVigente = false;
    } else if (rawVenc) {
      try {
        if (new Date(rawVenc) < new Date()) {
          isLicenciaVigente = false;
        }
      } catch (err) {
        console.warn("Error parsing License expiration date:", err);
      }
    }
  }

  const hasExpiredDocuments = !isSoatVigente || !isRtmVigente || !isLicenciaVigente;

  // Critical Checklist Items:
  const isSelectedPreopFrenosOk = selectedPreop.estado_frenos === true || selectedPreop.estado_frenos === 'true';
  const isSelectedPreopSuspensionOk = selectedPreop.estado_suspension_direccion === true || selectedPreop.estado_suspension_direccion === 'true' || selectedPreop.estado_suspension === true || selectedPreop.estado_suspension === 'true';
  const isSelectedPreopLucesOk = selectedPreop.luces_bocina === true || selectedPreop.luces_bocina === 'true';
  const isSelectedPreopAireOk = selectedPreop.presion_fugas_aire === true || selectedPreop.presion_fugas_aire === 'true';
  
  const selectedPreopHasNovedades = !isSelectedPreopFrenosOk || !isSelectedPreopSuspensionOk || !isSelectedPreopLucesOk || !isSelectedPreopAireOk;

  const vehiclePlaca = selectedPreop.vehiculo_placa || (selectedPreop.vehiculo?.placa) || 'N/D';
  const vehicleTc = selectedPreop.vehiculo_tc || (selectedPreop.vehiculo?.tc) || 'N/D';
  const driverName = selectedPreop.conductor_nombre || (selectedPreop.operador?.nombres_apellidos) || 'N/D';
  const driverCedula = selectedPreop.conductor_cedula || (selectedPreop.operador?.identificacion) || 'N/D';
  const routeAssigned = selectedPreop.ruta_codigo || selectedPreop.ruta_asignada || 'N/D';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="preop-modal-panel">
      <div className={`w-full max-w-md mx-2 md:max-w-3xl my-auto rounded-2xl md:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[85vh] border shadow-2xl overflow-hidden animate-zoom-in ${
        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
      }`}>
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-indigo-600 dark:text-indigo-455 flex items-center gap-2">
              <FileText className="w-4 h-4 shrink-0" />
              <span>Inspección Preoperacional</span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {selectedPreop.id_inspeccion}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all focus:outline-none"
          >
            <XCircle className="w-5 h-5 text-slate-400 hover:text-slate-650" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          
          {/* Conductor & Bus Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-slate-5/70 border-slate-150 shadow-sm' : 'bg-zinc-950 border-zinc-850'}`}>
              <span className={`text-[9.5px] uppercase font-mono font-black ${isLight ? 'text-slate-800' : 'text-zinc-400'}`}>Operador (Conductor)</span>
              <h4 className="font-black text-base border-b pb-1 leading-tight tracking-tight whitespace-normal break-words mt-1 text-slate-950 border-slate-200">
                {driverName}
              </h4>
              <p className={`text-[11px] font-mono font-bold mt-1.5 ${isLight ? 'text-slate-800' : 'text-zinc-350'}`}>CC {driverCedula}</p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-slate-5/70 border-slate-150 shadow-sm' : 'bg-zinc-950 border-zinc-850'}`}>
              <span className={`text-[9.5px] uppercase font-mono font-black ${isLight ? 'text-slate-800' : 'text-zinc-400'}`}>Vehículo Registrado</span>
              <h4 className="text-xs font-black mt-1 uppercase text-indigo-950 dark:text-indigo-950">
                BUS PLACA: {vehiclePlaca}
              </h4>
              <p className={`text-[10px] font-mono font-bold mt-0.5 ${isLight ? 'text-slate-800' : 'text-zinc-350'}`}>
                TC Identificador: {vehicleTc}
              </p>
              {selectedPreop.kilometraje && (
                <p className={`text-[10px] font-mono font-bold mt-0.5 ${isLight ? 'text-slate-850' : 'text-zinc-350'}`}>
                  Kilometraje: {Number(selectedPreop.kilometraje).toLocaleString()} Km
                </p>
              )}
              {routeAssigned !== 'N/D' && (
                <p className={`text-[10px] font-mono font-black mt-1 ${isLight ? 'text-blue-900' : 'text-indigo-300'}`}>
                  Ruta: {routeAssigned}
                </p>
              )}
            </div>
          </div>

          {/* ESTADO LEGAL Y DOCUMENTAL */}
          <div className={`p-4 rounded-2xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-855'
          }`}>
            <h4 className={`text-[10px] font-mono font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
              isLight ? 'text-slate-600' : 'text-zinc-300'
            }`}>
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Estado Legal y Documental (Runt)</span>
            </h4>
            
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800/60 pb-1.5">
                <span className="font-semibold text-slate-600 dark:text-zinc-400">SOAT (Vehículo):</span>
                {isSoatVigente ? (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
                )}
              </div>
              
              <div className="flex items-center justify-between border-b border-dashed border-slate-200 dark:border-zinc-800/60 pb-1.5">
                <span className="font-semibold text-slate-600 dark:text-zinc-400">Tecnicomecánica (RTM):</span>
                {isRtmVigente ? (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-zinc-400">Licencia de Conducción (Pase):</span>
                {isLicenciaVigente ? (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">VIGENTE ✓</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-black text-[9.5px] bg-rose-500/15 text-rose-600 dark:text-rose-455 border border-rose-500/30 animate-pulse">VENCIDO ⚠️</span>
                )}
              </div>
            </div>
          </div>

          {/* Checklist Verification Title */}
          <div>
            <h4 className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400 mb-3 block">
              Resultado Checklist de Seguridad Crítica
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Check item: Frenos */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
              }`}>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Sist. de Frenos</span>
                {isSelectedPreopFrenosOk ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 font-extrabold pb-0.5 select-none opacity-90 animate-pulse">FALLA ⚠️</span>
                )}
              </div>

              {/* Check item: Dirección/Suspensión */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
              }`}>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Dirección/Suspensión</span>
                {isSelectedPreopSuspensionOk ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 font-extrabold pb-0.5 select-none opacity-90 animate-pulse">FALLA ⚠️</span>
                )}
              </div>

              {/* Check item: Luces y Bocina */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
              }`}>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Luces y Bocina</span>
                {isSelectedPreopLucesOk ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600">APTO ✓</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 font-extrabold pb-0.5 select-none opacity-90 animate-pulse">FALLA ⚠️</span>
                )}
              </div>

              {/* Check item: Fugas de Aire */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                isLight ? 'bg-slate-55 border-slate-150' : 'bg-zinc-950/40 border-zinc-900'
              }`}>
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-350">Presión / Fugas Aire</span>
                {isSelectedPreopAireOk ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-655">APTO ✓</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 font-extrabold pb-0.5 select-none opacity-90 animate-pulse">FALLA ⚠️</span>
                )}
              </div>

            </div>
          </div>

          {/* RED WARNING BANNER WARNING OF NOVEDADES CRITICAS */}
          {selectedPreopHasNovedades && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-600 dark:text-rose-455 animate-pulse">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 block mt-0.5" />
              <div>
                <p className="text-xs font-extrabold uppercase">¡ADVERTENCIA: El vehículo presenta novedades críticas!</p>
                <p className="text-[10px] leading-relaxed mt-1">
                  Se han encontrado ítems no conformes en la revisión física preoperacional. Se recomienda ordenar revisión por patio mecánica inmediata.
                </p>
              </div>
            </div>
          )}

          {/* RED WARNING BANNER OF EXPIRED DOCUMENTS OR SAFETY FAILS */}
          {hasExpiredDocuments && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-650 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-650 block mt-0.5 animate-bounce" />
              <div>
                <p className="text-xs font-black uppercase">SALIDA VIAL NO AUTORIZABLE</p>
                <p className="text-[10px] leading-relaxed mt-1 font-bold">
                  ⚠️ REGLA OPERATIVA DE SEGURIDAD: Uno o más documentos obligatorios de ley (SOAT, Técnico-Mecánica o Pase) se encuentran en estado VENCIDO. El despacho de este móvil por fuera de la regulación vial está de momento inhabilitado preventivamente.
                </p>
              </div>
            </div>
          )}

          {/* Observación del Operador (Condicional) */}
          {(selectedPreop.observaciones_hallazgos || selectedPreop.observaciones) && (
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 mt-1.5 shadow-sm dark:bg-amber-955/20 dark:border-amber-900/40 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-extrabold mb-1.5">
                <span className="text-sm">💬</span>
                <span>Observación del Operador:</span>
              </div>
              <p className="font-medium leading-relaxed">
                {selectedPreop.observaciones_hallazgos || selectedPreop.observaciones}
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer with "Autorizar Salida Vial" update trigger */}
        <div className="p-6 border-t border-slate-150 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/30 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex-1 min-w-[180px] py-3 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Descargar Formato PDF
          </button>

          <button
            onClick={onClose}
            className={`py-3 px-6 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
              isLight ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {onAuthorize ? 'Cancelar' : 'Cerrar'}
          </button>

          {onAuthorize && (
            <button
              disabled={hasExpiredDocuments}
              onClick={() => onAuthorize(selectedPreop.id_inspeccion)}
              className={`flex-1 min-w-[180px] py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all focus:outline-none ${
                hasExpiredDocuments 
                  ? 'bg-slate-300 dark:bg-zinc-850 text-slate-500 dark:text-zinc-500 cursor-not-allowed shadow-none' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              Autorizar Salida Vial
            </button>
          )}
        </div>

      </div>

      {showPdfModal && (
        <ModalPreoperacionalPDF
          data={pdfPayload}
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
}
