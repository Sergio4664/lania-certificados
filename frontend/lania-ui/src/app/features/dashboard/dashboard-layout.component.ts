import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="logo-section">
            <div>
              <h1>LANIA - CONSTANCIAS</h1>
              <p>Sistema de Gestión de Constancias</p>
            </div>
          </div>
          <div class="user-section">
            <span>Bienvenido, Admin</span>
            <button (click)="logout()" class="logout-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      <main class="dashboard-main">
        <nav class="sidebar">
          <a *ngFor="let item of menuItems" class="nav-item" [routerLink]="item.routerLink" routerLinkActive="active">
            <div [innerHTML]="item.svgIcon"></div>
            {{ item.label }}
          </a>
        </nav>
        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
    :host {
      --primary-color: #667eea;
      --secondary-color: #764ba2;
      --danger-color: #ef4444;
      --light-gray: #f8fafc;
      --medium-gray: #e2e8f0;
      --dark-gray: #64748b;
      --text-dark: #1e293b;
    }
    .dashboard-container { min-height: 100vh; background: var(--light-gray); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .dashboard-header { background: white; border-bottom: 1px solid var(--medium-gray); box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); }
    .header-content { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; max-width: 1400px; margin: 0 auto; }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-section h1 { color: #e74c3c; margin: 0; font-size: 24px; font-weight: bold; }
    .logo-section p { color: var(--dark-gray); margin: 0; font-size: 14px; }
    .user-section { display: flex; align-items: center; gap: 16px; color: #475569; font-weight: 500; }
    .logout-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--danger-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
    .logout-btn:hover { background: #dc2626; }
    .dashboard-main { display: flex; max-width: 1400px; margin: 0 auto; min-height: calc(100vh - 80px); }
    .sidebar { width: 240px; background: white; border-right: 1px solid var(--medium-gray); padding: 24px 0; }
    .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 24px; cursor: pointer; color: var(--dark-gray); font-weight: 500; transition: all 0.2s; border-left: 3px solid transparent; text-decoration: none; }
    .nav-item div { line-height: 0; } /* Para alinear correctamente el SVG */
    .nav-item:hover { background: #f1f5f9; color: #334155; }
    .nav-item.active { background: #eff6ff; color: #2563eb; border-left-color: #2563eb; }
    .nav-item svg { stroke: currentColor; fill: none; stroke-width: 2; width: 20px; height: 20px; }
    .content-area { flex: 1; padding: 24px; }
    `
  ]
})
export default class DashboardLayoutComponent {
  private router = inject(Router);

  // Arreglo único y limpio para definir el menú de navegación
  menuItems = [
    { 
      label: 'Dashboard', 
      routerLink: '/admin/dashboard', 
      svgIcon: `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>` 
    },
    { 
      label: 'Docentes', 
      routerLink: '/admin/docentes', 
      svgIcon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"></circle><path d="M5.5 21a7.5 7.5 0 0 1 13 0"></path></svg>` 
    },
    { 
      label: 'Productos Educativos', 
      routerLink: '/admin/courses', 
      svgIcon: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>` 
    },
    { 
      label: 'Participantes', 
      routerLink: '/admin/participants', 
      svgIcon: `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>` 
    },
    { 
      label: 'Constancias', 
      routerLink: '/admin/certificates', 
      svgIcon: `<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>` 
    },
    { 
      label: 'Admins', 
      routerLink: '/admin/usuarios', 
      svgIcon: `<svg viewBox="0 0 24 24"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"></path><path d="M12 12.75c1.63 0 3-1.37 3-3.25S13.63 6.25 12 6.25s-3 1.12-3 3.25 1.37 3.25 3 3.25z"></path></svg>`
    }
  ];

  logout() {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }
}