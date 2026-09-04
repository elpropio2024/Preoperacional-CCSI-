import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  FileText, 
  Clock, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  CreditCard,
  ArrowRight,
  ClipboardList,
  Camera,
  CornerDownRight,
  Mail,
  Phone
} from 'lucide-react';

export default function FormularioCitasMedicas() {
  // Form field states
  const [identificacion, setIdentificacion] = useState('');
  const [operadorNombre, setOperadorNombre] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [telefonoContacto, setTelefonoContacto] = useState('');

  // Status and view flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [airtableRecordId, setAirtableRecordId] = useState('');

  // Environment variables
  const airtableToken = import.meta.env.VITE_AIRTABLE_TOKEN || import.meta.env.VITE_AIRTABLE_API_KEY || '';
  const airtableBaseId = import.meta.env.VITE_AIRTABLE_BASE_ID || '';
  const airtableTableName = import.meta.env.VITE_AIRTABLE_TABLE_NAME || 'SOLICITUDES';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset status
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    // Pre-validations
    if (!identificacion || !operadorNombre || !fechaInicio || !fechaFin || !motivo || !correoElectronico || !telefonoContacto) {
      setSubmitStatus('error');
      setErrorMessage('Por favor, completa todos los campos requeridos (*).');
      setIsSubmitting(false);
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setSubmitStatus('error');
      setErrorMessage('La fecha de inicio no puede ser posterior a la fecha de fin.');
      setIsSubmitting(false);
      return;
    }

    // Build the payload with exact column names requested by user
    const payload = {
      records: [
        {
          fields: {
            "Identificación": identificacion,
            "Operador Nombre": operadorNombre,
            "Fecha Inicio": fechaInicio,
            "Fecha Fin": fechaFin,
            "Motivo": motivo,
            "Observaciones": observaciones || "",
            "correo_electronico": correoElectronico,
            "telefono_de_contacto": telefonoContacto,
            "Estado Solicitud": "Pendiente"
          }
        }
      ]
    };

    try {
      if (!airtableToken || !airtableBaseId) {
        throw new Error('Faltan configurar las credenciales de Airtable en las variables de entorno (.env). Verifique VITE_AIRTABLE_TOKEN y VITE_AIRTABLE_BASE_ID.');
      }

      const response = await fetch(
        `https://api.airtable.com/v0/${airtableBaseId}/${encodeURIComponent(airtableTableName)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${airtableToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `Error del servidor de Airtable (Código HTTP ${response.status}). Asegúrate de que las columnas coincidan exactamente en tu tabla de Airtable y que tu token de acceso tenga los permisos de escritura necesarios.`
        );
      }

      const data = await response.json();
      const generatedId = data.records?.[0]?.id || `REC-${Math.floor(Math.random() * 90000 + 10000)}`;
      
      setAirtableRecordId(generatedId);
      setSubmitStatus('success');
      
      // Step into the summary view WITHOUT resetting form values immediately as requested
      setMostrarResumen(true);

    } catch (err: any) {
      console.error('Error al enviar la solicitud a Airtable:', err);
      setSubmitStatus('error');
      setErrorMessage(err.message || 'Error de red inesperado al conectarse con la API de Airtable. Intente nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    // Reset all form values and return to form view
    setIdentificacion('');
    setOperadorNombre('');
    setFechaInicio('');
    setFechaFin('');
    setMotivo('');
    setObservaciones('');
    setCorreoElectronico('');
    setTelefonoContacto('');
    setSubmitStatus('idle');
    setMostrarResumen(false);
    setAirtableRecordId('');
  };

  return (
    <div className="w-full max-w-md mx-auto p-5 bg-[#0f0f11] text-zinc-100 min-h-screen font-sans flex flex-col justify-start">
      
      {/* Header Container */}
      <div className="mb-6 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-zinc-900 border border-zinc-800 mb-2">
          <ClipboardList className="w-6 h-6 text-emerald-500" />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-white uppercase">
          Registro de Solicitudes
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Módulo administrativo para operadores y conductores
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!mostrarResumen ? (
          // FORM VIEW
          <motion.form
            key="form-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="space-y-5 flex-grow"
          >
            {/* Operator Identification */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                Identificación <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Escribe tu número de cédula o documento"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
              />
            </div>

            {/* Operator Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                Nombre del Operador <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Escribe tus nombres y apellidos"
                value={operadorNombre}
                onChange={(e) => setOperadorNombre(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
              />
            </div>

            {/* Reason/Motivo dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Motivo <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
              >
                <option value="" disabled>Seleccione el motivo de la solicitud...</option>
                <option value="CALAMIDAD DOMESTICA">CALAMIDAD DOMESTICA</option>
                <option value="DIA DE LA FAMILIA">DIA DE LA FAMILIA</option>
                <option value="ESTUDIO">ESTUDIO</option>
                <option value="LICENCIA DE MATERNIDAD">LICENCIA DE MATERNIDAD</option>
                <option value="LICENCIA DE PATERNIDAD">LICENCIA DE PATERNIDAD</option>
                <option value="LICENCIA POR LUTO">LICENCIA POR LUTO</option>
                <option value="PERSONAL">PERSONAL</option>
                <option value="SALUD">SALUD</option>
                <option value="SUSPENSIONES">SUSPENSIONES</option>
                <option value="VACACIONES">VACACIONES</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>

            {/* Date Ranges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Fecha Inicio <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Fecha Fin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Correo Electrónico y Teléfono de Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={correoElectronico}
                  onChange={(e) => setCorreoElectronico(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  Teléfono de Contacto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 3001234567"
                  value={telefonoContacto}
                  onChange={(e) => setTelefonoContacto(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
                />
              </div>
            </div>

            {/* Observaciones textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Observaciones
              </label>
              <textarea
                placeholder="Escribe detalles adicionales de tu solicitud..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-550 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm resize-none"
              />
            </div>

            {/* Error state box (Aesthetic wine/maroon background with red border) */}
            {submitStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl border border-rose-900 bg-rose-950/20 text-rose-300 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-extrabold uppercase tracking-wider block text-rose-400">
                    Ocurrió un inconveniente
                  </span>
                  <p className="leading-relaxed font-medium">
                    {errorMessage}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-850 text-[#0c0c0e] font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#0c0c0e]" />
                  <span>ENVIAR SOLICITUD</span>
                </>
              )}
            </button>
          </motion.form>
        ) : (
          // SUMMARY SUCCESS VIEW
          <motion.div
            key="summary-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6 flex-grow"
          >
            {/* Visual reassurance check mark */}
            <div className="flex flex-col items-center justify-center py-6 text-center bg-zinc-950/40 border border-zinc-800 rounded-2xl p-4">
              <div className="p-4 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 mb-3.5 animate-pulse">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-emerald-400 uppercase">
                ¡Solicitud Radicada!
              </h2>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                <span>ID:</span>
                <span className="font-bold text-zinc-200">{airtableRecordId}</span>
              </div>
            </div>

            {/* Instructions box */}
            <div className="p-4 rounded-xl border border-emerald-950 bg-emerald-950/10 text-emerald-300 flex items-start gap-3">
              <Camera className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-bounce" />
              <div className="space-y-1 text-xs">
                <span className="font-extrabold uppercase tracking-wider block text-emerald-400">
                  Comprobante Importante
                </span>
                <p className="leading-relaxed font-semibold">
                  Por favor toma una captura de pantalla de este resumen como comprobante de tu registro.
                </p>
              </div>
            </div>

            {/* Read-only beautiful layout of details */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
                Resumen de Información
              </h3>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                <div>
                  <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                    Identificación
                  </span>
                  <span className="text-zinc-100 font-bold font-mono tracking-wide mt-0.5 block">
                    {identificacion}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                    Operador
                  </span>
                  <span className="text-zinc-100 font-bold mt-0.5 block truncate uppercase">
                    {operadorNombre}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                    Motivo Solicitado
                  </span>
                  <span className="text-zinc-100 font-bold mt-0.5 block">
                    {motivo}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                    Estado Actual
                  </span>
                  <span className="text-emerald-400 font-bold mt-0.5 block flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Pendiente</span>
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                    Fechas de Permiso
                  </span>
                  <div className="flex items-center gap-2 mt-1 text-zinc-100 font-bold">
                    <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 font-mono text-[11px]">{fechaInicio}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="bg-zinc-950 px-2 py-1 rounded border border-zinc-800 font-mono text-[11px]">{fechaFin}</span>
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                      Correo Electrónico
                    </span>
                    <span className="text-zinc-100 font-semibold font-mono text-[11px] mt-0.5 block truncate">
                      {correoElectronico}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                      Teléfono de Contacto
                    </span>
                    <span className="text-zinc-100 font-semibold font-mono text-[11px] mt-0.5 block">
                      {telefonoContacto}
                    </span>
                  </div>
                </div>

                {observaciones && (
                  <div className="col-span-2 pt-2 border-t border-zinc-800/60">
                    <span className="text-zinc-500 uppercase font-bold text-[10px] tracking-wider block">
                      Observaciones
                    </span>
                    <p className="text-zinc-300 font-medium italic leading-relaxed mt-1 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/50">
                      "{observaciones}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Back to form button */}
            <button
              onClick={handleResetForm}
              className="w-full py-3 px-5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:text-white text-zinc-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Registrar Otra Solicitud</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Humble branding note */}
      <div className="mt-8 pt-4 border-t border-zinc-900/80 text-center">
        <span className="text-[10px] font-medium text-zinc-600 tracking-wide">
          SISTEMA DE ASISTENCIA OPERACIONAL
        </span>
      </div>

    </div>
  );
}
