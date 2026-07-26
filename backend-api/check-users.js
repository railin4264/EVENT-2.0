require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUsers() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Obtener todos los usuarios
    const users = await User.find({}, 'username email firstName lastName createdAt');
    
    console.log('\n📊 USUARIOS EXISTENTES:');
    console.log('=' .repeat(60));
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
        console.log(`   Creado: ${user.createdAt}`);
        console.log('   ' + '-'.repeat(40));
      });
      
      console.log(`\n📈 Total de usuarios: ${users.length}`);
    }
    
    console.log('\n🛠️  OPCIONES:');
    console.log('1. Para eliminar TODOS los usuarios (CUIDADO): node clear-users.js');
    console.log('2. Para eliminar un usuario específico: node remove-user.js email@ejemplo.com');
    console.log('3. Para crear un usuario de prueba: node create-test-user.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

checkUsers();
