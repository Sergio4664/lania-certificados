export const environment = {
  // Siempre true para producción
  production: true, 
  
  // 🚨 Usar el dominio final con el protocolo HTTPS (dado el puerto 8443)
  // Añadimos el prefijo /api/v1 (estándar de FastAPI)
  apiUrl: 'https://siscol.lania.mx:8443/api/v1', 

  // URL base para la verificación pública y QR codes (opcional si es necesario)
  baseUrl: 'https://siscol.lania.mx:8443/' 
};