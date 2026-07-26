#!/usr/bin/env node

/**
 * Script para crear un usuario de prueba único
 * Uso: node scripts/create-test-user.js
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    
    console.log('✅ Conectado a MongoDB');
    
    // Generar timestamp único para evitar duplicados
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`,
      email: `testuser${timestamp}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      interests: ['tecnologia', 'eventos'],
      bio: 'Usuario de prueba para EventConnect'
    };
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ email: testUser.email }, { username: testUser.username }] 
    });
    
    if (existingUser) {
      console.log('❌ El usuario ya existe');
      process.exit(1);
    }
    
    // Crear el usuario
    const user = await User.create(testUser);
    
    console.log('\n✅ USUARIO DE PRUEBA CREADO:');
    console.log('='.repeat(50));
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Username: ${user.username}`);
    console.log(`🔑 Password: Test123!`);
    console.log(`👨‍💼 Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`🆔 ID: ${user._id}`);
    console.log(`📅 Creado: ${user.createdAt.toLocaleString()}`);
    console.log('='.repeat(50));
    
    console.log('\n🚀 INSTRUCCIONES:');
    console.log('1. Abre el navegador en http://localhost:3000');
    console.log('2. Haz clic en "Iniciar sesión"');
    console.log('3. Usa las credenciales mostradas arriba');
    console.log('4. ¡Explora la aplicación!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Conexión a la base de datos cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createTestUser();
}

module.exports = createTestUser;
