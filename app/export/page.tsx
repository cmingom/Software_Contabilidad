'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Upload {
  id: string
  filename: string
  rows: number
  importedAt: string
}

export default function ExportPage() {
  const searchParams = useSearchParams()
  const uploadId = searchParams?.get('uploadId') || null
  
  const [uploads, setUploads] = useState<Upload[]>([])
  const [selectedUpload, setSelectedUpload] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState<string | null>(null)
  const [autoDownload, setAutoDownload] = useState(false)

  useEffect(() => {
    loadUploads()
    
    // Si hay uploadId en la URL, hacer descarga automática
    if (uploadId) {
      setSelectedUpload(uploadId)
      setAutoDownload(true)
      handleExport(uploadId)
    }
  }, [uploadId])

  const loadUploads = async () => {
    try {
      const response = await fetch('/api/uploads/list')
      if (response.ok) {
        const data = await response.json()
        setUploads(data)
      }
    } catch (error) {
      console.error('Error cargando uploads:', error)
    }
  }

  const handleExport = async (uploadIdToExport?: string) => {
    const targetUploadId = uploadIdToExport || selectedUpload
    if (!targetUploadId) return

    setExporting(true)
    setExportResult(null)

    try {
      const response = await fetch(`/api/export/${targetUploadId}`)
      
      if (response.ok) {
        // Crear blob y descargar
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `liquidacion_${targetUploadId}_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setExportResult('✅ Archivo de liquidación descargado correctamente')
      } else {
        const error = await response.json()
        setExportResult('❌ Error: ' + (error.error || 'Error desconocido'))
      }
    } catch (error) {
      setExportResult('❌ Error: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {autoDownload ? 'Descargando Archivo de Liquidación' : 'Exportar a Excel'}
        </h1>
        <p className="text-muted-foreground">
          {autoDownload 
            ? 'Generando y descargando archivo Excel con liquidación calculada...'
            : 'Genera archivo Excel con tabla dinámica filtrable por todas las dimensiones'
          }
        </p>
      </div>

      {autoDownload && exporting ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Generando Archivo de Liquidación</h3>
            <p className="text-muted-foreground">
              Procesando datos y calculando precios...
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Panel de selección */}
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Upload</CardTitle>
              <CardDescription>
                Elige el conjunto de datos que quieres exportar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="upload-select" className="block text-sm font-medium mb-1">Upload a Exportar</label>
                <select
                  id="upload-select"
                  value={selectedUpload}
                  onChange={(e) => setSelectedUpload(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Selecciona un upload...</option>
                  {uploads.map((upload) => (
                    <option key={upload.id} value={upload.id}>
                      {upload.filename} ({upload.rows.toLocaleString()} filas) - {formatDate(new Date(upload.importedAt))}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUpload && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Información del Upload</h4>
                  {(() => {
                    const upload = uploads.find(u => u.id === selectedUpload)
                    return upload ? (
                      <div className="text-sm space-y-1">
                        <p><strong>Archivo:</strong> {upload.filename}</p>
                        <p><strong>Filas:</strong> {upload.rows.toLocaleString()}</p>
                        <p><strong>Importado:</strong> {formatDate(new Date(upload.importedAt))}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )}

              <Button 
                onClick={() => handleExport()} 
                disabled={!selectedUpload || exporting}
                className="w-full"
              >
                {exporting ? 'Generando Excel...' : 'Exportar a Excel'}
              </Button>

              {exportResult && (
                <div className={`p-4 rounded-lg ${
                  exportResult.includes('Error') 
                    ? 'bg-destructive/10 border border-destructive/20 text-destructive' 
                    : 'bg-green-50 border border-green-200 text-green-800'
                }`}>
                  <p className="text-sm">{exportResult}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de información */}
          <Card>
            <CardHeader>
              <CardTitle>Contenido del Export</CardTitle>
              <CardDescription>
                El archivo Excel incluirá las siguientes hojas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Hoja FACT</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Contiene todos los registros con los precios calculados
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Fecha, Trabajador, Envase, Cantidad</li>
                    <li>• Precio unitario calculado</li>
                    <li>• Monto total por fila</li>
                    <li>• Formato de tabla con bordes</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Hoja PIVOT</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Tabla dinámica prearmada con filtros por todas las dimensiones
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Filtros por: Cosecha, Campo, Cuartel, Especie, etc.</li>
                    <li>• Agrupación por Trabajador, Fecha, Envase</li>
                    <li>• Totales por Nro Envases y Monto</li>
                    <li>• Se actualiza automáticamente al abrir</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Instrucciones de Uso</h5>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Descarga el archivo Excel</li>
                    <li>2. Abre el archivo en Microsoft Excel</li>
                    <li>3. Ve a la hoja PIVOT</li>
                    <li>4. Usa los filtros para analizar los datos</li>
                    <li>5. La tabla se actualiza automáticamente</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mostrar resultado de descarga automática */}
      {autoDownload && exportResult && (
        <Card className="mt-8">
          <CardContent className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold mb-2">Liquidación Generada Exitosamente</h3>
            <p className="text-muted-foreground mb-4">{exportResult}</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={() => window.location.href = '/upload'}>
                Procesar Otro Archivo
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/pricing'}>
                Configurar Precios
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de uploads disponibles */}
      {!autoDownload && uploads.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Uploads Disponibles</CardTitle>
            <CardDescription>
              Historial de archivos procesados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Filas</TableHead>
                  <TableHead>Fecha Importación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((upload) => (
                  <TableRow key={upload.id}>
                    <TableCell className="font-medium">{upload.filename}</TableCell>
                    <TableCell>{upload.rows.toLocaleString()}</TableCell>
                    <TableCell>{formatDate(new Date(upload.importedAt))}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUpload(upload.id)}
                      >
                        Seleccionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!autoDownload && uploads.length === 0 && (
        <Card className="mt-8">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No hay uploads disponibles para exportar
            </p>
            <Button onClick={() => window.location.href = '/upload'}>
              Subir Archivo Excel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}