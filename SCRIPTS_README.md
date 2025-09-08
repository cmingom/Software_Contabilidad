# 🚀 Scripts de Control del Sistema

Este directorio contiene tres scripts PowerShell para controlar fácilmente el sistema de Software Contabilidad.

## 📋 Scripts Disponibles

### 1. `turnon.ps1` - Encender Sistema
**Uso:** `.\turnon.ps1`

**Función:** Levanta todo el sistema completo
- ✅ Inicia la base de datos PostgreSQL (Docker)
- ✅ Inicia el backend Go (API)
- ✅ Inicia el frontend React
- ✅ Abre la aplicación en el navegador

**URLs del sistema:**
- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:8080
- 📊 Base de datos: http://localhost:5432

### 2. `reboot.ps1` - Reiniciar Sistema
**Uso:** `.\reboot.ps1`

**Función:** Reinicia completamente el sistema
- 🛑 Detiene todos los procesos
- 🗑️ Limpia completamente la base de datos
- 🔧 Recrea el esquema de base de datos
- ✅ Reinicia todo el sistema desde cero

**⚠️ ADVERTENCIA:** Este script elimina TODOS los datos de la base de datos.

### 3. `turnoff.ps1` - Apagar Sistema
**Uso:** `.\turnoff.ps1`

**Función:** Apaga completamente el sistema
- 🛑 Detiene el backend Go
- 🛑 Detiene el frontend React
- 🛑 Detiene los contenedores Docker
- ✅ Libera todos los puertos

## 🎯 Flujo de Trabajo Recomendado

### Primera vez o después de cambios importantes:
```powershell
.\reboot.ps1
```

### Uso diario normal:
```powershell
.\turnon.ps1
```

### Al finalizar el trabajo:
```powershell
.\turnoff.ps1
```

## ⚙️ Requisitos Previos

Antes de usar los scripts, asegúrate de tener:

1. **Docker Desktop** instalado y ejecutándose
2. **Go** instalado (versión 1.19 o superior)
3. **Node.js** instalado (versión 16 o superior)
4. **PowerShell** con permisos de ejecución

## 🔧 Configuración de PowerShell

Si tienes problemas de permisos, ejecuta:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

## 🐛 Solución de Problemas

### Error: "Docker no está ejecutándose"
- Inicia Docker Desktop
- Espera a que esté completamente cargado

### Error: "Puerto en uso"
- Ejecuta `.\turnoff.ps1` primero
- Espera unos segundos
- Vuelve a ejecutar el script deseado

### Error: "Go no se reconoce"
- Verifica que Go esté instalado
- Reinicia PowerShell
- Los scripts configuran automáticamente el PATH

## 📝 Notas Importantes

- Los scripts abren ventanas separadas para el backend y frontend
- La base de datos se mantiene en un contenedor Docker
- Los datos se persisten entre reinicios (excepto con `reboot.ps1`)
- El sistema tarda aproximadamente 30-60 segundos en estar completamente listo

## 🎉 ¡Listo para usar!

Con estos scripts, puedes controlar fácilmente todo el sistema de Software Contabilidad con un solo comando.
