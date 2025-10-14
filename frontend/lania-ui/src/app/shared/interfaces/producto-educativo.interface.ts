import { DocenteDTO } from "./docente.interfaces";
import { Inscripcion } from "./inscripcion.interface";

export interface ProductoEducativo {
  id: number;
  nombre: string;
  horas: number;
  fecha_inicio: string; // O Date, si lo conviertes
  fecha_fin: string;    // O Date, si lo conviertes
  competencias: string;
  docentes: DocenteDTO[];
  inscripciones: Inscripcion[];

  // --- PROPIEDADES AÑADIDAS ---
  tipo_producto?: string;
  modalidad?: string;
}

export type ProductoEducativoCreate = Omit<ProductoEducativo, 'id' | 'docentes' | 'inscripciones'> & {
  docente_ids: number[];
};

export type ProductoEducativoUpdate = Partial<ProductoEducativoCreate>;
