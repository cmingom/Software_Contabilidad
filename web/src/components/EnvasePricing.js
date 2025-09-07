import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, DollarSign } from 'lucide-react';
import { getPreciosEnvases, createPrecioEnvase, updatePrecioEnvase } from '../services/api';

const EnvasePricing = ({ envases, onPreciosSet, onBack }) => {
  const [precios, setPrecios] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExistingPrecios();
  }, []);

  const loadExistingPrecios = async () => {
    try {
      const response = await getPreciosEnvases();
      const preciosMap = {};
      response.precios.forEach(precio => {
        preciosMap[precio.envase] = precio.precio;
      });
      setPrecios(preciosMap);
    } catch (err) {
      console.error('Error cargando precios existentes:', err);
    }
  };

  const handlePrecioChange = (envase, value) => {
    setPrecios(prev => ({
      ...prev,
      [envase]: parseFloat(value) || 0
    }));
  };

  const handleSavePrecios = async () => {
    setLoading(true);
    setError(null);

    try {
      // Guardar/actualizar precios en el backend
      for (const [envase, precio] of Object.entries(precios)) {
        if (precio > 0) {
          try {
            // Intentar actualizar primero
            await updatePrecioEnvase(envase, { envase, precio });
          } catch (err) {
            // Si no existe, crear nuevo
            await createPrecioEnvase({ envase, precio });
          }
        }
      }

      onPreciosSet(precios);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar precios');
    } finally {
      setLoading(false);
    }
  };

  const totalEnvases = envases.length;
  const envasesConPrecio = Object.values(precios).filter(precio => precio > 0).length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Volver
        </button>
        
        <h2 className="text-2xl font-bold text-gray-900">
          Configurar Precios de Envases
        </h2>
        
        <div className="w-20"></div> {/* Spacer para centrar el título */}
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
          <p className="text-blue-800">
            Configura el precio por unidad para cada tipo de envase encontrado en el archivo.
            Estos precios se utilizarán para calcular las liquidaciones de los trabajadores.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {envases.map((envase) => (
          <div key={envase.envase} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{envase.envase}</h3>
              <span className="text-sm text-gray-500">
                {envase.count} unidades
              </span>
            </div>
            
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precios[envase.envase] || ''}
                onChange={(e) => handlePrecioChange(envase.envase, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>
            {envasesConPrecio} de {totalEnvases} envases con precio configurado
          </p>
        </div>
        
        <button
          onClick={handleSavePrecios}
          disabled={loading || envasesConPrecio === 0}
          className={`
            flex items-center px-6 py-3 rounded-lg font-medium transition-colors
            ${loading || envasesConPrecio === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
            }
          `}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="h-5 w-5 mr-2" />
          )}
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
};

export default EnvasePricing;
