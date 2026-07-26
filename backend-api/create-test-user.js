require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    console.log('✅ Conectado a MongoDB');

    // Datos del usuario de prueba
    const testUserData = {
      firstName: 'Usuario',
      lastName: 'Prueba',
      username: 'usuarioprueba',
      email: 'test@eventconnect.com',
      password: 'Test123!@#',  // Cumple con los requisitos de seguridad
      acceptTerms: true,
      interests: ['tecnología', 'música', 'deportes']
    };

    // Verificar si ya existe
    const existingUser = await User.findOne({ 
      $or: [
        { email: testUserData.email }, 
        { username: testUserData.username }
      ] 
    });

    if (existingUser) {
      console.log('❌ Usuario de prueba ya existe:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Username: ${existingUser.username}`);
      return;
    }

    // Crear usuario
    const user = await User.create(testUserData);
    
    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${testUserData.password}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log('\n🔑 Credenciales para login:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${testUserData.password}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

createTestUser();