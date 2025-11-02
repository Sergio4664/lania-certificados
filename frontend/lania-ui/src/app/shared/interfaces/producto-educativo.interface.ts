import { DocenteDTO } from "./docente.interfaces";
import { Inscripcion } from "./inscripcion.interface";

export interface ProductoEducativo {
  id: number;
  nombre: string;
  horas: number;
  fecha_inicio: string;
  fecha_fin: string;
  competencias: string | null; 
  tipo_producto?: string;
  modalidad?: string;
}

export type ProductoEducativoCreate = Omit<ProductoEducativo, 'id'> & {
  // --- ✅ CORRECCIÓN AQUÍ ---
  docentes_ids: number[]; // <--- Cambiado a plural
};

export type ProductoEducativoUpdate = Partial<ProductoEducativoCreate>;

export interface ProductoEducativoWithDetails extends ProductoEducativo {
  docentes: DocenteDTO[];
  inscripciones: Inscripcion[];
}