#!/usr/bin/env node

/**
 * Script para verificar usuarios existentes en la base de datos
 * Uso: node scripts/check-existing-users.js
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function checkExistingUsers() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    
    console.log('✅ Conectado a MongoDB');
    
    const users = await User.find({}, 'username email firstName lastName createdAt').sort({ createdAt: -1 });
    
    console.log('\n📋 USUARIOS EXISTENTES:');
    console.log('='.repeat(80));
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Username: ${user.username || 'N/A'}`);
        console.log(`   Nombre: ${user.firstName || 'N/A'} ${user.lastName || 'N/A'}`);
        console.log(`   Creado: ${user.createdAt.toLocaleString()}`);
        console.log('-'.repeat(40));
      });
    }
    
    console.log(`\n📊 Total usuarios: ${users.length}`);
    
    // Verificar usuarios duplicados
    const emailCounts = {};
    const usernameCounts = {};
    
    users.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
      if (user.username) {
        usernameCounts[user.username] = (usernameCounts[user.username] || 0) + 1;
      }
    });
    
    const duplicateEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
    const duplicateUsernames = Object.entries(usernameCounts).filter(([username, count]) => count > 1);
    
    if (duplicateEmails.length > 0) {
      console.log('\n⚠️  EMAILS DUPLICADOS:');
      duplicateEmails.forEach(([email, count]) => {
        console.log(`   ${email}: ${count} veces`);
      });
    }
    
    if (duplicateUsernames.length > 0) {
      console.log('\n⚠️  USERNAMES DUPLICADOS:');
      duplicateUsernames.forEach(([username, count]) => {
        console.log(`   ${username}: ${count} veces`);
      });
    }
    
    if (duplicateEmails.length === 0 && duplicateUsernames.length === 0) {
      console.log('\n✅ No hay duplicados encontrados');
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
  checkExistingUsers();
}

module.exports = checkExistingUsers;
