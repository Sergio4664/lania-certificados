import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private snackBar = inject(MatSnackBar);

  /**
   * Muestra una notificación de error (roja).
   */
  showError(message: string, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      duration: 5000,
      panelClass: ['snackbar-error'],
      verticalPosition: 'top'
    });
  }

  /**
   * Muestra una notificación de éxito (verde).
   */
  showSuccess(message: string, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      duration: 3000,
      panelClass: ['snackbar-success'],
      verticalPosition: 'top'
    });
  }

  /**
   * Muestra una notificación de información (azul).
   */
  showInfo(message: string, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      duration: 4000, // Duración intermedia
      panelClass: ['snackbar-info'], // Clase CSS para el estilo
      verticalPosition: 'top'
    });
  }
}