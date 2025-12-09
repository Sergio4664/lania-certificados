// Esta es la interfaz que usa el servicio de verificación
export interface CertificadoPublico {
  folio: string;
  fecha_emision: string; // O Date, dependiendo de cómo lo maneje tu API
  participante_nombre: string;
  producto_educativo_nombre: string;
  tipo_producto: string; // Ej. "Curso", "Diplomado"
  con_competencias: boolean; // <--- ¡CORRECCIÓN APLICADA AQUÍ!
}

// --- El resto de interfaces para la sección de administración ---

export interface Certificado {
  id: number;
  folio: string;
  fecha_emision: string;
  id_inscripcion: number;
  id_producto_educativo: number;
  id_participante: number;
  url_pdf: string;
  url_xml: string | null;
  enviado_por_email: boolean;
  estatus: boolean;
  // Propiedades anidadas que vienen del JOIN
  producto_educativo?: {
    nombre: string;
  };
  participante?: {
    nombre_completo: string;
    email: string;
  };
}

// Para la paginación de certificados
export interface PaginatedCertificados {
  certificados: Certificado[];
  total: number;
  page: number;
  limit: number;
}