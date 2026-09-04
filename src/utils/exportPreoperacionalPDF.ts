import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PreoperacionalData {
  id_inspeccion?: string;
  codigo?: string;
  fecha?: string;
  created_at?: string;
  estado_autorizacion?: string;
  resultado_dictamen?: string;
  regulador_nombre?: string;
  regulador_cedula?: string;
  fecha_autorizacion?: string;
  
  // Operador
  operador_nombre?: string;
  nombres_apellidos?: string;
  identificacion?: string;
  cedula?: string;
  licencia_vencimiento?: string;
  
  // Trazabilidad Histórica de Documentos del Vehículo
  hist_soat?: string | null;
  hist_vencimiento_soat?: string | null;
  hist_rtm?: string | null;
  hist_rtm_vencimiento?: string | null;
  hist_rcc?: string | null;
  hist_vencimiento_rcc?: string | null;
  hist_rce?: string | null;
  hist_vencimiento_rce?: string | null;

  // Vehículo
  placa?: string;
  tc?: string;
  numero_interno?: string;
  tipo_vehiculo?: string;
  tipo?: string;
  kilometraje?: number | string;
  odometro?: number | string;
  ruta_asignada?: string;
  vencimiento_soat?: string;
  rtm_vencimiento?: string;
  vencimiento_rcc?: string;
  vencimiento_rce?: string;
  exp_extintor_1?: string;
  exp_extintor_2?: string;
  vencimiento_extintor_1?: string;
  vencimiento_extintor_2?: string;
  estado_extintor_1?: string;
  estado_extintor_2?: string;
  
  // 22 Criterios Preoperacionales
  estado_salud?: boolean;
  p1_salud_descanso?: boolean;
  
  estado_llantas_guardapolvos?: boolean;
  p2_llantas_guardapolvos?: boolean;
  
  motor_correas_radiador_mangueras?: boolean;
  niveles_liquidos?: boolean;
  p5_niveles_liquidos?: boolean;
  
  fugas_fluidos?: boolean;
  p6_sin_fugas?: boolean;
  
  presion_fugas_aire?: boolean;
  p7_presion_aire?: boolean;
  
  estado_frenos?: boolean;
  p8_frenos?: boolean;
  
  luces_bocina?: boolean;
  p3_luces_bocina?: boolean;
  
  parabrisas?: boolean;
  p9_parabrisas_plumillas?: boolean;
  
  espejos?: boolean;
  p4_espejos_limpieza?: boolean;
  
  switch_alarma_retroceso?: boolean;
  elementos_retencion?: boolean;
  p10_cinturon_sillas?: boolean;
  
  luces_tablero_testigos?: boolean;
  p13_testigos_tablero?: boolean;
  
  puertas_vidrios?: boolean;
  rampa_pmr?: boolean;
  timbre_senalizacion?: boolean;
  
  angel_guardian?: boolean;
  equipos_prevencion?: boolean;
  p12_insumos_emergencia?: boolean;
  
  martillos_salidas_emergencia?: boolean;
  equipos_recaudo?: boolean;
  
  documentos?: boolean;
  p11_documentos_vigentes?: boolean;
  
  estado_suspension_direccion?: boolean;
  p14_direccion_suspension?: boolean;
  
  // Observaciones
  observaciones_hallazgos?: string;
  observaciones?: string;
  observaciones_jefe?: string;
  
  [key: string]: any;
}

export interface CriterioItem {
  num: number;
  categoria: string;
  criterio: string;
  keys: string[];
}

export const LISTA_CRITERIOS: CriterioItem[] = [
  // EXTERIOR
  {
    num: 1,
    categoria: 'EXTERIOR',
    criterio: 'Llantas: labrado, presión, sin cortaduras ni abultamientos',
    keys: ['estado_llantas_guardapolvos', 'p2_llantas_guardapolvos', 'p2']
  },

  // MOTOR
  {
    num: 2,
    categoria: 'MOTOR',
    criterio: 'Correas, radiador y mangueras sin daños visibles',
    keys: ['motor_correas_radiador_mangueras']
  },
  {
    num: 3,
    categoria: 'MOTOR',
    criterio: 'Niveles de aceite, refrigerante, dirección y frenos',
    keys: ['niveles_liquidos', 'p5_niveles_liquidos', 'p5']
  },
  {
    num: 4,
    categoria: 'MOTOR',
    criterio: 'Sin fugas de fluidos en el motor ni en el piso',
    keys: ['fugas_fluidos', 'p6_sin_fugas', 'p6']
  },

  // FRENOS
  {
    num: 5,
    categoria: 'FRENOS',
    criterio: 'Presión y fugas de aire del sistema neumático',
    keys: ['presion_fugas_aire', 'p7_presion_aire', 'p7']
  },
  {
    num: 6,
    categoria: 'FRENOS',
    criterio: 'Freno de servicio y freno de emergencia/parqueo',
    keys: ['estado_frenos', 'p8_frenos', 'p8']
  },

  // LUCES Y VISIBILIDAD
  {
    num: 7,
    categoria: 'LUCES Y VISIBILIDAD',
    criterio: 'Luces: altas, bajas, direccionales, freno/reversa y bocina',
    keys: ['luces_bocina', 'p3_luces_bocina', 'p3']
  },
  {
    num: 8,
    categoria: 'LUCES Y VISIBILIDAD',
    criterio: 'Parabrisas, vidrios (frontal, trasero, laterales) y plumillas',
    keys: ['parabrisas', 'p9_parabrisas_plumillas', 'p9']
  },

  // CABINA
  {
    num: 9,
    categoria: 'CABINA',
    criterio: 'Espejos laterales y central: limpios y bien ajustados',
    keys: ['espejos', 'p4_espejos_limpieza', 'p4']
  },
  {
    num: 10,
    categoria: 'CABINA',
    criterio: 'Switch de arranque y alarma de retroceso',
    keys: ['switch_alarma_retroceso']
  },
  {
    num: 11,
    categoria: 'CABINA',
    criterio: 'Cinturones de seguridad, anclaje y estado de la silletería',
    keys: ['elementos_retencion', 'p10_cinturon_sillas', 'p10']
  },
  {
    num: 12,
    categoria: 'CABINA',
    criterio: 'Testigos, manómetros, velocímetro e indicador de combustible',
    keys: ['luces_tablero_testigos', 'p13_testigos_tablero', 'p13']
  },

  // CARROCERÍA
  {
    num: 13,
    categoria: 'CARROCERÍA',
    criterio: 'Puertas y vidrios de puertas: cierran bien y sin fisuras',
    keys: ['puertas_vidrios']
  },
  {
    num: 14,
    categoria: 'CARROCERÍA',
    criterio: 'Rampa y señalización de espacios para movilidad reducida',
    keys: ['rampa_pmr']
  },
  {
    num: 15,
    categoria: 'CARROCERÍA',
    criterio: 'Timbre y señalización interna reglamentaria',
    keys: ['timbre_senalizacion']
  },

  // SEGURIDAD Y EMERGENCIAS
  {
    num: 16,
    categoria: 'SEGURIDAD Y EMERGENCIAS',
    criterio: 'Sistema Ángel Guardián: carcasa y funcionamiento (si aplica)',
    keys: ['angel_guardian']
  },
  {
    num: 17,
    categoria: 'SEGURIDAD Y EMERGENCIAS',
    criterio: 'Extintores (1 y 2), Fogmaker, botiquín y kit de carretera',
    keys: ['equipos_prevencion', 'p12_insumos_emergencia', 'p12']
  },
  {
    num: 18,
    categoria: 'SEGURIDAD Y EMERGENCIAS',
    criterio: 'Martillos de fragmentación y salidas de emergencia señalizadas',
    keys: ['martillos_salidas_emergencia']
  },

  // RECAUDO
  {
    num: 19,
    categoria: 'RECAUDO',
    criterio: 'Torniquete, validador y unidad lógica operativos',
    keys: ['equipos_recaudo']
  },

  // DOCUMENTOS
  {
    num: 20,
    categoria: 'DOCUMENTOS',
    criterio: 'SOAT, TC, RTM, tarjeta de propiedad y seguros RCC/RCE',
    keys: ['documentos', 'p11_documentos_vigentes', 'p11']
  },

  // CHASIS
  {
    num: 21,
    categoria: 'CHASIS',
    criterio: 'Dirección y suspensión sin ruidos ni durezas',
    keys: ['estado_suspension_direccion', 'p14_direccion_suspension', 'p14']
  }
];

export function getCriterioValue(data: PreoperacionalData, keys: string[]): boolean {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null) {
      if (typeof data[k] === 'boolean') return data[k];
      if (typeof data[k] === 'string') {
        const val = data[k].toLowerCase();
        return val === 'true' || val === 'cumple' || val === 'ok' || val === 'si';
      }
    }
  }
  // Por defecto si no está registrado o null se asume que cumple a menos que sea explícitamente falso
  return true;
}

function oklabToRgbMath(l: number, a: number, b: number): [number, number, number] {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767434770 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? Math.round(clamped * 12.92 * 255)
      : Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255);
  };

  return [toSrgb(r), toSrgb(g), toSrgb(bl)];
}

function oklchToRgbMath(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return oklabToRgbMath(l, a, b);
}

function parseColorFunctionString(colorStr: string): string {
  try {
    const isOklab = /^oklab\(/i.test(colorStr);
    const isOklch = /^oklch\(/i.test(colorStr);
    const isLab = /^lab\(/i.test(colorStr);
    const isLch = /^lch\(/i.test(colorStr);

    const clean = colorStr.replace(/^(?:oklab|oklch|lab|lch)\(/i, '').replace(/\)$/, '').trim();
    const slashSplit = clean.split('/');
    const mainParts = slashSplit[0].trim().split(/[\s,]+/);

    let p1 = parseFloat(mainParts[0]);
    if (mainParts[0].includes('%')) p1 = p1 / 100;
    const p2 = parseFloat(mainParts[1] || '0');
    const p3 = parseFloat(mainParts[2] || '0');

    let alpha = 1;
    if (slashSplit[1]) {
      let a = parseFloat(slashSplit[1].trim());
      if (slashSplit[1].includes('%')) a = a / 100;
      alpha = Math.max(0, Math.min(1, a));
    }

    let r = 30, g = 41, b = 59;
    if (isOklch) {
      [r, g, b] = oklchToRgbMath(p1, p2, p3);
    } else if (isOklab) {
      [r, g, b] = oklabToRgbMath(p1, p2, p3);
    } else {
      // lab / lch generic approximation
      [r, g, b] = isLch ? oklchToRgbMath(p1 > 1 ? p1 / 100 : p1, p2 / 100, p3) : oklabToRgbMath(p1 > 1 ? p1 / 100 : p1, p2 / 100, p3 / 100);
    }

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return 'rgb(30, 41, 59)';
  }
}

export function sanitizeModernColors(input: string): string {
  if (!input || typeof input !== 'string') return input;
  if (!/(?:oklch|oklab|lab|lch)\(/i.test(input)) return input;

  return input.replace(/(?:oklch|oklab|lab|lch)\s*\([^)]+\)/gi, (match) => {
    try {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillStyle = match;
          const res = ctx.fillStyle;
          if (res && !/(?:oklch|oklab|lab|lch)/i.test(res)) {
            return res;
          }
        }
      }
    } catch {}
    return parseColorFunctionString(match);
  });
}

const sanitizeClonedDocument = (clonedDoc: Document) => {
  // 1. Sanitize all <style> blocks
  const styles = clonedDoc.querySelectorAll('style');
  styles.forEach((style) => {
    if (style.textContent && /(?:oklch|oklab|lab|lch)/i.test(style.textContent)) {
      style.textContent = sanitizeModernColors(style.textContent);
    }
    if (style.innerHTML && /(?:oklch|oklab|lab|lch)/i.test(style.innerHTML)) {
      style.innerHTML = sanitizeModernColors(style.innerHTML);
    }
  });

  // 2. Sanitize all element styles and computed colors
  const elements = clonedDoc.querySelectorAll('*');
  const colorProps = [
    'color',
    'background-color',
    'background',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'box-shadow',
    'fill',
    'stroke'
  ];

  elements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (!htmlEl.style) return;

    const styleAttr = htmlEl.getAttribute('style');
    if (styleAttr && /(?:oklch|oklab|lab|lch)/i.test(styleAttr)) {
      htmlEl.setAttribute('style', sanitizeModernColors(styleAttr));
    }

    try {
      const computed = window.getComputedStyle(htmlEl);
      for (const prop of colorProps) {
        const val = computed.getPropertyValue(prop);
        if (val && /(?:oklch|oklab|lab|lch)/i.test(val)) {
          const sanitized = sanitizeModernColors(val);
          htmlEl.style.setProperty(prop, sanitized, 'important');
        }
      }
    } catch {}
  });
};

async function waitForAllImages(container: HTMLElement) {
  if (!container) return;
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        if ('decode' in img) {
          img.decode().then(resolve).catch(() => resolve());
        }
      });
    })
  );
}

export async function generarPreoperacionalPDF(page1Element: HTMLElement, page2Element: HTMLElement, filename?: string) {
  try {
    // 1. Esperar a que todas las imágenes (incluyendo el logo) se decodifiquen y carguen
    await Promise.all([
      waitForAllImages(page1Element),
      page2Element ? waitForAllImages(page2Element) : Promise.resolve()
    ]);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const canvasOptions = {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc: Document) => {
        sanitizeClonedDocument(clonedDoc);
      }
    };

    // Render Page 1
    const canvas1 = await html2canvas(page1Element, canvasOptions);
    const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);

    // Render Page 2
    if (page2Element) {
      const canvas2 = await html2canvas(page2Element, canvasOptions);
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      pdf.addPage();
      pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);
    }

    const outName = filename || `Preoperacional_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(outName);
    return true;
  } catch (error) {
    console.error('Error generando PDF de preoperacional:', error);
    throw error;
  }
}
