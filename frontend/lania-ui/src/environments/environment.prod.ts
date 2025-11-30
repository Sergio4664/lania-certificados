//Ruta: frontend/lania-ui/src/environments/environment.prod.ts
export const environment = {
  // Siempre true para producción
  production: true, 
  
  // Añadimos el prefijo /api/v1 (estándar de FastAPI)
  apiUrl: 'https://siscol.lania.mx:/api/v1', 

  // URL base para la verificación pública y QR codes
  baseUrl: 'https://siscol.lania.mx:/' 
};