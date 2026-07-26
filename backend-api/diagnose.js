#!/usr/bin/env node

// Script de diagnóstico rápido para EventConnect Backend
const colors = require('colors');

console.log('🔍 EventConnect Backend - Diagnóstico Rápido'.blue.bold);
console.log('=' .repeat(50));

// Verificar variables de entorno críticas
console.log('\n📋 Variables de Entorno:'.yellow.bold);
require('dotenv').config();

const criticalEnvs = [
  'JWT_SECRET',
  'JWT_EXPIRES_IN', 
  'MONGODB_URI',
  'PORT',
  'NODE_ENV'
];

criticalEnvs.forEach(env => {
  const value = process.env[env];
  if (value) {
    if (env.includes('SECRET') || env.includes('KEY')) {
      console.log(`✅ ${env}: ${'*'.repeat(Math.min(value.length, 10))}...`.green);
    } else {
      console.log(`✅ ${env}: ${value}`.green);
    }
  } else {
    console.log(`❌ ${env}: NO CONFIGURADO`.red.bold);
  }
});

// Probar JWT
console.log('\n🔐 Prueba JWT:'.yellow.bold);
try {
  const jwt = require('jsonwebtoken');
  const testPayload = { id: 'test123' };
  const expiresIn = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '24h';
  
  const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn });
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  console.log(`✅ JWT generation: OK`.green);
  console.log(`✅ JWT verification: OK`.green);
  console.log(`✅ ExpiresIn: ${expiresIn}`.green);
} catch (error) {
  console.log(`❌ JWT Error: ${error.message}`.red.bold);
}

// Probar conexión MongoDB
console.log('\n🗄️  Prueba MongoDB:'.yellow.bold);
const mongoose = require('mongoose');

async function testMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB: Conexión exitosa'.green);
    await mongoose.disconnect();
  } catch (error) {
    console.log(`❌ MongoDB Error: ${error.message}`.red.bold);
  }
}

// Verificar puertos
console.log('\n🌐 Puerto del servidor:'.yellow.bold);
const port = process.env.PORT || 5000;
console.log(`✅ Puerto configurado: ${port}`.green);

// Ejecutar diagnósticos
testMongoDB().then(() => {
  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnóstico completado'.green.bold);
  console.log('💡 Si todos los elementos muestran ✅, el backend debería funcionar'.cyan);
  console.log('🚀 Ejecuta: npm run dev (en backend-api/)'.yellow);
  process.exit(0);
}).catch((error) => {
  console.log(`\n❌ Error en diagnóstico: ${error.message}`.red.bold);
  process.exit(1);
});
