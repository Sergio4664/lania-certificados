// frontend/lania-ui/src/environments/environment.ts
export const environment = {
  production: false,
  // 🚨 CORRECCIÓN: Apunta al puerto activo del backend (4201)
  apiUrl: 'http://127.0.0.1:4201/api/v1',
  // 🚨 CORRECCIÓN: Puerto 4201
  apiBase: 'http://127.0.0.1:4201',
  // 🚨 CORRECCIÓN: Puerto 4200 (si lo usas para desarrollo local de Angular)
  frontendUrl: 'http://localhost:4200' 
};