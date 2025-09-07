import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadExcel } from '../services/api';

const FileUpload = ({ onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      setError('Por favor, selecciona un archivo Excel válido (.xlsx)');
      return;
    }

    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      await uploadExcel(file);
      setSuccess(true);
      setTimeout(() => {
        onFileUploaded();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Subir Archivo Excel
        </h2>
        <p className="text-gray-600">
          Arrastra y suelta tu archivo Excel con los datos de cosecha o haz clic para seleccionarlo
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject ? 'border-primary-500 bg-primary-50' : ''}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-gray-400' : ''}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center">
          {uploading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          ) : success ? (
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          ) : (
            <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
          )}
          
          {uploading ? (
            <p className="text-lg text-gray-600">Procesando archivo...</p>
          ) : success ? (
            <p className="text-lg text-green-600 font-medium">¡Archivo procesado correctamente!</p>
          ) : isDragActive ? (
            <p className="text-lg text-primary-600 font-medium">Suelta el archivo aquí</p>
          ) : (
            <div>
              <p className="text-lg text-gray-600 mb-2">
                Arrastra tu archivo Excel aquí
              </p>
              <p className="text-sm text-gray-500">
                o haz clic para seleccionar un archivo
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p className="font-medium mb-2">Requisitos del archivo:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Formato: Excel (.xlsx)</li>
          <li>Tamaño máximo: 100MB</li>
          <li>Debe contener las columnas de datos de cosecha</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;
