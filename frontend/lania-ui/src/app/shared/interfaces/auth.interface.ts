/**
 * Define las credenciales que el usuario envía desde el formulario de login.
 * 'username' contendrá el correo electrónico.
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Define el rol del usuario. Debe coincidir con el Enum del backend.
 */
export enum UserRole {
  ADMINISTRADOR = 'administrador',
}

/**
 * Define la estructura del objeto 'user' que se recibe del backend
 * al iniciar sesión y que se guarda en el localStorage.
 */
export interface CurrentUser {
  id: number;
  nombre_completo: string;
  email_institucional: string;
  rol: UserRole;
}

/**
 * Define la estructura completa de la respuesta del endpoint /token.
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: CurrentUser;
}
