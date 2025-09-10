import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const API_V1_URL = `${API_BASE_URL}/api/v1`;
const API_V2_URL = `${API_BASE_URL}/api/v2`;

const api = axios.create({
  baseURL: API_V1_URL,
  timeout: 300000, // 5 minutos para archivos grandes
});

const apiV2 = axios.create({
  baseURL: API_V2_URL,
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

apiV2.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API V2 Error:', error);
    return Promise.reject(error);
  }
);

// Función para detectar si la API optimizada está disponible
const checkOptimizedAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data.performance !== undefined;
  } catch (error) {
    return false;
  }
};

export const uploadExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Detectar si la API optimizada está disponible
  const isOptimizedAvailable = await checkOptimizedAPI();
  
  try {
    let response;
    if (isOptimizedAvailable) {
      // Usar API optimizada
      console.log('Usando API optimizada para subida de archivo');
      response = await apiV2.post('/entregas/upload-optimized', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos para archivos grandes
      });
    } else {
      // Usar API tradicional
      console.log('Usando API tradicional para subida de archivo');
      response = await api.post('/entregas/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutos para archivos grandes
      });
    }
    
    return {
      ...response.data,
      optimized: isOptimizedAvailable
    };
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
  // Detectar si la API optimizada está disponible
  const isOptimizedAvailable = await checkOptimizedAPI();
  
  try {
    let response;
    if (isOptimizedAvailable) {
      // Usar API optimizada
      console.log('Usando API optimizada para obtener envases');
      response = await apiV2.get('/entregas/envases');
    } else {
      // Usar API tradicional
      console.log('Usando API tradicional para obtener envases');
      response = await api.get('/entregas/envases');
    }
    
    return {
      ...response.data,
      optimized: isOptimizedAvailable
    };
  } catch (error) {
    console.error('Error getting envases:', error);
    throw error;
  }
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
