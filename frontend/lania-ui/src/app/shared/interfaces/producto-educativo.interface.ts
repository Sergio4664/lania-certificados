import { DocenteDTO } from "./docente.interfaces";
import { Inscripcion } from "./inscripcion.interface";
// 💡 --- IMPORTACIÓN AÑADIDA ---
import { Certificado } from "./certificado.interface";

export interface ProductoEducativo {
  id: number;
  nombre: string;
  horas: number;
  fecha_inicio: string; // O Date, si lo conviertes
  fecha_fin: string;    // O Date, si lo conviertes
  competencias: string;

  // --- PROPIEDADES AÑADIDAS ---
  tipo_producto?: string;
  modalidad?: string;
  
  // --- 💡 CORRECCIÓN: Añadir las relaciones ---
  docentes: DocenteDTO[];
  inscripciones: Inscripcion[];
}

export type ProductoEducativoCreate = Omit<ProductoEducativo, 'id' | 'docentes' | 'inscripciones'> & {
  docente_ids: number[];
};

export type ProductoEducativoUpdate = Partial<ProductoEducativoCreate>;

// 💡 --- INTERFAZ AÑADIDA (Aunque no se use 'getAllWithDetails', la dejamos por si 'admin-productos' la necesita) ---
export interface ProductoEducativoWithDetails extends ProductoEducativo {
  // Hereda todo de ProductoEducativo
}
