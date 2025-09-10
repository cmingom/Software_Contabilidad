import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Sistema de Contabilidad Postcosecha</h1>
        <p className="text-xl text-muted-foreground">
          Calcula pagos por entregas de cosecha con reglas condicionales y exporta a Excel con tabla dinámica
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Subir Excel</CardTitle>
            <CardDescription>
              Carga tu archivo Excel con los datos de entregas de cosecha
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              El sistema validará las columnas requeridas y procesará los datos automáticamente.
            </p>
            <Link href="/upload">
              <Button className="w-full">Subir Archivo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Configurar Precios</CardTitle>
            <CardDescription>
              Define precios base y reglas condicionales por múltiples dimensiones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Establece precios por envase y crea reglas que se apliquen según diferentes criterios.
            </p>
            <Link href="/pricing">
              <Button className="w-full">Configurar Precios</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Exportar</CardTitle>
            <CardDescription>
              Genera archivo Excel con tabla dinámica filtrable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Descarga un Excel con los datos calculados y una tabla dinámica prearmada.
            </p>
            <Link href="/export">
              <Button className="w-full">Exportar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Características del Sistema</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Procesamiento de Datos</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Validación automática de columnas requeridas</li>
              <li>Procesamiento por lotes para archivos grandes</li>
              <li>Normalización de fechas y tipos de datos</li>
              <li>Detección automática de envases únicos</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Motor de Precios</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Precios base por envase</li>
              <li>Reglas condicionales con múltiples dimensiones</li>
              <li>Sistema de prioridades para resolución de conflictos</li>
              <li>Modos OVERRIDE y DELTA</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Exportación</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Hoja FACT con todos los datos calculados</li>
              <li>Hoja PIVOT con tabla dinámica prearmada</li>
              <li>Filtros por todas las dimensiones</li>
              <li>Agrupación por fecha y trabajador</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Auditoría</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Trazabilidad completa de cálculos</li>
              <li>Información de reglas aplicadas</li>
              <li>Búsqueda por ID de entrega o trabajador</li>
              <li>Resumen de totales por trabajador y fecha</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
