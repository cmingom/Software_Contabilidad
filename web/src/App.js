import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import EnvasePricing from './components/EnvasePricing';
import LiquidacionGenerator from './components/LiquidacionGenerator';
import { getEnvases } from './services/api';

function App() {
  const [step, setStep] = useState(1);
  const [envases, setEnvases] = useState([]);
  const [preciosEnvases, setPreciosEnvases] = useState({});
  const [fileUploaded, setFileUploaded] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  useEffect(() => {
    if (fileUploaded && envases.length === 0) {
      // Solo cargar envases si no se recibieron en la respuesta de subida
      loadEnvases();
    }
  }, [fileUploaded, envases.length]);

  const loadEnvases = async () => {
    try {
      const data = await getEnvases();
      setEnvases(data.envases);
    } catch (error) {
      console.error('Error cargando envases:', error);
    }
  };

  const handleFileUploaded = (responseData) => {
    setFileUploaded(true);
    
    // Detectar si se usó API optimizada
    if (responseData.optimized) {
      setIsOptimized(true);
      console.log('✅ Usando API optimizada - Procesamiento ultra-rápido');
    }
    
    // Si la respuesta incluye envases (API optimizada), usarlos directamente
    if (responseData.envases && responseData.envases.length > 0) {
      console.log('Usando envases de la respuesta:', responseData.envases);
      setEnvases(responseData.envases);
    }
    
    setStep(2);
  };

  const handlePreciosSet = (precios) => {
    setPreciosEnvases(precios);
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setEnvases([]);
    setPreciosEnvases({});
    setFileUploaded(false);
    setIsOptimized(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Software de Liquidación de Cosecheros
          </h1>
          <p className="text-gray-600">
            Sistema para procesar datos de cosecha y generar liquidaciones por trabajador
          </p>
          {isOptimized && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <span className="mr-2">⚡</span>
              <span className="font-medium">Modo Optimizado Activado</span>
              <span className="ml-2 text-sm">150k+ filas en &lt;10s</span>
            </div>
          )}
        </header>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > stepNumber ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <div className="text-sm text-gray-600">
              {step === 1 && 'Subir archivo Excel'}
              {step === 2 && 'Configurar precios de envases'}
              {step === 3 && 'Generar liquidaciones'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {step === 1 && (
            <FileUpload onFileUploaded={handleFileUploaded} />
          )}
          
          {step === 2 && (
            <EnvasePricing 
              envases={envases} 
              onPreciosSet={handlePreciosSet}
              onBack={() => setStep(1)}
            />
          )}
          
          {step === 3 && (
            <LiquidacionGenerator 
              preciosEnvases={preciosEnvases}
              onReset={handleReset}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
