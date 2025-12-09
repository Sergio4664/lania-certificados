// Ruta: frontend/lania-ui/src/app/shared/services/certificado.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // ✅ Importar HttpParams
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Certificado, CertificadoCreate, EmisionMasivaResponse } from '../interfaces/certificado.interface';

@Injectable({
    providedIn: 'root'
})
export class CertificadoService {
    private http = inject(HttpClient);
    // La URL base para todas las operaciones de certificados.
    private apiUrl = `${environment.apiUrl}/admin/certificados`;

    /**
     * Obtiene todos los certificados del sistema.
     * (Usado por el modal de 'Productos Educativos' para refrescar su lista).
     */
    getAll(): Observable<Certificado[]> {
        // ✅ CORRECCIÓN: Añadir parámetros "cache-busting" para evitar caché del navegador
        const params = { v: new Date().getTime().toString() };
        return this.http.get<Certificado[]>(`${this.apiUrl}/`, { params });
    }

    // --- MÉTODOS AÑADIDOS PARA EL DASHBOARD ---
    
    /**
     * Obtiene la lista de certificados específicos de Participantes, con paginación.
     * @param skip El offset (cuántos registros saltar, por defecto 0).
     * @param limit El número máximo de registros a obtener (por defecto 15).
     */
    getCertificadosParticipantes(skip: number = 0, limit: number = 15): Observable<Certificado[]> {
        let params = new HttpParams().set('v', new Date().getTime().toString());
        
        // ✅ Establecer skip y limit para la paginación
        params = params.set('skip', skip.toString()); 
        params = params.set('limit', limit.toString()); 
        
        return this.http.get<Certificado[]>(`${this.apiUrl}/participantes`, { params });
    }

    /**
     * Obtiene la lista de certificados específicos de Docentes, con paginación.
     * @param skip El offset (cuántos registros saltar, por defecto 0).
     * @param limit El número máximo de registros a obtener (por defecto 15).
     */
    getCertificadosDocentes(skip: number = 0, limit: number = 15): Observable<Certificado[]> {
        let params = new HttpParams().set('v', new Date().getTime().toString());
        
        // ✅ Establecer skip y limit para la paginación
        params = params.set('skip', skip.toString()); 
        params = params.set('limit', limit.toString()); 
        
        return this.http.get<Certificado[]>(`${this.apiUrl}/docentes`, { params });
    }

    // --- MÉTODO NUEVO PARA EL BOTÓN "👁️" ---
    /**
     * Obtiene el archivo PDF de un certificado (participante O docente) como un Blob.
     * Llama al endpoint unificado /download/{folio}
     */
    getCertificadoBlob(folio: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/download/${folio}`, { responseType: 'blob' });
    }
    
    // --- (Métodos downloadCertificado y downloadCertificadoDocente eliminados) ---

    // --- MÉTODOS ORIGINALES DE GESTIÓN ---

    /**
     * Crea un nuevo certificado para un participante.
     * @param data - El payload que incluye el 'inscripcion_id' y 'con_competencias'.
     */
    createForParticipant(data: CertificadoCreate): Observable<Certificado> {
        return this.http.post<Certificado>(`${this.apiUrl}/participante`, data);
    }

    /**
     * Crea un nuevo certificado para un docente (ponente).
     * @param data - El payload que incluye el 'docente_id' y 'producto_educativo_id'.
     */
    createForDocente(data: CertificadoCreate): Observable<Certificado> {
        return this.http.post<Certificado>(`${this.apiUrl}/docente`, data);
    }

    /**
     * Elimina un certificado por su ID.
     * @param id - El ID del certificado a eliminar.
     */
    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Reenvía un certificado por email.
     * @param certificadoId - El ID del certificado a enviar.
     * @param emailType - (Ignorado por el backend, pero requerido por 'admin-productos-educativos')
     */
    sendEmail(certificadoId: number, emailType: 'institucional' | 'personal'): Observable<any> {
        // El backend determina el email correcto (personal para participante, inst. para docente)
        return this.http.post(`${this.apiUrl}/${certificadoId}/enviar`, { email_type: emailType });
    }

    /**
     * Inicia el proceso de emisión y envío masivo para todos los participantes de un producto educativo.
     * @param productoId - El ID del producto educativo.
     */
    emitirYEnviarMasivamente(productoId: number): Observable<EmisionMasivaResponse> {
    const url = `${this.apiUrl}/emitir-masivo/${productoId}`;
    return this.http.post<EmisionMasivaResponse>(url, {});
}

}