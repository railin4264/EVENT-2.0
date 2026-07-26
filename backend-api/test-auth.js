require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function testAuth() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    console.log('✅ Conectado a MongoDB');

    // Buscar usuarios
    const users = await User.find({}, 'email username firstName lastName').limit(5);
    console.log('\n📊 Usuarios en la base de datos:');
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios. Ejecuta: node create-test-user.js');
      return;
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} | ${user.username} | ${user.firstName} ${user.lastName}`);
    });

    // Probar login con el primer usuario
    const testUser = users[0];
    console.log(`\n🔍 Probando autenticación con: ${testUser.email}`);
    
    // Simular el proceso de login del backend
    const userWithPassword = await User.findOne({ email: testUser.email }).select('+password');
    
    if (!userWithPassword) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado');
    console.log('Password hash exists:', !!userWithPassword.password);
    
    // Probar comparación de contraseña (necesitarías la contraseña real)
    // const isMatch = await userWithPassword.matchPassword('Test123!@#');
    // console.log('Password match:', isMatch);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testAuth();
