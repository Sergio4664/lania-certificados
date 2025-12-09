import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http'; // Para manejo de errores

// Importamos todos los servicios e interfaces necesarios
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { ParticipanteService } from '@shared/services/participante.service';
import { CertificadoService } from '@shared/services/certificado.service';
import { DocenteService } from '@shared/services/docente.service';
// ✅ ERROR CORREGIDO: Importar la clase AdministradorService correctamente
import { AdministradorService } from '@shared/services/administrador.service'; 

import { ProductoEducativo } from '@shared/interfaces/producto-educativo.interface';
import { Participante } from '@shared/interfaces/participante.interface';
import { Certificado } from '@shared/interfaces/certificado.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Administrador } from '@shared/interfaces/administrador.interface';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.css']
})
export default class AdminOverviewComponent implements OnInit {
  // Inyección de todos los servicios necesarios
  private productoEducativoService = inject(ProductoEducativoService);
  private participanteService = inject(ParticipanteService);
  private certificadoService = inject(CertificadoService);
  private docenteService = inject(DocenteService);
  private administradorService = inject(AdministradorService); // ✅ Inyección tipada
  private router = inject(Router);

  // Propiedades para almacenar los datos
  productos: ProductoEducativo[] = [];
  participantes: Participante[] = [];
  certificados: Certificado[] = [];
  docentes: DocenteDTO[] = [];
  administradores: Administrador[] = [];
  
  isLoading = true;
  errorMessage = '';

  ngOnInit() {
    console.log('📊 Inicializando Panel de Control...');
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📡 Cargando datos del dashboard...');

    // Usamos forkJoin para ejecutar todas las peticiones en paralelo
    forkJoin({
      productos: this.productoEducativoService.getAll(),
      participantes: this.participanteService.getAll(),
      certificados: this.certificadoService.getAll(),
      docentes: this.docenteService.getAll(),
      administradores: this.administradorService.getAll()
    }).subscribe({
      // Tipado de 'data'
      next: (data: { 
        productos: ProductoEducativo[], 
        participantes: Participante[], 
        certificados: Certificado[], 
        docentes: DocenteDTO[], 
        administradores: Administrador[] 
      }) => {
        console.log('✅ Datos cargados exitosamente:', {
          productos: data.productos.length,
          participantes: data.participantes.length,
          certificados: data.certificados.length,
          docentes: data.docentes.length,
          administradores: data.administradores.length
        });

        // Asignamos los resultados a nuestras propiedades
        this.productos = data.productos;
        this.participantes = data.participantes;
        this.certificados = data.certificados;
        this.docentes = data.docentes;
        this.administradores = data.administradores;
        
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar los datos del dashboard:', err);
        
        if (err.status === 401) {
          this.errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (err.status === 404) {
          // El error 404 indica que al menos una ruta falló.
          this.errorMessage = 'Algunas secciones no fueron encontradas en el servidor (404). Contacta al administrador.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else {
          this.errorMessage = `Error al cargar los datos: ${err.message}`;
        }
        
        this.isLoading = false;
      }
    });
  }

  /**
   * Método para reintentar la carga de datos
   */
  retryLoad(): void {
    console.log('🔄 Reintentando carga de datos...');
    this.loadAllData();
  }
}