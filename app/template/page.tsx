'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TemplatePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    templatePath: '',
    dataPath: '',
    outputPath: '',
    dataSheetName: 'DATA',
    dataType: 'csv'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/template/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outputPath: formData.templatePath || 'storage/template.xlsx'
        })
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        error: 'Error creando plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  const processTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/template/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        error: 'Error procesando plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Procesador de Plantillas Excel
        </h1>
        <p className="text-gray-600">
          Crea plantillas Excel con tabla dinámica y procesa datos desde CSV/JSON
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Crear Plantilla */}
        <Card>
          <CardHeader>
            <CardTitle>1. Crear Plantilla</CardTitle>
            <CardDescription>
              Crea una plantilla Excel con tabla dinámica preconfigurada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templatePath">Ruta de la plantilla</Label>
              <Input
                id="templatePath"
                name="templatePath"
                value={formData.templatePath}
                onChange={handleInputChange}
                placeholder="storage/template.xlsx"
              />
            </div>
            <Button 
              onClick={createTemplate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creando...' : 'Crear Plantilla'}
            </Button>
          </CardContent>
        </Card>

        {/* Procesar Plantilla */}
        <Card>
          <CardHeader>
            <CardTitle>2. Procesar Plantilla</CardTitle>
            <CardDescription>
              Procesa datos desde CSV o JSON usando la plantilla
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templatePath2">Ruta de la plantilla</Label>
              <Input
                id="templatePath2"
                name="templatePath"
                value={formData.templatePath}
                onChange={handleInputChange}
                placeholder="storage/template.xlsx"
              />
            </div>
            <div>
              <Label htmlFor="dataPath">Ruta de los datos</Label>
              <Input
                id="dataPath"
                name="dataPath"
                value={formData.dataPath}
                onChange={handleInputChange}
                placeholder="storage/data.csv"
              />
            </div>
            <div>
              <Label htmlFor="outputPath">Ruta de salida</Label>
              <Input
                id="outputPath"
                name="outputPath"
                value={formData.outputPath}
                onChange={handleInputChange}
                placeholder="storage/output.xlsx"
              />
            </div>
            <div>
              <Label htmlFor="dataSheetName">Nombre de la hoja de datos</Label>
              <Input
                id="dataSheetName"
                name="dataSheetName"
                value={formData.dataSheetName}
                onChange={handleInputChange}
                placeholder="DATA"
              />
            </div>
            <div>
              <Label htmlFor="dataType">Tipo de archivo</Label>
              <select
                id="dataType"
                name="dataType"
                value={formData.dataType}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <Button 
              onClick={processTemplate} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Procesando...' : 'Procesar Plantilla'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultado */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? '✅ Éxito' : '❌ Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-2">
                <p><strong>Archivo generado:</strong> {result.outputPath}</p>
                {result.rowsProcessed && (
                  <p><strong>Registros procesados:</strong> {result.rowsProcessed}</p>
                )}
                <p><strong>Mensaje:</strong> {result.message}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p><strong>Error:</strong> {result.error}</p>
                {result.details && (
                  <div>
                    <strong>Detalles:</strong>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-sm">
                      {Array.isArray(result.details) 
                        ? result.details.join('\n') 
                        : result.details}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información del sistema */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Características del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Funcionalidades:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Plantilla Excel con tabla dinámica preconfigurada</li>
                <li>• Procesamiento de archivos CSV y JSON</li>
                <li>• Actualización automática de rangos de tabla dinámica</li>
                <li>• Formato profesional mantenido</li>
                <li>• Ajuste automático de anchos de columna</li>
                <li>• Procesamiento en lotes para mejor rendimiento</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Estructura de datos:</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• fecha: Fecha de la entrega</li>
                <li>• trabajador: Nombre del trabajador</li>
                <li>• idTrabajador: ID del trabajador</li>
                <li>• envase: Tipo de envase</li>
                <li>• cantidad: Cantidad de envases</li>
                <li>• precioUnitario: Precio por envase</li>
                <li>• montoTotal: Monto total</li>
                <li>• cuartel: Cuartel</li>
                <li>• contratista: Contratista</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
