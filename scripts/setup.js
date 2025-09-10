#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando Sistema de Contabilidad Postcosecha...\n');

// Verificar si existe .env
if (!fs.existsSync('.env')) {
  console.log('📝 Creando archivo .env...');
  if (fs.existsSync('.env.example')) {
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ Archivo .env creado desde .env.example');
  } else {
    console.log('❌ No se encontró .env.example');
    process.exit(1);
  }
} else {
  console.log('✅ Archivo .env ya existe');
}

// Verificar Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.log('❌ Se requiere Node.js 18 o superior. Versión actual:', nodeVersion);
  process.exit(1);
}
console.log('✅ Node.js version:', nodeVersion);

// Instalar dependencias
console.log('\n📦 Instalando dependencias...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencias instaladas');
} catch (error) {
  console.log('❌ Error instalando dependencias:', error.message);
  process.exit(1);
}

// Generar cliente Prisma
console.log('\n🔧 Generando cliente Prisma...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente Prisma generado');
} catch (error) {
  console.log('❌ Error generando cliente Prisma:', error.message);
  process.exit(1);
}

// Crear directorio storage
console.log('\n📁 Creando directorio de almacenamiento...');
const storageDir = path.join(process.cwd(), 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
  console.log('✅ Directorio storage creado');
} else {
  console.log('✅ Directorio storage ya existe');
}

console.log('\n🎉 ¡Configuración completada!');
console.log('\n📋 Próximos pasos:');
console.log('1. Configura tu DATABASE_URL en el archivo .env');
console.log('2. Ejecuta: npm run db:push');
console.log('3. Ejecuta: npm run dev');
console.log('4. Abre http://localhost:3000 en tu navegador');
console.log('\n💡 Para más información, consulta el README.md');
