
export interface Administrador {
  id: number;
  nombre_completo: string;
  email_institucional: string;
  telefono?: string;       // El '?' indica que el campo es opcional
  whatsapp?: string;       // El '?' indica que el campo es opcional
  activo: boolean;
  fecha_creacion: string; // Las fechas se reciben como strings en formato ISO
}

/**
 * Define la estructura para crear un nuevo Administrador.
 * Corresponde al schema 'AdministradorCreate' en el backend.
 */
export interface AdministradorCreate {
  nombre_completo: string;
  email_institucional: string;
  password: string;
  telefono?: string;
  whatsapp?: string;
  activo?: boolean;
}

/**
 * Define la estructura para actualizar un Administrador. Todos los campos son opcionales.
 * Corresponde al schema 'AdministradorUpdate' en el backend.
 */
export type AdministradorUpdate = Partial<AdministradorCreate>;
// 'Partial<T>' es un atajo de TypeScript que hace que todas las propiedades de 'T' sean opcionales.
