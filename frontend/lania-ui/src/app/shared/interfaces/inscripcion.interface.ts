import { Participante } from '@shared/interfaces/participante.interface';
import { ProductoEducativo } from './producto-educativo.interface';

/**
 * Define la estructura para crear una nueva inscripción.
 * Solo se necesitan los IDs del participante y del producto.
 */
export interface InscripcionCreate {
  participante_id: number;
  producto_educativo_id: number;
}

/**
 * Define la estructura completa de una inscripción que se recibe desde el backend.
 * Incluye los objetos anidados de participante y producto educativo para mostrar
 * información detallada en las tablas y formularios.
 */
export interface Inscripcion extends InscripcionCreate {
  id: number;
  fecha_inscripcion: string; // Las fechas desde la API llegan como strings en formato ISO
  participante: Participante;
  producto_educativo: ProductoEducativo;
}

