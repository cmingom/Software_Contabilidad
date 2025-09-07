import React, { useState } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { generarLiquidacion } from '../services/api';

const LiquidacionGenerator = ({ preciosEnvases, onReset, onBack }) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleGenerarLiquidacion = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const blob = await generarLiquidacion(preciosEnvases);
      
      // Crear URL para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `liquidaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar liquidaciones');
    } finally {
      setGenerating(false);
    }
  };

  const handleNuevoProceso = () => {
    onReset();
  };

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
          Generar Liquidaciones
        </h2>
        
        <div className="w-20"></div> {/* Spacer para centrar el título */}
      </div>

      {success ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Liquidaciones generadas exitosamente!
          </h3>
          <p className="text-gray-600 mb-6">
            El archivo Excel se ha descargado automáticamente con las hojas de liquidación para cada trabajador.
          </p>
          <button
            onClick={handleNuevoProceso}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Procesar otro archivo
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800">
                Se generará un archivo Excel con una hoja por cada trabajador, mostrando las liquidaciones 
                agrupadas por fecha y tipo de envase según la Plantilla 1.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Precios configurados:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(preciosEnvases).map(([envase, precio]) => (
                <div key={envase} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900">{envase}</div>
                  <div className="text-lg font-semibold text-primary-600">${precio.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleGenerarLiquidacion}
              disabled={generating}
              className={`
                flex items-center px-8 py-4 rounded-lg font-medium text-lg transition-colors
                ${generating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
                }
              `}
            >
              {generating ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              ) : (
                <Download className="h-6 w-6 mr-3" />
              )}
              {generating ? 'Generando liquidaciones...' : 'Generar y Descargar Excel'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LiquidacionGenerator;
