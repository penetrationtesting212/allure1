require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testRepositories() {
  try {
    console.log('Testing repositories query...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Try to query repositories with a sample user ID
    const result = await client.query(`
      SELECT * FROM test_data_repositories 
      WHERE user_id = 1 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${result.rows.length} repositories for user_id = 1`);
    
    if (result.rows.length > 0) {
      console.log('Sample repository:', result.rows[0]);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Repositories query failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testRepositories();