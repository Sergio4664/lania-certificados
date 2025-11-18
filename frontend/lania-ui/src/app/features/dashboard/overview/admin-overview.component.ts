import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // ✅ Importar Router
import { forkJoin } from 'rxjs';

// Importamos todos los servicios e interfaces necesarios
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { ParticipanteService } from '@shared/services/participante.service';
import { CertificadoService } from '@shared/services/certificado.service';
import { DocenteService } from '@shared/services/docente.service';
import { AdministradorService } from '@shared/services/administrador.service';

import { ProductoEducativo } from '@shared/interfaces/producto-educativo.interface';
import { Participante } from '@shared/interfaces/participante.interface';
import { Certificado } from '@shared/interfaces/certificado.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Administrador } from '@shared/interfaces/administrador.interface';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrls: ['./admin-overview.component.css']
})
export default class AdminOverviewComponent implements OnInit {
  // Inyección de todos los servicios necesarios
  private productoEducativoService = inject(ProductoEducativoService);
  private participanteService = inject(ParticipanteService);
  private certificadoService = inject(CertificadoService);
  private docenteService = inject(DocenteService);
  private administradorService = inject(AdministradorService);
  private router = inject(Router); // ✅ Inyectar Router

  // Propiedades para almacenar los datos, con nombres en español
  productos: ProductoEducativo[] = [];
  participantes: Participante[] = [];
  certificados: Certificado[] = [];
  docentes: DocenteDTO[] = [];
  administradores: Administrador[] = [];
  
  isLoading = true;

  ngOnInit() {
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading = true;

    // Usamos forkJoin para ejecutar todas las peticiones en paralelo
    forkJoin({
      productos: this.productoEducativoService.getAll(),
      participantes: this.participanteService.getAll(),
      certificados: this.certificadoService.getAll(),
      docentes: this.docenteService.getAll(),
      administradores: this.administradorService.getAll()
    }).subscribe({
      next: (data) => {
        // Asignamos los resultados a nuestras propiedades
        this.productos = data.productos;
        this.participantes = data.participantes;
        this.certificados = data.certificados;
        this.docentes = data.docentes;
        this.administradores = data.administradores;
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar los datos del dashboard:', err);
        // Aquí podrías usar un servicio de notificaciones para mostrar un error
        this.isLoading = false;
      }
    });
  }

  // ✅ NUEVOS MÉTODOS DE NAVEGACIÓN
  
  /**
   * Navega al dashboard de Productos Educativos
   */
  navigateToProductos(): void {
    this.router.navigate(['/dashboard/productos-educativos']);
  }

  /**
   * Navega al dashboard de Participantes
   */
  navigateToParticipantes(): void {
    this.router.navigate(['/dashboard/participantes']);
  }

  /**
   * Navega al dashboard de Docentes
   */
  navigateToDocentes(): void {
    this.router.navigate(['/dashboard/docentes']);
  }

  /**
   * Navega al dashboard de Certificados
   */
  navigateToCertificados(): void {
    this.router.navigate(['/dashboard/certificados']);
  }

  /**
   * Navega al dashboard de Administradores
   */
  navigateToAdministradores(): void {
    this.router.navigate(['/dashboard/administradores']);
  }
}