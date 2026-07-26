require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function removeSpecificUser() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ Por favor proporciona un email');
    console.log('💡 Uso: node remove-user.js email@ejemplo.com');
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando usuario con email: ${email}`);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Buscar el usuario
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ No se encontró usuario con email: ${email}`);
      return;
    }

    console.log(`👤 Usuario encontrado:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Nombre: ${user.firstName} ${user.lastName}`);
    console.log(`   Creado: ${user.createdAt}`);

    // Eliminar el usuario
    await User.findOneAndDelete({ email });
    console.log(`🗑️  Usuario eliminado: ${email}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

removeSpecificUser();
