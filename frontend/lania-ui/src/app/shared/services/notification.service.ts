import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private snackBar = inject(MatSnackBar);

  /**
   * Muestra una notificación de error (roja).
   * @param message El mensaje a mostrar.
   * @param action El texto del botón de acción (ej. 'Cerrar').
   */
  showError(message: string, action: string = 'Cerrar'): void {
    this.snackBar.open(message, action, {
      duration: 5000, // 5 segundos
      panelClass: ['snackbar-error'],
      verticalPosition: 'top'
    });
  }

  /**
   * Muestra una notificación de éxito (verde).
   * @param message El mensaje a mostrar.
   * @param action El texto del botón de acción (opcional).
   */
  showSuccess(message: string, action: string = 'Cerrar'): void { // <-- CORREGIDO: El segundo argumento ahora es opcional.
    this.snackBar.open(message, action, {
      duration: 3000, // 3 segundos
      panelClass: ['snackbar-success'],
      verticalPosition: 'top'
    });
  }
}
