export interface CertificateDTO {
  id: number;
  serial: string;
  kind: 'PARTICIPANTE' | 'PONENTE';
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
  kind: 'PARTICIPANTE' | 'PONENTE';
}
