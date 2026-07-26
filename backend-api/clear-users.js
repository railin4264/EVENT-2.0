require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function clearAllUsers() {
  try {
    console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los usuarios');
    console.log('🔍 Conectando a MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Contar usuarios antes
    const countBefore = await User.countDocuments();
    console.log(`📊 Usuarios antes de eliminar: ${countBefore}`);

    if (countBefore === 0) {
      console.log('❌ No hay usuarios para eliminar');
      return;
    }

    // Eliminar todos los usuarios
    const result = await User.deleteMany({});
    console.log(`🗑️  Usuarios eliminados: ${result.deletedCount}`);
    
    // Verificar que se eliminaron
    const countAfter = await User.countDocuments();
    console.log(`📊 Usuarios después de eliminar: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('✅ Base de datos limpia. Ahora puedes registrar nuevos usuarios.');
    } else {
      console.log('⚠️  Algunos usuarios no se eliminaron correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

clearAllUsers();
