require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createDemoUser() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect');
    console.log('✅ Conectado a MongoDB');

    // Datos del usuario demo
    const demoUserData = {
      firstName: 'Demo',
      lastName: 'User',
      username: 'demouser',
      email: 'demo@eventconnect.com',
      password: 'Demo123!',  // Contraseña fácil de recordar
      acceptTerms: true,
      interests: ['tecnología', 'música', 'networking'],
      birthDate: new Date('1990-01-01')
    };

    // Eliminar usuario demo si ya existe
    await User.deleteOne({ email: demoUserData.email });
    await User.deleteOne({ username: demoUserData.username });

    // Crear usuario demo
    const user = await User.create(demoUserData);

    console.log('\n🎉 ¡Usuario Demo creado exitosamente!');
    console.log('============================================');
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Username: ${user.username}`);
    console.log(`🔑 Password: ${demoUserData.password}`);
    console.log(`👨‍💼 Nombre: ${user.firstName} ${user.lastName}`);
    console.log('============================================');
    console.log('\n🚀 PARA PROBAR LA APLICACIÓN:');
    console.log('1. Ve a: http://localhost:3000/login');
    console.log(`2. Email: ${user.email}`);
    console.log(`3. Password: ${demoUserData.password}`);
    console.log('\n✨ ¡Disfruta probando EventConnect!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

createDemoUser();