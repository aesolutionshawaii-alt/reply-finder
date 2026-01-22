import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export async function GET() {
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

    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        display_name VARCHAR(255),
        bio TEXT,
        expertise TEXT,
        tone VARCHAR(100),
        example_replies TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add skip_political column if it doesn't exist
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS skip_political BOOLEAN DEFAULT true
    `;

    // Add plan column if it doesn't exist (default to 'pro' for existing users)
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'pro'
    `;

    // Add delivery_hour_utc column (default 16 = 6am HST = 4pm UTC)
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS delivery_hour_utc INTEGER DEFAULT 16
    `;

    // Add google_id column for Google OAuth
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255)
    `;

    // Create index for google_id lookups
    await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;

    // Magic links for passwordless auth
    await sql`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Sessions for authenticated users
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Rate limiting table
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL,
        count INTEGER DEFAULT 1,
        window_start TIMESTAMP DEFAULT NOW(),
        UNIQUE(key)
      )
    `;

    // Cron runs table for monitoring
    await sql`
      CREATE TABLE IF NOT EXISTS cron_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        hour_utc INTEGER,
        users_triggered INTEGER DEFAULT 0,
        users_sent INTEGER DEFAULT 0,
        users_failed INTEGER DEFAULT 0,
        users_skipped INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'running',
        error TEXT
      )
    `;

    // Add verification status and profile picture to monitored accounts
    await sql`
      ALTER TABLE monitored_accounts
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
    `;
    await sql`
      ALTER TABLE monitored_accounts
      ADD COLUMN IF NOT EXISTS profile_picture TEXT
    `;

    // ============ VOICE LEARNING SYSTEM ============

    // Add voice learning columns to user_profiles
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS x_handle VARCHAR(255)
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS x_bio TEXT
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS positioning TEXT
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS voice_attributes JSONB DEFAULT '{}'
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS avoid_patterns TEXT[]
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS sample_tweets JSONB DEFAULT '[]'
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS sample_replies JSONB DEFAULT '[]'
    `;
    await sql`
      ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS voice_confidence INTEGER DEFAULT 0
    `;

    // Reply feedback table for tracking engagement
    await sql`
      CREATE TABLE IF NOT EXISTS reply_feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tweet_id VARCHAR(255),
        tweet_url TEXT,
        draft_reply TEXT,
        feedback_type VARCHAR(50),
        actual_reply_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_reply_feedback_user ON reply_feedback(user_id)`;

    // Tweet cache for reducing API calls
    await sql`
      CREATE TABLE IF NOT EXISTS tweet_cache (
        id SERIAL PRIMARY KEY,
        handle VARCHAR(255) UNIQUE NOT NULL,
        tweets JSONB NOT NULL,
        fetched_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_tweet_cache_handle ON tweet_cache(handle)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tweet_cache_fetched ON tweet_cache(fetched_at)`;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON cron_runs(started_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_monitored_accounts_user ON monitored_accounts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key)`;

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
