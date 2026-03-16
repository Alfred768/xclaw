import pg from 'pg';

const { Client } = pg;

async function migrate() {
  const client = new Client({
    host: 'db.zpeiuaojlprxdlakmnxg.supabase.co',
    port: 5432,
    user: 'cli_login_postgres',
    password: 'rMcNQarTvXOgckjjkTmgpYelpyXCsLqH',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');

    const sql = `
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
    `;

    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration completed successfully!');

    // Verify the columns exist
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_profiles'
      AND column_name IN ('is_trial', 'trial_ends_at', 'subscription_ends_at');
    `);

    console.log('Verified columns:', result.rows);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
