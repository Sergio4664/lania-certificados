// dashboard-layout.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@app/core/auth.service';
import { CurrentUser } from '@app/shared/interfaces/auth.interface';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MenuItem {
  label: string;
  routerLink: string;
  svgIcon: SafeHtml;
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export default class DashboardLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  currentUser: CurrentUser | null = null;
  menuItems: MenuItem[] = [];
  
  // Propiedad para controlar el estado del menú
  isSidebarOpen = false;

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.buildMenu();
  }

  // Método para toggle del menú
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Método para cerrar el menú al hacer clic en un enlace
  closeSidebar() {
    this.isSidebarOpen = false;
  }

  private buildMenu() {
    this.menuItems = [
      { 
        label: 'Panel de Control', 
        routerLink: '/admin/dashboard',  // ✅ CORREGIDO: era '/admin/overview'
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>`) 
      },
      { 
        label: 'Productos Educativos', 
        routerLink: '/admin/productos-educativos', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`) 
      },
      { 
        label: 'Constancias', 
        routerLink: '/admin/certificados', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>`) 
      },
      { 
        label: 'Docentes', 
        routerLink: '/admin/docentes', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path d="M5.5 21a7.5 7.5 0 0 1 13 0"></path></svg>`) 
      },
      { 
        label: 'Participantes', 
        routerLink: '/admin/participantes', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`) 
      },
      { 
        label: 'Administradores', 
        routerLink: '/admin/administradores', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"></path></svg>`)
      },
      {
        label: 'Verificación',
        routerLink: '/verificacion', 
        svgIcon: this.sanitizer.bypassSecurityTrustHtml(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`)
      }
    ];
  }

  logout() {
    this.authService.logout();
  }
}