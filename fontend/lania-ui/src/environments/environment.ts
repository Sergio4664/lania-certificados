// frontend/lania-ui/src/environments/environment.ts
export const environment = {
  production: false,
  // Para desarrollo local, si utiliza un proxy o un backend remoto.
  // Si su backend está en localhost:8000, cambie esto a 'http://localhost:8000/api/v1'
  apiUrl: 'http://siscol.lania.mx/api/v1',
  
  // Se eliminan apiBase y frontendUrl para simplificar, confiando en apiUrl y proxy.
  // Si necesita un frontendUrl para algo específico, vuelva a agregarlo.
};