/**
 * Optimize Database Indexes for EventConnect 2.0
 * Adds missing performance indexes without conflicts
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function optimizeDatabaseIndexes() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('🚀 Optimizando índices de performance...');
    console.log('');
    
    // ============================================
    // OPTIMIZAR ÍNDICES PARA USUARIOS
    // ============================================
    console.log('👤 Optimizando índices para usuarios...');
    
    try {
      // Índice único para email (si no existe)
      await db.collection('users').createIndex(
        { email: 1 },
        { 
          name: "users_email_unique_optimized",
          unique: true,
          background: true,
          partialFilterExpression: { email: { $exists: true, $ne: null } }
        }
      );
      console.log('  ✅ Índice único para email optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice único para email ya existe');
      } else {
        console.log('  ⚠️ Error creando índice email:', error.message);
      }
    }
    
    try {
      // Índice único para username (si no existe)
      await db.collection('users').createIndex(
        { username: 1 },
        { 
          name: "users_username_unique_optimized",
          unique: true,
          background: true,
          partialFilterExpression: { username: { $exists: true, $ne: null } }
        }
      );
      console.log('  ✅ Índice único para username optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice único para username ya existe');
      } else {
        console.log('  ⚠️ Error creando índice username:', error.message);
      }
    }
    
    try {
      // Índice para búsquedas por intereses
      await db.collection('users').createIndex(
        { interests: 1 },
        { 
          name: "users_interests_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para intereses optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para intereses ya existe');
      } else {
        console.log('  ⚠️ Error creando índice intereses:', error.message);
      }
    }
    
    try {
      // Índice para usuarios activos
      await db.collection('users').createIndex(
        { isActive: 1, createdAt: -1 },
        { 
          name: "users_active_created_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para usuarios activos optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para usuarios activos ya existe');
      } else {
        console.log('  ⚠️ Error creando índice usuarios activos:', error.message);
      }
    }
    
    // ============================================
    // OPTIMIZAR ÍNDICES PARA MENSAJES
    // ============================================
    console.log('💬 Optimizando índices para mensajes...');
    
    try {
      // Índice compuesto para conversaciones (usando chatId en lugar de conversationId)
      await db.collection('messages').createIndex(
        { chatId: 1, createdAt: -1 },
        { 
          name: "messages_chat_created_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para conversaciones optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para conversaciones ya existe');
      } else {
        console.log('  ⚠️ Error creando índice conversaciones:', error.message);
      }
    }
    
    try {
      // Índice para mensajes no leídos
      await db.collection('messages').createIndex(
        { readBy: 1, createdAt: -1 },
        { 
          name: "messages_unread_optimized",
          background: true,
          partialFilterExpression: { readBy: { $exists: false } }
        }
      );
      console.log('  ✅ Índice para mensajes no leídos optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para mensajes no leídos ya existe');
      } else {
        console.log('  ⚠️ Error creando índice mensajes no leídos:', error.message);
      }
    }
    
    // ============================================
    // OPTIMIZAR ÍNDICES PARA POSTS
    // ============================================
    console.log('📝 Optimizando índices para posts...');
    
    try {
      // Índice para posts por autor (usando author en lugar de authorId)
      await db.collection('posts').createIndex(
        { author: 1, createdAt: -1 },
        { 
          name: "posts_author_created_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para posts por autor optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para posts por autor ya existe');
      } else {
        console.log('  ⚠️ Error creando índice posts por autor:', error.message);
      }
    }
    
    // ============================================
    // OPTIMIZAR ÍNDICES PARA COMENTARIOS
    // ============================================
    console.log('💭 Optimizando índices para comentarios...');
    
    try {
      // Índice para comentarios por post (usando event en lugar de postId)
      await db.collection('comments').createIndex(
        { event: 1, createdAt: 1 },
        { 
          name: "comments_event_created_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para comentarios por evento optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para comentarios por evento ya existe');
      } else {
        console.log('  ⚠️ Error creando índice comentarios por evento:', error.message);
      }
    }
    
    // ============================================
    // CREAR COLECCIÓN DE ANALYTICS SI NO EXISTE
    // ============================================
    console.log('📊 Configurando analytics...');
    
    try {
      // Verificar si la colección analytics existe
      const collections = await db.listCollections({ name: 'analytics' }).toArray();
      
      if (collections.length === 0) {
        // Crear colección analytics
        await db.createCollection('analytics');
        console.log('  ✅ Colección analytics creada');
        
        // Crear índices para analytics
        await db.collection('analytics').createIndex(
          { date: 1, metric: 1 },
          { 
            name: "analytics_date_metric",
            background: true 
          }
        );
        console.log('  ✅ Índice para analytics por fecha-métrica');
        
        await db.collection('analytics').createIndex(
          { userId: 1, eventType: 1, timestamp: -1 },
          { 
            name: "analytics_user_event_timestamp",
            background: true 
          }
        );
        console.log('  ✅ Índice para eventos de usuario');
      } else {
        console.log('  ℹ️ Colección analytics ya existe');
      }
    } catch (error) {
      console.log('  ⚠️ Error configurando analytics:', error.message);
    }
    
    // ============================================
    // OPTIMIZAR ÍNDICES PARA NOTIFICACIONES
    // ============================================
    console.log('🔔 Optimizando índices para notificaciones...');
    
    try {
      // Índice para notificaciones por usuario (usando recipient en lugar de userId)
      await db.collection('notifications').createIndex(
        { recipient: 1, read: 1, createdAt: -1 },
        { 
          name: "notifications_recipient_read_created_optimized",
          background: true 
        }
      );
      console.log('  ✅ Índice para notificaciones por usuario optimizado');
    } catch (error) {
      if (error.code === 85) {
        console.log('  ℹ️ Índice para notificaciones por usuario ya existe');
      } else {
        console.log('  ⚠️ Error creando índice notificaciones:', error.message);
      }
    }
    
    // ============================================
    // VERIFICAR OPTIMIZACIONES
    // ============================================
    console.log('');
    console.log('🔍 Verificando optimizaciones...');
    
    const collections = ['events', 'users', 'tribes', 'messages', 'posts', 'comments', 'analytics', 'notifications'];
    let totalIndexes = 0;
    let performanceIndexes = 0;
    
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        const count = indexes.length;
        totalIndexes += count;
        
        // Contar índices de performance
        const indexNames = indexes.map(idx => idx.name);
        if (indexNames.some(name => name.includes('location') && name.includes('2dsphere'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('category') && name.includes('date'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('email') && name.includes('unique'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('username') && name.includes('unique'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('interests'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('chat') && name.includes('created'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('author') && name.includes('created'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('event') && name.includes('created'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('recipient') && name.includes('read'))) performanceIndexes++;
        if (indexNames.some(name => name.includes('date') && name.includes('metric'))) performanceIndexes++;
        
      } catch (error) {
        // Colección no existe
      }
    }
    
    console.log('');
    console.log('📊 RESULTADOS DE OPTIMIZACIÓN:');
    console.log('===============================');
    console.log(`Total de índices: ${totalIndexes}`);
    console.log(`Índices de performance: ${performanceIndexes}`);
    console.log(`Cobertura de performance: ${Math.round((performanceIndexes / 15) * 100)}%`);
    console.log('');
    
    if (performanceIndexes >= 12) {
      console.log('🎉 ¡Excelente! La base de datos está completamente optimizada');
      console.log('✅ Performance esperada: Óptima');
    } else if (performanceIndexes >= 8) {
      console.log('✅ Buena optimización alcanzada');
      console.log('✅ Performance esperada: Buena');
    } else {
      console.log('⚠️ Optimización parcial completada');
      console.log('⚠️ Performance esperada: Mejorada');
    }
    
    console.log('');
    console.log('🚀 Base de datos optimizada para EventConnect 2.0!');
    
  } catch (error) {
    console.error('❌ Error optimizando índices:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  optimizeDatabaseIndexes();
}

module.exports = optimizeDatabaseIndexes;
