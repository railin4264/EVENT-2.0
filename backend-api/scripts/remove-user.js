#!/usr/bin/env node

/**
 * Script para eliminar un usuario específico de la base de datos
 * Uso: node scripts/remove-user.js <email>
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function removeUser(email) {
  try {
    if (!email) {
      console.error('❌ Error: Debes proporcionar un email');
      console.log('Uso: node scripts/remove-user.js <email>');
      process.exit(1);
    }

    console.log('🔍 Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    
    console.log('✅ Conectado a MongoDB');
    
    // Buscar el usuario
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ No se encontró usuario con email: ${email}`);
      process.exit(1);
    }
    
    console.log(`\n👤 Usuario encontrado:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username || 'N/A'}`);
    console.log(`   Nombre: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
    console.log(`   Creado: ${user.createdAt.toLocaleString()}`);
    
    // Eliminar el usuario
    const deletedUser = await User.findOneAndDelete({ email });
    
    if (deletedUser) {
      console.log(`\n✅ Usuario eliminado exitosamente: ${deletedUser.email}`);
    } else {
      console.log(`\n❌ Error al eliminar usuario: ${email}`);
    }
    
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
  const email = process.argv[2];
  removeUser(email);
}

module.exports = removeUser;
