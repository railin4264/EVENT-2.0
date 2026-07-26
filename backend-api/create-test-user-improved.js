// Script mejorado para crear usuario de prueba
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createTestUser() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    console.log('URI:', process.env.MONGODB_URI);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Datos del usuario de prueba
    const testUserData = {
      firstName: 'Usuario',
      lastName: 'Prueba',
      username: 'usuarioprueba',
      email: 'test@eventconnect.com',
      password: 'Test123!@#',  // Cumple con los requisitos de seguridad
      acceptTerms: true,
      birthDate: new Date('1990-01-01'),
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
      console.log(`   ID: ${existingUser._id}`);
      console.log(`   Creado: ${existingUser.createdAt}`);

      console.log('\n🔑 Credenciales para login:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Password: ${testUserData.password}`);
      return;
    }

    // Crear usuario
    const user = await User.create(testUserData);

    console.log('✅ Usuario de prueba creado exitosamente:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`   Intereses: ${user.interests.join(', ')}`);

    console.log('\n🔑 Credenciales para login:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${testUserData.password}`);

    console.log('\n📋 Para usar en el frontend:');
    console.log(`   1. Ve a http://localhost:3000/login`);
    console.log(`   2. Usa las credenciales de arriba`);
    console.log(`   3. Deberías poder loguearte sin problemas`);

  } catch (error) {
    console.error('❌ Error creando usuario:', error.message);
    if (error.errors) {
      console.log('\n📝 Errores de validación:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Verificar que las variables de entorno estén configuradas
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI no está configurado en .env');
  process.exit(1);
}

createTestUser();
