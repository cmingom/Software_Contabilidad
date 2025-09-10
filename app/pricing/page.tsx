'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'

interface Envase {
  envase: string
  count: number
}

interface PriceBase {
  id: string
  envase: string
  price: number
  active: boolean
}

interface PriceRule {
  id: string
  envase: string
  cuarteles: string[]
  fechas: string[]
  precio: number
  activo: boolean
}

interface Metadata {
  cuarteles: string[]
  fechas: string[]
  envases: string[]
}

export default function PricingPage() {
  const searchParams = useSearchParams()
  const uploadId = searchParams?.get('uploadId') || null

  const [envases, setEnvases] = useState<Envase[]>([])
  const [priceBases, setPriceBases] = useState<PriceBase[]>([])
  const [priceRules, setPriceRules] = useState<PriceRule[]>([])
  const [metadata, setMetadata] = useState<Metadata>({ cuarteles: [], fechas: [], envases: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showRules, setShowRules] = useState(false)

  const loadEnvases = async () => {
    try {
      setLoading(true)
      
      // Cargar datos consolidados de envases
      const consolidatedResponse = await fetch(`/api/uploads/${uploadId}/consolidated`)
      if (!consolidatedResponse.ok) {
        throw new Error('Error cargando datos consolidados')
      }
      const consolidatedData = await consolidatedResponse.json()
      
      // Usar datos consolidados para mostrar resumen por envase
      const envaseData = consolidatedData.envases.map((item: any) => ({
        envase: item.envase,
        count: item.count
      }))
      
      setEnvases(envaseData)
      
      // Cargar precios existentes de la base de datos
      const pricesResponse = await fetch('/api/price-base')
      let existingPrices: PriceBase[] = []
      
      if (pricesResponse.ok) {
        existingPrices = await pricesResponse.json()
      }
      
      // Cargar metadatos del Excel (cuarteles, fechas, envases)
      const metadataResponse = await fetch(`/api/uploads/${uploadId}/metadata`)
      let metadataData: Metadata = { cuarteles: [], fechas: [], envases: [] }
      
      if (metadataResponse.ok) {
        metadataData = await metadataResponse.json()
      }
      
      // Cargar reglas existentes
      const rulesResponse = await fetch('/api/price-rule')
      let existingRules: PriceRule[] = []
      
      if (rulesResponse.ok) {
        const rules = await rulesResponse.json()
        existingRules = rules.map((rule: any) => ({
          id: rule.id,
          envase: rule.envase || '',
          cuarteles: rule.cuartel ? [rule.cuartel] : [],
          fechas: rule.dateStart ? [new Date(rule.dateStart).toISOString().split('T')[0]] : [],
          precio: rule.amount,
          activo: rule.active
        }))
      }
      
      // Crear precios base, usando existentes o por defecto
      const priceBasesData = envaseData.map((envase: Envase) => {
        const existing = existingPrices.find(p => p.envase === envase.envase)
        return {
          id: existing?.id || `temp-${envase.envase}`,
          envase: envase.envase,
          price: existing?.price || 0,
          active: existing?.active !== undefined ? existing.active : true
        }
      })
      
      setPriceBases(priceBasesData)
      setPriceRules(existingRules)
      setMetadata(metadataData)
      
    } catch (error) {
      console.error('Error cargando envases:', error)
      alert(`Error cargando datos: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (uploadId) {
      loadEnvases()
    }
  }, [uploadId])

  const updatePriceBase = (envase: string, price: number) => {
    setPriceBases(prev => 
      prev.map(pb => 
        pb.envase === envase 
          ? { ...pb, price: price }
          : pb
      )
    )
  }

  const addPriceRule = () => {
    const newRule: PriceRule = {
      id: `temp-${Date.now()}`,
      envase: '',
      cuarteles: [],
      fechas: [],
      precio: 0,
      activo: true
    }
    setPriceRules(prev => [...prev, newRule])
  }

  const updatePriceRule = (id: string, field: keyof PriceRule, value: any) => {
    setPriceRules(prev => 
      prev.map(rule => 
        rule.id === id 
          ? { ...rule, [field]: value }
          : rule
      )
    )
  }

  const removePriceRule = (id: string) => {
    setPriceRules(prev => prev.filter(rule => rule.id !== id))
  }

  const toggleCuartel = (ruleId: string, cuartel: string) => {
    setPriceRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              cuarteles: rule.cuarteles.includes(cuartel)
                ? rule.cuarteles.filter(c => c !== cuartel)
                : [...rule.cuarteles, cuartel]
            }
          : rule
      )
    )
  }

  const toggleFecha = (ruleId: string, fecha: string) => {
    setPriceRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { 
              ...rule, 
              fechas: rule.fechas.includes(fecha)
                ? rule.fechas.filter(f => f !== fecha)
                : [...rule.fechas, fecha]
            }
          : rule
      )
    )
  }

  const savePrices = async () => {
    try {
      setSaving(true)
      
      // Guardar precios base
      const priceItems = priceBases.map(pb => ({
        envase: pb.envase,
        price: pb.price,
        active: pb.active
      }))
      
      const priceResponse = await fetch('/api/price-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: priceItems })
      })
      
      if (!priceResponse.ok) {
        const errorData = await priceResponse.json()
        throw new Error(errorData.error || 'Error al guardar precios base')
      }
      
      // Guardar reglas de precios
      const validRules = priceRules.filter(rule => 
        rule.envase && rule.precio > 0 && rule.activo && (rule.cuarteles.length > 0 || rule.fechas.length > 0)
      )
      
      if (validRules.length > 0) {
        const ruleItems: any[] = []
        
        // Crear una regla por cada combinación de cuartel y fecha
        validRules.forEach(rule => {
          if (rule.cuarteles.length === 0) {
            // Solo fechas
            rule.fechas.forEach(fecha => {
              ruleItems.push({
                envase: rule.envase,
                cuartel: null,
                dateStart: new Date(fecha),
                amount: rule.precio,
                mode: 'OVERRIDE',
                priority: 1,
                active: rule.activo
              })
            })
          } else if (rule.fechas.length === 0) {
            // Solo cuarteles
            rule.cuarteles.forEach(cuartel => {
              ruleItems.push({
                envase: rule.envase,
                cuartel: cuartel,
                dateStart: null,
                amount: rule.precio,
                mode: 'OVERRIDE',
                priority: 1,
                active: rule.activo
              })
            })
          } else {
            // Combinación de cuarteles y fechas
            rule.cuarteles.forEach(cuartel => {
              rule.fechas.forEach(fecha => {
                ruleItems.push({
                  envase: rule.envase,
                  cuartel: cuartel,
                  dateStart: new Date(fecha),
                  amount: rule.precio,
                  mode: 'OVERRIDE',
                  priority: 1,
                  active: rule.activo
                })
              })
            })
          }
        })
        
        const ruleResponse = await fetch('/api/price-rule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ upsert: ruleItems })
        })
        
        if (!ruleResponse.ok) {
          const errorData = await ruleResponse.json()
          throw new Error(errorData.error || 'Error al guardar reglas de precios')
        }
      }
      
      console.log('Precios y reglas guardados exitosamente')
      
      // Redirigir automáticamente a la vista de descarga
      setTimeout(() => {
        window.location.href = `/export?uploadId=${uploadId}`
      }, 1500)
      
    } catch (error) {
      console.error('Error guardando precios:', error)
      alert(`Error al guardar precios: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando envases...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurar Precios</h1>
        <p className="text-gray-600 mt-2">
          Define el precio base para cada tipo de envase
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precios Base por Envase</CardTitle>
          <CardDescription>
            Establece el precio por defecto para cada tipo de envase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {envases.map((envase) => {
                const priceBase = priceBases.find(pb => pb.envase === envase.envase)
                return (
                  <div key={envase.envase} className="border rounded-lg p-4">
                    <Label htmlFor={`price-${envase.envase}`} className="text-sm font-medium">
                      {envase.envase}
                    </Label>
                    <div className="mt-2">
                      <Input
                        id={`price-${envase.envase}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceBase?.price || 0}
                        onChange={(e) => updatePriceBase(envase.envase, parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Cantidad: {envase.count.toLocaleString()}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={() => setShowRules(!showRules)}
                variant="outline"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {showRules ? 'Ocultar Reglas' : 'Agregar Reglas Específicas'}
              </Button>
              
              <Button
                onClick={savePrices}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Guardando y Generando Liquidación...' : 'Guardar Precios y Generar Liquidación'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resumen de Envases</CardTitle>
          <CardDescription>
            Lista de todos los tipos de envases encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Envase</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Base</TableHead>
                <TableHead>Total Estimado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envases.map((envase) => {
                const priceBase = priceBases.find(pb => pb.envase === envase.envase)
                const total = (priceBase?.price || 0) * envase.count
                return (
                  <TableRow key={envase.envase}>
                    <TableCell className="font-medium">{envase.envase}</TableCell>
                    <TableCell>{envase.count.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(priceBase?.price || 0)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(total)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sección de Reglas Específicas */}
      {showRules && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Reglas de Precios Específicas</CardTitle>
            <CardDescription>
              Define precios especiales por fecha, cuartel y envase. Estas reglas sobrescriben los precios base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-medium">Reglas Configuradas</h4>
                <Button onClick={addPriceRule} className="bg-green-600 hover:bg-green-700">
                  + Agregar Regla
                </Button>
              </div>

              {priceRules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay reglas configuradas</p>
                  <p className="text-sm">Haz clic en &quot;Agregar Regla&quot; para crear una regla específica</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceRules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                          <Label htmlFor={`rule-envase-${rule.id}`}>Envase</Label>
                          <select
                            id={`rule-envase-${rule.id}`}
                            value={rule.envase}
                            onChange={(e) => updatePriceRule(rule.id, 'envase', e.target.value)}
                            className="w-full mt-1 p-2 border rounded-md"
                          >
                            <option value="">Seleccionar envase...</option>
                            {envases.map((envase) => (
                              <option key={envase.envase} value={envase.envase}>
                                {envase.envase}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label>Cuarteles (opcional)</Label>
                          <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2">
                            {metadata.cuarteles.length === 0 ? (
                              <p className="text-sm text-gray-500">No hay cuarteles disponibles</p>
                            ) : (
                              metadata.cuarteles.map(cuartel => (
                                <label key={cuartel} className="flex items-center space-x-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={rule.cuarteles.includes(cuartel)}
                                    onChange={() => toggleCuartel(rule.id, cuartel)}
                                    className="rounded"
                                  />
                                  <span>{cuartel}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Fechas (opcional)</Label>
                          <div className="mt-1 max-h-32 overflow-y-auto border rounded-md p-2">
                            {metadata.fechas.length === 0 ? (
                              <p className="text-sm text-gray-500">No hay fechas disponibles</p>
                            ) : (
                              metadata.fechas.map(fecha => (
                                <label key={fecha} className="flex items-center space-x-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={rule.fechas.includes(fecha)}
                                    onChange={() => toggleFecha(rule.id, fecha)}
                                    className="rounded"
                                  />
                                  <span>{new Date(fecha).toLocaleDateString()}</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`rule-precio-${rule.id}`}>Precio</Label>
                          <Input
                            id={`rule-precio-${rule.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={rule.precio}
                            onChange={(e) => updatePriceRule(rule.id, 'precio', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => removePriceRule(rule.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h5 className="font-medium text-blue-800 mb-2">Cómo funcionan las reglas:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Precio base:</strong> Se aplica a todos los envases por defecto</li>
                  <li>• <strong>Reglas específicas:</strong> Sobrescriben el precio base para combinaciones específicas</li>
                  <li>• <strong>Selección múltiple:</strong> Puedes seleccionar varios cuarteles y/o fechas</li>
                  <li>• <strong>Ejemplo:</strong> &quot;En Cuartel A y B, el 15/01/2024 y 16/01/2024, el envase Canasto vale $1200&quot;</li>
                  <li>• <strong>Lógica:</strong> Se crean reglas para cada combinación de cuartel y fecha seleccionados</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}