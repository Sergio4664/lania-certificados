// src/app/features/public-verify/public-verify.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CertificateService } from '../certificates/certificate.service';

@Component({
  standalone: true,
  selector: 'app-public-verify',
  imports: [CommonModule],
  template: `
    <div class="verify-container">
      <div class="verify-card">
        <div class="header">
          <div class="logo">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="30" r="25" fill="url(#gradient)" stroke="#e74c3c" stroke-width="2"/>
              <text x="30" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">L</text>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1>LANIA</h1>
          <h2>Verificación de Certificado</h2>
        </div>

        <div class="content">
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Verificando certificado...</p>
          </div>

          <div *ngIf="!loading && cert" class="certificate-info">
            <div class="status-badge" [class]="getStatusClass(cert.status)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              Certificado Válido
            </div>

            <div class="cert-details">
              <div class="detail-item">
                <label>Serial:</label>
                <span class="serial">{{cert.serial}}</span>
              </div>
              
              <div class="detail-item">
                <label>Tipo:</label>
                <span class="type" [class]="'type-' + cert.kind.toLowerCase()">{{cert.kind}}</span>
              </div>
              
              <div class="detail-item">
                <label>Estado:</label>
                <span class="status" [class]="getStatusClass(cert.status)">{{formatStatus(cert.status)}}</span>
              </div>
              
              <div class="detail-item" *ngIf="cert.issued_at">
                <label>Fecha de emisión:</label>
                <span>{{cert.issued_at | date:'dd/MM/yyyy HH:mm'}}</span>
              </div>
            </div>

            <div class="actions" *ngIf="cert.status === 'LISTO_PARA_DESCARGAR'">
              <button (click)="download()" class="download-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7,10 12,15 17,10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Descargar Certificado
              </button>
            </div>
          </div>

          <div *ngIf="!loading && !cert && !error" class="not-found">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <h3>Certificado no encontrado</h3>
            <p>El certificado que busca no existe o no está disponible públicamente.</p>
          </div>

          <div *ngIf="error" class="error-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h3>Error de verificación</h3>
            <p>{{error}}</p>
            <button (click)="retry()" class="retry-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23,4 23,10 17,10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              Reintentar
            </button>
          </div>
        </div>

        <div class="footer">
          <p>© 2025 LANIA - Laboratorio Nacional de Informática Avanzada</p>
          <p>Sistema de Verificación de Certificados</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verify-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .verify-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 500px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 30px;
    }

    .logo {
      margin-bottom: 15px;
    }

    .header h1 {
      color: #e74c3c;
      margin: 15px 0 10px 0;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .header h2 {
      color: #333;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .content {
      margin: 30px 0;
    }

    .loading-state {
      text-align: center;
      padding: 40px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(102, 126, 234, 0.3);
      border-radius: 50%;
      border-top-color: #667eea;
      animation: spin 1s ease-in-out infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      color: #666;
      font-size: 16px;
    }

    .certificate-info {
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #dcfce7;
      color: #16a34a;
      padding: 16px 20px;
      border-radius: 12px;
      font-weight: 600;
      margin-bottom: 30px;
      border: 1px solid #bbf7d0;
    }

    .cert-details {
      margin: 30px 0;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .detail-item:last-child {
      border-bottom: none;
    }

    .detail-item label {
      font-weight: 600;
      color: #374151;
    }

    .serial {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      color: #1e293b;
    }

    .type {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .type-aprobacion { background: #dcfce7; color: #16a34a; }
    .type-asistencia { background: #dbeafe; color: #2563eb; }
    .type-participacion { background: #fef3c7; color: #d97706; }
    .type-diplomado { background: #f3e8ff; color: #9333ea; }
    .type-taller { background: #fce7f3; color: #ec4899; }

    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status.listo-para-descargar {
      background: #dcfce7;
      color: #16a34a;
    }

    .status.en-proceso {
      background: #fef3c7;
      color: #d97706;
    }

    .status.revocado {
      background: #fecaca;
      color: #dc2626;
    }

    .actions {
      margin-top: 30px;
      text-align: center;
    }

    .download-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 16px;
    }

    .download-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .not-found,
    .error-state {
      text-align: center;
      padding: 40px 20px;
    }

    .not-found svg,
    .error-state svg {
      color: #9ca3af;
      margin-bottom: 20px;
    }

    .not-found h3,
    .error-state h3 {
      color: #374151;
      margin-bottom: 12px;
      font-size: 20px;
    }

    .not-found p,
    .error-state p {
      color: #6b7280;
      line-height: 1.6;
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 16px;
    }

    .retry-btn:hover {
      background: #e2e8f0;
      transform: translateY(-1px);
    }

    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 30px;
      border-top: 1px solid #e2e8f0;
      color: #6b7280;
      font-size: 14px;
    }

    .footer p {
      margin: 4px 0;
    }

    @media (max-width: 480px) {
      .verify-card {
        padding: 30px 25px;
        margin: 10px;
      }
      
      .header h1 {
        font-size: 28px;
      }
      
      .header h2 {
        font-size: 20px;
      }

      .detail-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `]
})
export default class PublicVerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private certificateService = inject(CertificateService);
  
  cert: any = null;
  loading = true;
  error = '';

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.verifyCertificate(token);
    } else {
      this.error = 'Token de verificación no válido';
      this.loading = false;
    }
  }

  verifyCertificate(token: string) {
    this.loading = true;
    this.error = '';
    
    this.certificateService.verifyByToken(token).subscribe({
      next: (certificate) => {
        this.cert = certificate;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error verifying certificate:', err);
        if (err.status === 404) {
          this.error = 'Certificado no encontrado o no disponible';
        } else if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor. Verifique su conexión.';
        } else {
          this.error = 'Error del servidor. Inténtelo de nuevo más tarde.';
        }
        this.cert = null;
        this.loading = false;
      }
    });
  }

  download() {
    if (this.cert && this.cert.serial) {
      this.certificateService.downloadBySerial(this.cert.serial);
    }
  }

  retry() {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.verifyCertificate(token);
    }
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}