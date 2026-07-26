/**
 * MongoDB Performance Analysis Script for EventConnect 2.0
 * Analyzes query performance and provides optimization recommendations
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventconnect_dev';

async function analyzePerformance() {
  let client;

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB for performance analysis');

    const db = client.db();

    console.log('\n📊 Performance Analysis Report\n');

    // Test critical queries with explain
    const performanceTests = [
      {
        name: 'User Authentication Query',
        collection: 'users',
        query: { email: 'test@example.com', isActive: true },
        expectedIndex: 'active_users_email'
      },
      {
        name: 'Public Events by Date',
        collection: 'events',
        query: { status: 'published', isPrivate: false, startDate: { $gte: new Date() } },
        expectedIndex: 'public_events_by_date'
      },
      {
        name: 'Tribe Members Query',
        collection: 'tribes',
        query: { 'members.userId': 'user123' },
        expectedIndex: 'tribe_members'
      },
      {
        name: 'Recent Messages in Chat',
        collection: 'messages',
        query: { chatId: 'chat123' },
        sort: { createdAt: -1 },
        limit: 50,
        expectedIndex: 'messages_by_chat_recent'
      },
      {
        name: 'User Feed Posts',
        collection: 'posts',
        query: { isPublic: true },
        sort: { createdAt: -1 },
        limit: 20,
        expectedIndex: 'public_posts_feed'
      },
      {
        name: 'Unread Notifications',
        collection: 'notifications',
        query: { recipient: 'user123', isRead: false },
        sort: { createdAt: -1 },
        expectedIndex: 'unread_notifications'
      },
      {
        name: 'Geographic Event Search',
        collection: 'events',
        query: {
          'location.coordinates': {
            $near: {
              $geometry: { type: 'Point', coordinates: [-74.0059, 40.7128] },
              $maxDistance: 5000
            }
          },
          status: 'published'
        },
        expectedIndex: 'event_location_geo'
      },
      {
        name: 'Text Search in Events',
        collection: 'events',
        query: { $text: { $search: 'music concert' } },
        expectedIndex: 'event_text_search'
      }
    ];

    const results = [];

    for (const test of performanceTests) {
      try {
        console.log(`🔍 Testing: ${test.name}`);

        const collection = db.collection(test.collection);

        // Build query
        let queryPlan = collection.find(test.query);
        if (test.sort) {
          queryPlan = queryPlan.sort(test.sort);
        }
        if (test.limit) {
          queryPlan = queryPlan.limit(test.limit);
        }

        // Get execution plan
        const explain = await queryPlan.explain('executionStats');

        const stats = explain.executionStats;
        const winningPlan = explain.queryPlanner.winningPlan;

        const result = {
          testName: test.name,
          collection: test.collection,
          executionTimeMs: stats.executionTimeMs,
          totalDocsExamined: stats.totalDocsExamined,
          totalDocsReturned: stats.totalDocsReturned,
          indexUsed: getIndexName(winningPlan),
          expectedIndex: test.expectedIndex,
          isOptimized: stats.totalDocsExamined <= stats.totalDocsReturned * 1.1, // Allow 10% overhead
          stage: winningPlan.stage
        };

        results.push(result);

        // Display result
        const status = result.isOptimized ? '✅' : '⚠️';
        const indexStatus = result.indexUsed === result.expectedIndex ? '✅' : '❌';

        console.log(`   ${status} Execution: ${result.executionTimeMs}ms`);
        console.log(`   ${indexStatus} Index: ${result.indexUsed || 'NONE'} (expected: ${result.expectedIndex})`);
        console.log(`   📄 Docs examined: ${result.totalDocsExamined}, returned: ${result.totalDocsReturned}`);
        console.log('');

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        console.log('');
      }
    }

    // Performance summary
    console.log('\n📈 Performance Summary\n');

    const optimizedQueries = results.filter(r => r.isOptimized).length;
    const correctIndexes = results.filter(r => r.indexUsed === r.expectedIndex).length;

    console.log(`Optimized Queries: ${optimizedQueries}/${results.length}`);
    console.log(`Correct Indexes: ${correctIndexes}/${results.length}`);

    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length;
    console.log(`Average Execution Time: ${avgExecutionTime.toFixed(2)}ms`);

    // Recommendations
    console.log('\n💡 Optimization Recommendations\n');

    const slowQueries = results.filter(r => r.executionTimeMs > 100);
    if (slowQueries.length > 0) {
      console.log('🐌 Slow Queries (>100ms):');
      slowQueries.forEach(q => {
        console.log(`   - ${q.testName}: ${q.executionTimeMs}ms`);
      });
      console.log('');
    }

    const inefficientQueries = results.filter(r => !r.isOptimized);
    if (inefficientQueries.length > 0) {
      console.log('⚠️  Inefficient Queries:');
      inefficientQueries.forEach(q => {
        console.log(`   - ${q.testName}: examined ${q.totalDocsExamined} docs, returned ${q.totalDocsReturned}`);
      });
      console.log('');
    }

    const missingIndexes = results.filter(r => r.indexUsed !== r.expectedIndex);
    if (missingIndexes.length > 0) {
      console.log('🚫 Missing or Incorrect Indexes:');
      missingIndexes.forEach(q => {
        console.log(`   - ${q.testName}: using "${q.indexUsed || 'NONE'}", expected "${q.expectedIndex}"`);
      });
      console.log('');
    }

    // Collection stats
    console.log('\n📊 Collection Statistics\n');

    const collections = ['users', 'events', 'tribes', 'messages', 'posts', 'comments', 'notifications'];

    for (const collectionName of collections) {
      try {
        const stats = await db.collection(collectionName).stats();
        const indexStats = await db.collection(collectionName).aggregate([
          { $indexStats: {} }
        ]).toArray();

        console.log(`${collectionName}:`);
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Indexes: ${stats.nindexes}`);
        console.log(`   Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        // Most used indexes
        const sortedIndexes = indexStats
          .filter(idx => idx.name !== '_id_')
          .sort((a, b) => (b.accesses?.ops || 0) - (a.accesses?.ops || 0))
          .slice(0, 3);

        if (sortedIndexes.length > 0) {
          console.log('   Top indexes by usage:');
          sortedIndexes.forEach(idx => {
            console.log(`     - ${idx.name}: ${idx.accesses?.ops || 0} ops`);
          });
        }
        console.log('');
      } catch (error) {
        console.log(`   Error getting stats for ${collectionName}: ${error.message}`);
        console.log('');
      }
    }

    // Final recommendations
    console.log('\n🎯 Final Recommendations\n');

    if (avgExecutionTime > 50) {
      console.log('⚡ Consider implementing query result caching with Redis');
    }

    if (correctIndexes < results.length * 0.8) {
      console.log('📑 Run the mongodb-indexes.js script to create missing indexes');
    }

    console.log('📊 Monitor these metrics in production:');
    console.log('   - Query execution times');
    console.log('   - Index hit ratios');
    console.log('   - Collection growth rates');
    console.log('   - Memory usage patterns');

    return results;

  } catch (error) {
    console.error('❌ Error during performance analysis:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

function getIndexName(plan) {
  if (plan.indexName) {
    return plan.indexName;
  }

  if (plan.inputStage) {
    return getIndexName(plan.inputStage);
  }

  if (plan.inputStages) {
    for (const stage of plan.inputStages) {
      const indexName = getIndexName(stage);
      if (indexName) return indexName;
    }
  }

  return null;
}

// Generate performance report
async function generatePerformanceReport() {
  const results = await analyzePerformance();

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalQueries: results.length,
      optimizedQueries: results.filter(r => r.isOptimized).length,
      avgExecutionTime: results.reduce((sum, r) => sum + r.executionTimeMs, 0) / results.length
    },
    results: results
  };

  const fs = require('fs');
  const path = require('path');

  const reportPath = path.join(__dirname, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Performance report saved to: ${reportPath}`);

  return report;
}

// Run the script
if (require.main === module) {
  analyzePerformance()
    .then(() => {
      console.log('\n🎉 Performance analysis completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Performance analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzePerformance, generatePerformanceReport };