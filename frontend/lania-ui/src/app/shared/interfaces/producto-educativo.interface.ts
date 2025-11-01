// Ruta: frontend/lania-ui/src/app/shared/interfaces/producto-educativo.interface.ts
import { DocenteDTO } from "./docente.interfaces";
import { Inscripcion } from "./inscripcion.interface";
// El import de 'Certificado' no se usa en este archivo.

/**
* INTERFAZ BASE: Representa el producto simple, tal como viene de '.../productos-educativos/'
* NO incluye las relaciones pesadas.
*/
export interface ProductoEducativo {
  id: number;
  nombre: string;
  horas: number;
  fecha_inicio: string;
  fecha_fin: string;
  competencias: string | null; // Es mejor permitir 'null' si puede venir vacío
  tipo_producto?: string;
  modalidad?: string;
  
  // --- ❌ ESTAS PROPIEDADES NO VAN AQUÍ ---
  // docentes: DocenteDTO[];
  // inscripciones: Inscripcion[];
}

export type ProductoEducativoCreate = Omit<ProductoEducativo, 'id'> & {
  docente_ids: number[];
};

export type ProductoEducativoUpdate = Partial<ProductoEducativoCreate>;

/**
* INTERFAZ DETALLADA: Hereda la base y AÑADE las relaciones.
* Esta es la que usa el endpoint '.../with-details'.
*/
export interface ProductoEducativoWithDetails extends ProductoEducativo {
  // --- ✅ ESTAS PROPIEDADES SÍ VAN AQUÍ ---
  docentes: DocenteDTO[];
  inscripciones: Inscripcion[];
}