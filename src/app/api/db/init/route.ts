import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export async function GET() {
  // Debug: check if env var exists
  const hasPostgresUrl = !!process.env.POSTGRES_URL;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;

  if (!hasPostgresUrl && !hasDatabaseUrl) {
    return NextResponse.json({
      error: 'No database URL found',
      debug: {
        POSTGRES_URL: hasPostgresUrl,
        DATABASE_URL: hasDatabaseUrl,
        availableEnvKeys: Object.keys(process.env).filter(k => k.includes('PG') || k.includes('POSTGRES') || k.includes('DATABASE'))
      }
    }, { status: 500 });
  }

  try {
    const sql = getDb();

    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS monitored_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        handle VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, handle)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS email_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        sent_at TIMESTAMP DEFAULT NOW(),
        opportunities_count INTEGER,
        status VARCHAR(50)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_monitored_accounts_user ON monitored_accounts(user_id)`;

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (err) {
    console.error('DB init error:', err);
    return NextResponse.json(
      { error: 'Failed to initialize database', details: String(err) },
      { status: 500 }
    );
  }
}
