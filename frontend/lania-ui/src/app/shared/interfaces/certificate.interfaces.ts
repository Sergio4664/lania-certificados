export interface CertificateDTO {
  id: number;
  serial: string;
  kind: 'PILDORA_PARTICIPANTE' | 'PILDORA_PONENTE' | 'INYECCION_PARTICIPANTE' | 'INYECCION_PONENTE' | 'CURSO_PARTICIPANTE' | 'CURSO_PONENTE';
  status: 'EN_PROCESO' | 'LISTO_PARA_DESCARGAR' | 'REVOCADO' | 'FALTA_TAREAS' | 'NO_CONCLUYO';
  course_name: string;
  participant_name: string;
  issued_at?: string;
  qr_token: string;
  pdf_path?: string;
}

export interface CreateCertificateDTO {
  course_id: number | string;
  participant_id: number | string;
  kind: 'PILDORA_PARTICIPANTE' | 'PILDORA_PONENTE' | 'INYECCION_PARTICIPANTE' | 'INYECCION_PONENTE' | 'CURSO_PARTICIPANTE' | 'CURSO_PONENTE';
}