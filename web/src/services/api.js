import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutos para archivos grandes
});

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post('/entregas/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutos para archivos grandes
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('El archivo es demasiado grande o tardó mucho en procesarse. Intenta con un archivo más pequeño.');
    }
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    throw new Error('Error al subir el archivo. Verifica que sea un archivo Excel válido.');
  }
};

export const getEnvases = async () => {
  const response = await api.get('/entregas/envases');
  return response.data;
};

export const getPreciosEnvases = async () => {
  const response = await api.get('/precios-envases');
  return response.data;
};

export const createPrecioEnvase = async (precio) => {
  const response = await api.post('/precios-envases', precio);
  return response.data;
};

export const updatePrecioEnvase = async (id, precio) => {
  const response = await api.put(`/precios-envases/${id}`, precio);
  return response.data;
};

export const generarLiquidacion = async (preciosEnvases) => {
  const response = await api.post('/liquidaciones/generar', {
    precios_envases: preciosEnvases
  }, {
    responseType: 'blob',
  });
  
  return response.data;
};

export const getLiquidacionTrabajador = async (nombreTrabajador) => {
  const response = await api.get(`/liquidaciones/${encodeURIComponent(nombreTrabajador)}`);
  return response.data;
};
