#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CONFIGURANDO VARIABLES DE ENTORNO - EventConnect\n');

// Configuración por defecto para desarrollo
const envConfig = {
  backend: {
    // Database
    MONGODB_URI: 'mongodb://localhost:27017/eventconnect',
    REDIS_URL: 'redis://localhost:6379',
    
    // JWT
    JWT_SECRET: 'eventconnect-super-secret-jwt-key-2024',
    JWT_EXPIRE: '7d',
    JWT_REFRESH_SECRET: 'eventconnect-super-secret-refresh-key-2024',
    JWT_REFRESH_EXPIRE: '30d',
    
    // Server
    NODE_ENV: 'development',
    PORT: '5000',
    
    // CORS
    CORS_ORIGIN: 'http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:19000',
    
    // Cloudinary (Configurar manualmente)
    CLOUDINARY_CLOUD_NAME: '',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: '',
    
    // Google Maps (Configurar manualmente)
    GOOGLE_MAPS_API_KEY: '',
    
    // Email SMTP (Configurar manualmente)
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: 'EventConnect <no-reply@eventconnect.com>',
    
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    
    // Analytics
    ANALYTICS_ENABLED: 'true'
  },
  
  mobile: {
    EXPO_PUBLIC_API_URL: 'http://localhost:5000/api',
    EXPO_PUBLIC_WS_URL: 'ws://localhost:5000',
    EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '',
    EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: '',
    EXPO_PUBLIC_ANALYTICS_ENABLED: 'true'
  },
  
  web: {
    NEXT_PUBLIC_API_URL: 'http://localhost:5000/api',
    NEXT_PUBLIC_WS_URL: 'ws://localhost:5000',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '',
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: '',
    NEXT_PUBLIC_ANALYTICS_ENABLED: 'true'
  }
};

// Función para crear archivo .env
function createEnvFile(directory, config, name) {
  const envPath = path.join(directory, '.env');
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  try {
    if (!fs.existsSync(directory)) {
      console.log(`❌ Directorio no encontrado: ${directory}`);
      return false;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ ${name}: .env creado en ${directory}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: Error creando .env - ${error.message}`);
    return false;
  }
}

// Crear archivos .env
console.log('📁 Creando archivos de configuración...\n');

const results = [
  createEnvFile('./backend-api', envConfig.backend, 'Backend'),
  createEnvFile('./mobile-app', envConfig.mobile, 'Mobile App'),
  createEnvFile('./web-frontend', envConfig.web, 'Web Frontend')
];

const success = results.filter(Boolean).length;
const total = results.length;

console.log('\n📊 RESUMEN:');
console.log(`✅ Configurados: ${success}/${total}`);

if (success > 0) {
  console.log('\n🔧 CONFIGURACIÓN MANUAL REQUERIDA:');
  console.log('1. Cloudinary (https://cloudinary.com):');
  console.log('   - CLOUDINARY_CLOUD_NAME');
  console.log('   - CLOUDINARY_API_KEY'); 
  console.log('   - CLOUDINARY_API_SECRET');
  console.log('\n2. Google Maps (https://console.cloud.google.com):');
  console.log('   - GOOGLE_MAPS_API_KEY');
  console.log('\n3. Email SMTP (opcional):');
  console.log('   - SMTP_USER');
  console.log('   - SMTP_PASS');
  console.log('\n⚠️  Edita los archivos .env manualmente para añadir estas claves.');
}

console.log('\n🎉 ¡Configuración completada!');






