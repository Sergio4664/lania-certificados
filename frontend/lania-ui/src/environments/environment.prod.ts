// Ruta: frontend/lania-ui/src/environments/environment.prod.ts
export const environment = {
  // Siempre true para producción
  production: true, 
  
  // ✅ CORRECCIÓN SINTÁCTICA: URL pública limpia y correcta
  apiUrl: 'http://siscol.lania.mx/api/v1', 

  // URL base para la verificación pública y QR codes
  baseUrl: 'http://siscol.lania.mx/' 
};