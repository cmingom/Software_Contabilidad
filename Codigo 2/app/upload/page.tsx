'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UploadResult {
  uploadId: string
  rows: number
  envases: string[]
  warnings?: string[]
}


export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar último upload al montar el componente
  useEffect(() => {
    loadLastUpload()
  }, [])

  const loadLastUpload = async () => {
    try {
      const response = await fetch('/api/uploads/list')
      if (response.ok) {
        const uploads = await response.json()
        if (uploads.length > 0) {
          const last = uploads[0] // El más reciente
          setLastUpload({
            uploadId: last.id || '',
            rows: last.totalFacts || 0,
            envases: last.uniqueEnvases || []
          })
        }
      }
    } catch (err) {
      console.error('Error cargando último upload:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Por favor selecciona un archivo Excel (.xlsx)')
        setFile(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error subiendo archivo')
      }

      setResult(data)
      setLastUpload(data) // Actualizar último upload

      // Redirigir automáticamente a pricing después de 2 segundos
      setTimeout(() => {
        window.location.href = `/pricing?uploadId=${data.uploadId}`
      }, 2000)

    } catch (err) {
      console.error('Error en upload:', err);
      if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else if (typeof err === 'object' && err !== null && 'error' in err) {
        setError(`Error: ${(err as any).error}`);
      } else {
        setError('Error desconocido al procesar el archivo');
      }
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subir Archivo Excel</h1>
        <p className="text-muted-foreground">
          Carga tu archivo Excel con los datos de entregas de cosecha para procesar
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Panel de subida */}
        <Card>
          <CardHeader>
            <CardTitle>Subir Archivo</CardTitle>
            <CardDescription>
              Selecciona un archivo Excel (.xlsx) con la hoja &quot;DATOS&quot; y las columnas requeridas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="file">Archivo Excel</Label>
              <Input
                id="file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="mt-1"
              />
            </div>

            {file && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Archivo seleccionado:</strong> {file.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading ? 'Procesando...' : 'Subir y Procesar'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={uploading}
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Panel de resultados */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>
              Información del procesamiento y preview de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">✅ Archivo procesado exitosamente</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Filas procesadas</p>
                    <p className="text-2xl font-bold">{result.rows.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Envases únicos</p>
                    <p className="text-2xl font-bold">{result.envases.length}</p>
                  </div>
                </div>

                {result.warnings && result.warnings.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-2">Advertencias:</p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {result.warnings.slice(0, 5).map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                      {result.warnings.length > 5 && (
                        <li>• ... y {result.warnings.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">Envases detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.envases.map((envase, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                      >
                        {envase}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-green-600 mb-2">
                    ✅ Redirigiendo automáticamente a configuración de precios...
                  </p>
                  <Button 
                    onClick={() => window.location.href = `/pricing?uploadId=${result.uploadId}`}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ir a Configurar Precios Ahora
                  </Button>
                </div>
              </div>
            ) : lastUpload ? (
              <div className="space-y-4">
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">📁 Último archivo procesado</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Filas procesadas</p>
                    <p className="text-2xl font-bold">{lastUpload.rows?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Envases únicos</p>
                    <p className="text-2xl font-bold">{lastUpload.envases?.length || 0}</p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">Envases detectados:</p>
                  <div className="flex flex-wrap gap-2">
                    {lastUpload.envases?.map((envase, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded"
                      >
                        {envase}
                      </span>
                    )) || <span className="text-gray-500">No hay envases</span>}
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    onClick={() => window.location.href = `/pricing?uploadId=${lastUpload.uploadId}`}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    Continuar con Configuración de Precios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Sube un archivo para ver los resultados aquí</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
