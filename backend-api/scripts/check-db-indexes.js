/**
 * Check Database Indexes for EventConnect 2.0
 * Verifies existing indexes and shows performance status
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkDatabaseIndexes() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect';
    await mongoose.connect(mongoUri);
    
    console.log('✅ Conectado a MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('📊 Verificando índices existentes...');
    console.log('');
    
    // ============================================
    // VERIFICAR ÍNDICES POR COLECCIÓN
    // ============================================
    const collections = [
      { name: 'events', description: 'Eventos' },
      { name: 'users', description: 'Usuarios' },
      { name: 'tribes', description: 'Tribus' },
      { name: 'messages', description: 'Mensajes' },
      { name: 'posts', description: 'Posts' },
      { name: 'comments', description: 'Comentarios' },
      { name: 'analytics', description: 'Analytics' },
      { name: 'notifications', description: 'Notificaciones' }
    ];
    
    let totalIndexes = 0;
    let performanceIndexes = 0;
    
    for (const collection of collections) {
      try {
        const indexes = await db.collection(collection.name).indexes();
        const count = indexes.length;
        totalIndexes += count;
        
        console.log(`📋 ${collection.description} (${collection.name}):`);
        console.log(`   Índices totales: ${count}`);
        
        // Verificar índices de performance críticos
        const indexNames = indexes.map(idx => idx.name);
        const criticalIndexes = [];
        
        if (collection.name === 'events') {
          if (indexNames.some(name => name.includes('location') && name.includes('2dsphere'))) {
            criticalIndexes.push('✅ Geospatial');
            performanceIndexes++;
          }
          if (indexNames.some(name => name.includes('category') && name.includes('date'))) {
            criticalIndexes.push('✅ Categoría-Fecha');
            performanceIndexes++;
          }
          if (indexNames.some(name => name.includes('text'))) {
            criticalIndexes.push('✅ Texto completo');
            performanceIndexes++;
          }
        }
        
        if (collection.name === 'users') {
          if (indexNames.some(name => name.includes('email') && name.includes('unique'))) {
            criticalIndexes.push('✅ Email único');
            performanceIndexes++;
          }
          if (indexNames.some(name => name.includes('username') && name.includes('unique'))) {
            criticalIndexes.push('✅ Username único');
            performanceIndexes++;
          }
          if (indexNames.some(name => name.includes('interests'))) {
            criticalIndexes.push('✅ Intereses');
            performanceIndexes++;
          }
        }
        
        if (collection.name === 'tribes') {
          if (indexNames.some(name => name.includes('location') && name.includes('2dsphere'))) {
            criticalIndexes.push('✅ Geospatial');
            performanceIndexes++;
          }
          if (indexNames.some(name => name.includes('members'))) {
            criticalIndexes.push('✅ Miembros');
            performanceIndexes++;
          }
        }
        
        if (collection.name === 'messages') {
          if (indexNames.some(name => name.includes('conversation') && name.includes('created'))) {
            criticalIndexes.push('✅ Conversación-Fecha');
            performanceIndexes++;
          }
        }
        
        if (criticalIndexes.length > 0) {
          console.log(`   Índices críticos: ${criticalIndexes.join(', ')}`);
        } else {
          console.log(`   ⚠️ Sin índices de performance críticos`);
        }
        
        // Mostrar todos los índices
        indexes.forEach(index => {
          const keyStr = Object.entries(index.key).map(([k, v]) => `${k}:${v}`).join(', ');
          console.log(`   - ${index.name}: {${keyStr}}`);
        });
        
        console.log('');
        
      } catch (error) {
        console.log(`⚠️ ${collection.description}: colección no existe`);
        console.log('');
      }
    }
    
    // ============================================
    // ESTADÍSTICAS GENERALES
    // ============================================
    console.log('📊 ESTADÍSTICAS DE PERFORMANCE:');
    console.log('================================');
    console.log(`Total de índices: ${totalIndexes}`);
    console.log(`Índices de performance: ${performanceIndexes}`);
    console.log(`Cobertura de performance: ${Math.round((performanceIndexes / 15) * 100)}%`);
    console.log('');
    
    // ============================================
    // VERIFICAR ESTADÍSTICAS DE COLECCIONES
    // ============================================
    console.log('📈 ESTADÍSTICAS DE COLECCIONES:');
    console.log('===============================');
    
    for (const collection of collections) {
      try {
        const stats = await db.collection(collection.name).stats();
        console.log(`${collection.description}:`);
        console.log(`  Documentos: ${stats.count.toLocaleString()}`);
        console.log(`  Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Índices: ${stats.nindexes}`);
        console.log(`  Tamaño índices: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
        console.log('');
      } catch (error) {
        // Colección no existe
      }
    }
    
    // ============================================
    // RECOMENDACIONES
    // ============================================
    console.log('💡 RECOMENDACIONES:');
    console.log('===================');
    
    if (performanceIndexes >= 12) {
      console.log('✅ Excelente! La base de datos está bien optimizada');
      console.log('✅ Performance esperada: Óptima');
    } else if (performanceIndexes >= 8) {
      console.log('⚠️ Buena optimización, pero se pueden mejorar algunos índices');
      console.log('⚠️ Performance esperada: Buena');
    } else {
      console.log('❌ Se recomienda crear más índices de performance');
      console.log('❌ Performance esperada: Puede ser lenta');
    }
    
    console.log('');
    console.log('🚀 Para optimizar completamente, ejecute:');
    console.log('   node scripts/setup-db-indexes.js');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error verificando índices:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  checkDatabaseIndexes();
}

module.exports = checkDatabaseIndexes;
