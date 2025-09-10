# Sistema de Contabilidad Postcosecha

Sistema completo para calcular pagos por entregas de cosecha con reglas condicionales y exportación a Excel con tabla dinámica.

## Características

- **Procesamiento de Excel**: Lee archivos Excel con validación automática de columnas requeridas
- **Motor de Precios**: Sistema de precios base y reglas condicionales por múltiples dimensiones
- **Exportación Avanzada**: Genera Excel con tabla dinámica prearmada y filtrable
- **Auditoría Completa**: Trazabilidad de cálculos y reglas aplicadas
- **Interfaz Moderna**: UI responsive con Tailwind CSS y shadcn/ui

## Requisitos

- Node.js 18+ 
- PostgreSQL 12+
- npm o yarn

## Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd contabilidad-postcosecha
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar base de datos**
   ```bash
   # Crear archivo .env basado en .env.example
   cp .env.example .env
   
   # Editar .env con tu configuración de PostgreSQL
   DATABASE_URL="postgresql://user:password@localhost:5432/contabilidad_postcosecha"
   ```

4. **Configurar base de datos**
   ```bash
   # Generar cliente Prisma
   npm run db:generate
   
   # Ejecutar migraciones
   npm run db:push
   ```

5. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

6. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## Uso

### 1. Subir Archivo Excel

1. Ve a la página **"Subir Excel"**
2. Selecciona un archivo Excel (.xlsx) con la hoja **"DATOS"**
3. El archivo debe contener las siguientes columnas exactas:
   - ID entrega
   - Nombre cosecha
   - Nombre campo
   - Ceco campo
   - Etiquetas campo
   - Cuartel
   - Ceco cuartel
   - Etiquetas cuartel
   - Especie
   - Variedad
   - Fecha registro
   - Hora registro
   - Nombre trabajador
   - ID trabajador
   - Contratista
   - ID contratista
   - Etiquetas contratista
   - Envase
   - Nro envases
   - Peso real
   - Peso teorico
   - Usuario
   - ID usuario
   - Cuadrilla
   - Código de credencial utilizada en la entrega
   - Código de envase

4. El sistema validará y procesará los datos automáticamente

### 2. Configurar Precios

1. Ve a la página **"Configurar Precios"**
2. **Precios Base**: Establece el precio unitario para cada tipo de envase
3. **Reglas Condicionales**: Crea reglas que modifiquen precios según:
   - Nombre cosecha, campo, cuartel
   - Especie, variedad
   - Contratista, trabajador
   - Rango de fechas
   - Días de la semana
   - Y más...

4. **Recalcular**: Aplica los precios y reglas a todos los datos

### 3. Exportar a Excel

1. Ve a la página **"Exportar"**
2. Selecciona el upload que quieres exportar
3. Descarga el archivo Excel que incluye:
   - **Hoja FACT**: Todos los datos con precios calculados
   - **Hoja PIVOT**: Tabla dinámica prearmada con filtros

## Estructura del Proyecto

```
/
├── app/                    # Páginas de Next.js App Router
│   ├── upload/            # Página de subida de archivos
│   ├── pricing/           # Página de configuración de precios
│   └── export/            # Página de exportación
├── pages/api/             # Endpoints de API
│   ├── uploads.ts         # Procesamiento de archivos Excel
│   ├── price-base.ts      # Gestión de precios base
│   ├── price-rule.ts      # Gestión de reglas condicionales
│   ├── recalc/            # Recalculación de precios
│   └── export/            # Exportación a Excel
├── src/
│   ├── lib/
│   │   ├── xlsx/          # Lectura y escritura de Excel
│   │   ├── pricing/       # Motor de precios
│   │   └── pivot/         # Plantillas de tabla dinámica
│   └── components/ui/     # Componentes de UI
├── prisma/
│   └── schema.prisma      # Esquema de base de datos
└── storage/               # Archivos temporales
```

## API Endpoints

### Upload
- `POST /api/uploads` - Subir archivo Excel
- `GET /api/uploads/:id/preview` - Vista previa de datos

### Precios
- `GET /api/price-base` - Obtener precios base
- `POST /api/price-base` - Crear/actualizar precios base
- `GET /api/price-rule` - Obtener reglas
- `POST /api/price-rule` - Crear/actualizar reglas

### Cálculos
- `POST /api/recalc/:uploadId` - Recalcular precios
- `GET /api/audit` - Información de auditoría

### Exportación
- `GET /api/export/:uploadId` - Descargar Excel

## Modelo de Datos

### Upload
Registro de cada archivo Excel subido.

### Fact
Cada fila de datos del Excel con precios calculados.

### PriceBase
Precios base por tipo de envase.

### PriceRule
Reglas condicionales que modifican precios según múltiples criterios.

## Reglas de Negocio

### Precios Base
- Un precio unitario por cada tipo de envase
- Se aplica cuando no hay reglas condicionales

### Reglas Condicionales
- **Modo OVERRIDE**: Reemplaza completamente el precio base
- **Modo DELTA**: Suma/resta al precio base
- **Prioridad**: Reglas con mayor prioridad se aplican primero
- **Especificidad**: Reglas con más campos definidos tienen prioridad

### Cálculo de Monto
```
monto = nroEnvases * precioUnitario
```

## Variables de Entorno

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/contabilidad_postcosecha"

# Configuración de la app
NEXT_PUBLIC_MAX_PREVIEW_ROWS=100
FILE_STORAGE_DIR=./storage

# Next.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción

# Base de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar esquema con BD
npm run db:migrate   # Ejecutar migraciones
npm run db:studio    # Abrir Prisma Studio

# Linting
npm run lint         # Ejecutar ESLint
```

## Despliegue

### Docker
```bash
# Construir imagen
docker build -t contabilidad-postcosecha .

# Ejecutar contenedor
docker run -p 3000:3000 -e DATABASE_URL="..." contabilidad-postcosecha
```

### Fly.io
```bash
# Instalar flyctl
# Configurar fly.toml
fly deploy
```

### Render/EC2
```bash
# Construir proyecto
npm run build

# Iniciar servidor
npm run start
```

## Solución de Problemas

### Error de conexión a BD
- Verificar que PostgreSQL esté ejecutándose
- Verificar DATABASE_URL en .env
- Ejecutar `npm run db:push`

### Error al procesar Excel
- Verificar que el archivo tenga la hoja "DATOS"
- Verificar que todas las columnas requeridas estén presentes
- Verificar formato de fechas (DD/MM/YYYY o YYYY-MM-DD)

### Error de memoria
- Para archivos muy grandes, aumentar memoria de Node.js:
  ```bash
  node --max-old-space-size=4096 node_modules/.bin/next dev
  ```

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.
