// Importamos la interfaz de Docente porque un producto educativo tiene docentes asociados.
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';

/**
 * Representa la estructura completa de un producto educativo,
 * tal como se recibe desde el backend.
 */
export interface ProductoEducativo {
  id: number;
  nombre: string;
  horas: number;
  fecha_inicio: string; // Las fechas se manejan como strings en formato YYYY-MM-DD
  fecha_fin: string;
  docentes: DocenteDTO[];
}

/**
 * Representa la estructura de datos necesaria para crear
 * un nuevo producto educativo.
 */
export interface ProductoEducativoCreate {
  nombre: string;
  horas: number;
  fecha_inicio: string;
  fecha_fin: string;
  docentes_ids: number[];
}

/**
 * Representa la estructura de datos para actualizar un producto educativo.
 * Todos los campos son opcionales para permitir actualizaciones parciales.
 */
export interface ProductoEducativoUpdate {
  nombre?: string;
  horas?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  docentes_ids?: number[];
}