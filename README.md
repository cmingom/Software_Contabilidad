# Software de Liquidación de Cosecheros

Sistema completo para procesar datos de cosecha y generar liquidaciones por trabajador con arquitectura monolítica desacoplada.

## 🏗️ Arquitectura

- **Backend**: Go con Gin framework
- **Base de datos**: PostgreSQL con GORM ORM
- **Frontend**: React con Tailwind CSS
- **Patrón**: MVC (Model-View-Controller)
- **Arquitectura**: Monolítica desacoplada

## 🚀 Características

- **Drag & Drop**: Subida de archivos Excel (.xlsx) con interfaz intuitiva
- **Configuración de precios**: Interfaz para establecer precios por tipo de envase
- **Generación automática**: Excel con hojas por trabajador
- **Agrupación inteligente**: Datos agrupados por fecha y tipo de envase
- **Interfaz moderna**: UI responsiva con Tailwind CSS

## 📋 Requisitos

- Go 1.21+
- Node.js 18+
- PostgreSQL 13+
- Docker (opcional)

## 🛠️ Instalación

### Opción 1: Instalación manual

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd software-contabilidad
```

2. **Configurar base de datos**
```bash
# Crear base de datos PostgreSQL
createdb software_contabilidad

# O usar el comando del Makefile
make setup-db
```

3. **Instalar dependencias**
```bash
make install-deps
```

4. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

5. **Ejecutar migraciones**
```bash
make migrate
```

### Opción 2: Docker Compose

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## 🏃‍♂️ Uso

### Desarrollo

```bash
# Ejecutar backend y frontend en modo desarrollo
make dev
```

- Backend: http://localhost:8080
- Frontend: http://localhost:3000

### Producción

```bash
# Compilar todo
make build

# Ejecutar backend
./bin/software-contabilidad
```

## 📊 Flujo de trabajo

1. **Subir archivo Excel**: Arrastra y suelta tu archivo con datos de cosecha
2. **Configurar precios**: Establece el precio por unidad para cada tipo de envase
3. **Generar liquidaciones**: Descarga el Excel con hojas por trabajador

## 📁 Estructura del proyecto

```
software-contabilidad/
├── cmd/                    # Punto de entrada de la aplicación
├── internal/               # Código interno de la aplicación
│   ├── config/            # Configuración
│   ├── database/          # Conexión y migraciones de BD
│   ├── handlers/          # Controladores HTTP
│   ├── middleware/        # Middleware personalizado
│   ├── models/            # Modelos de datos
│   ├── repository/        # Capa de acceso a datos
│   └── services/          # Lógica de negocio
├── web/                   # Frontend React
│   ├── public/           # Archivos públicos
│   ├── src/              # Código fuente React
│   │   ├── components/   # Componentes React
│   │   └── services/     # Servicios API
│   └── package.json      # Dependencias Node.js
├── prisma/               # Esquemas de Prisma
├── docker-compose.yml    # Configuración Docker
├── Dockerfile           # Imagen Docker
├── Makefile            # Comandos de automatización
└── README.md           # Documentación
```

## 🔧 API Endpoints

### Entregas
- `POST /api/v1/entregas/upload` - Subir archivo Excel
- `GET /api/v1/entregas/envases` - Obtener tipos de envases

### Precios de Envases
- `GET /api/v1/precios-envases` - Listar precios
- `POST /api/v1/precios-envases` - Crear precio
- `PUT /api/v1/precios-envases/:id` - Actualizar precio

### Liquidaciones
- `POST /api/v1/liquidaciones/generar` - Generar liquidaciones
- `GET /api/v1/liquidaciones/:trabajador` - Obtener liquidación por trabajador

## 📝 Formato de datos

El sistema procesa archivos Excel con las siguientes columnas:

- ID entrega
- Nombre cosecha
- Nombre campo
- Cuartel
- Especie/Variedad
- Fecha/Hora registro
- Nombre trabajador
- ID trabajador
- Envase
- Número de envases
- Peso real/teórico
- Usuario
- Cuadrilla
- Códigos de credencial/envase

## 🎯 Plantilla de salida

Cada trabajador tendrá una hoja en el Excel con:

- **Fecha**: Fecha de trabajo
- **Envase**: Tipo de envase
- **Precio Pieza**: Precio por unidad
- **Cantidad Pieza**: Número de envases
- **Costo Piezas**: Total calculado
- **Precio Hora**: (Para futuras implementaciones)
- **Cantidad Horas**: (Para futuras implementaciones)
- **Costo Hora**: (Para futuras implementaciones)

## 🧪 Testing

```bash
# Ejecutar tests
make test

# Tests con cobertura
go test -cover ./...
```

## 🐳 Docker

```bash
# Construir imagen
make docker-build

# Ejecutar con Docker
make docker-run

# O usar docker-compose
docker-compose up -d
```

## 📈 Monitoreo

El sistema incluye:
- Logs estructurados
- Middleware de CORS
- Manejo de errores centralizado
- Health checks para Docker

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas o preguntas:

1. Revisa la documentación
2. Busca en los issues existentes
3. Crea un nuevo issue con detalles del problema

## 🔮 Roadmap

- [ ] Implementación de bonos según especificación
- [ ] Sistema de autenticación
- [ ] Dashboard de estadísticas
- [ ] Exportación a PDF
- [ ] API de reportes
- [ ] Sistema de notificaciones