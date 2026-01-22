import { neon } from '@neondatabase/serverless';

export function getDb() {
  const connectionString = process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Database URL not configured');
  }
  return neon(connectionString);
}

export interface User {
  id: number;
  email: string;
  google_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'canceled' | 'past_due';
  plan: 'free' | 'pro';
  delivery_hour_utc: number; // 0-23, default 16 (6am HST)
  created_at: Date;
  updated_at: Date;
}

export interface MonitoredAccount {
  id: number;
  user_id: number;
  handle: string;
  name: string | null;
  category: string | null;
  is_verified: boolean;
  profile_picture: string | null;
  created_at: Date;
}

export async function createUser(email: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO users (email, stripe_customer_id, stripe_subscription_id, status, plan)
    VALUES (${email}, ${stripeCustomerId}, ${stripeSubscriptionId}, 'active', 'pro')
    ON CONFLICT (email) DO UPDATE SET
      stripe_customer_id = ${stripeCustomerId},
      stripe_subscription_id = ${stripeSubscriptionId},
      status = 'active',
      plan = 'pro',
      updated_at = NOW()
    RETURNING *
  `;
  return result[0] as User;
}

export async function createFreeUser(email: string): Promise<User> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO users (email, status, plan)
    VALUES (${email}, 'active', 'free')
    ON CONFLICT (email) DO NOTHING
    RETURNING *
  `;
  if (result.length === 0) {
    // User already exists
    const existing = await getUserByEmail(email);
    if (existing) return existing;
    throw new Error('Failed to create user');
  }
  return result[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result[0] as User || null;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  return result[0] as User || null;
}

export async function createUserWithGoogle(email: string, googleId: string, name?: string): Promise<User> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO users (email, google_id, status, plan)
    VALUES (${email}, ${googleId}, 'active', 'free')
    ON CONFLICT (email) DO UPDATE SET
      google_id = ${googleId},
      updated_at = NOW()
    RETURNING *
  `;
  return result[0] as User;
}

export async function linkGoogleId(userId: number, googleId: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE users
    SET google_id = ${googleId}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE stripe_customer_id = ${customerId}`;
  return result[0] as User || null;
}

export async function updateUserStatus(stripeCustomerId: string, status: string): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE users
    SET status = ${status}, updated_at = NOW()
    WHERE stripe_customer_id = ${stripeCustomerId}
  `;
}

export async function getActiveUsers(): Promise<User[]> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE status = 'active'`;
  return result as User[];
}

export async function getActiveUsersByDeliveryHour(hourUtc: number): Promise<User[]> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM users
    WHERE status = 'active'
    AND (delivery_hour_utc = ${hourUtc} OR delivery_hour_utc IS NULL AND ${hourUtc} = 16)
  `;
  return result as User[];
}

export async function updateUserDeliveryTime(userId: number, deliveryHourUtc: number): Promise<void> {
  const sql = getDb();
  await sql`
    UPDATE users
    SET delivery_hour_utc = ${deliveryHourUtc}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function saveMonitoredAccounts(userId: number, accounts: { handle: string; name?: string; category?: string; isVerified?: boolean; profilePicture?: string }[]): Promise<void> {
  const sql = getDb();

  // Get existing accounts before deletion (for rollback if needed)
  const existingAccounts = await sql`SELECT * FROM monitored_accounts WHERE user_id = ${userId}`;

  try {
    // Clear existing accounts
    await sql`DELETE FROM monitored_accounts WHERE user_id = ${userId}`;

    // Insert new accounts
    for (const account of accounts) {
      await sql`
        INSERT INTO monitored_accounts (user_id, handle, name, category, is_verified, profile_picture)
        VALUES (${userId}, ${account.handle}, ${account.name || null}, ${account.category || null}, ${account.isVerified || false}, ${account.profilePicture || null})
      `;
    }
  } catch (error) {
    // Attempt to restore previous accounts on failure
    console.error('Failed to save accounts, attempting restore:', error);
    for (const account of existingAccounts) {
      try {
        await sql`
          INSERT INTO monitored_accounts (user_id, handle, name, category, is_verified, profile_picture)
          VALUES (${account.user_id}, ${account.handle}, ${account.name}, ${account.category}, ${account.is_verified || false}, ${account.profile_picture})
          ON CONFLICT (user_id, handle) DO NOTHING
        `;
      } catch (restoreError) {
        console.error('Failed to restore account:', restoreError);
      }
    }
    throw error;
  }
}

export async function getMonitoredAccounts(userId: number): Promise<MonitoredAccount[]> {
  const sql = getDb();
  const result = await sql`SELECT * FROM monitored_accounts WHERE user_id = ${userId}`;
  return result as MonitoredAccount[];
}

export async function logEmail(userId: number, opportunitiesCount: number, status: string): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO email_log (user_id, opportunities_count, status)
    VALUES (${userId}, ${opportunitiesCount}, ${status})
  `;
}

export interface UserProfile {
  id: number;
  user_id: number;
  display_name: string | null;
  bio: string | null;
  expertise: string | null;
  tone: string | null;
  example_replies: string | null;
  skip_political: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function saveUserProfile(
  userId: number,
  profile: { displayName?: string; bio?: string; expertise?: string; tone?: string; exampleReplies?: string; skipPolitical?: boolean }
): Promise<void> {
  const sql = getDb();
  const skipPolitical = profile.skipPolitical ?? true; // Default to true (skip political)
  await sql`
    INSERT INTO user_profiles (user_id, display_name, bio, expertise, tone, example_replies, skip_political)
    VALUES (${userId}, ${profile.displayName || null}, ${profile.bio || null}, ${profile.expertise || null}, ${profile.tone || null}, ${profile.exampleReplies || null}, ${skipPolitical})
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = ${profile.displayName || null},
      bio = ${profile.bio || null},
      expertise = ${profile.expertise || null},
      tone = ${profile.tone || null},
      example_replies = ${profile.exampleReplies || null},
      skip_political = ${skipPolitical},
      updated_at = NOW()
  `;
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
  return result[0] as UserProfile || null;
}

// ============ AUTH: Magic Links & Sessions ============

export interface MagicLink {
  id: number;
  email: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export async function createMagicLink(email: string, token: string, expiresInMinutes: number = 15): Promise<MagicLink> {
  const sql = getDb();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const result = await sql`
    INSERT INTO magic_links (email, token, expires_at)
    VALUES (${email}, ${token}, ${expiresAt})
    RETURNING *
  `;
  return result[0] as MagicLink;
}

export async function verifyMagicLink(token: string): Promise<string | null> {
  const sql = getDb();
  const result = await sql`
    UPDATE magic_links
    SET used = true
    WHERE token = ${token}
      AND used = false
      AND expires_at > NOW()
    RETURNING email
  `;
  return result[0]?.email || null;
}

export async function createSession(userId: number, token: string, expiresInDays: number = 30): Promise<Session> {
  const sql = getDb();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const result = await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt})
    RETURNING *
  `;
  return result[0] as Session;
}

export async function getSessionByToken(token: string): Promise<(Session & { email: string }) | null> {
  const sql = getDb();
  const result = await sql`
    SELECT s.*, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `;
  return result[0] as (Session & { email: string }) || null;
}

export async function deleteSession(token: string): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
}

export async function cleanupExpiredTokens(): Promise<void> {
  const sql = getDb();
  await sql`DELETE FROM magic_links WHERE expires_at < NOW()`;
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
}

// ============ ADMIN: User Management ============

export interface UserWithStats {
  id: number;
  email: string;
  plan: 'free' | 'pro';
  status: 'active' | 'canceled' | 'past_due';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: Date;
  updated_at: Date;
  accounts_count: number;
  profile_complete: boolean;
}

export async function getAllUsersWithStats(): Promise<UserWithStats[]> {
  const sql = getDb();
  const result = await sql`
    SELECT
      u.id,
      u.email,
      u.plan,
      u.status,
      u.stripe_customer_id,
      u.stripe_subscription_id,
      u.created_at,
      u.updated_at,
      COUNT(DISTINCT ma.id)::int as accounts_count,
      CASE WHEN up.id IS NOT NULL THEN true ELSE false END as profile_complete
    FROM users u
    LEFT JOIN monitored_accounts ma ON u.id = ma.user_id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    GROUP BY u.id, up.id
    ORDER BY u.created_at DESC
  `;
  return result as UserWithStats[];
}

export async function getUserById(id: number): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE id = ${id}`;
  return result[0] as User || null;
}

export async function updateUserPlan(userId: number, plan: 'free' | 'pro', status?: string): Promise<void> {
  const sql = getDb();
  if (status) {
    await sql`
      UPDATE users
      SET plan = ${plan}, status = ${status}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  } else {
    await sql`
      UPDATE users
      SET plan = ${plan}, updated_at = NOW()
      WHERE id = ${userId}
    `;
  }
}

export async function deleteUser(userId: number): Promise<void> {
  const sql = getDb();
  // Foreign keys with ON DELETE CASCADE will handle related records
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

export interface EmailLogEntry {
  id: number;
  user_id: number;
  user_email: string;
  sent_at: Date;
  opportunities_count: number;
  status: string;
}

export async function getEmailLogs(limit: number = 50): Promise<EmailLogEntry[]> {
  const sql = getDb();
  const result = await sql`
    SELECT
      el.id,
      el.user_id,
      u.email as user_email,
      el.sent_at,
      el.opportunities_count,
      el.status
    FROM email_log el
    JOIN users u ON el.user_id = u.id
    ORDER BY el.sent_at DESC
    LIMIT ${limit}
  `;
  return result as EmailLogEntry[];
}

// ============ ADMIN: Cron Monitoring ============

export interface CronRun {
  id: number;
  started_at: Date;
  completed_at: Date | null;
  hour_utc: number;
  users_triggered: number;
  users_sent: number;
  users_failed: number;
  users_skipped: number;
  status: 'running' | 'completed' | 'failed';
  error: string | null;
}

export async function createCronRun(hourUtc: number): Promise<number> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO cron_runs (hour_utc, status)
    VALUES (${hourUtc}, 'running')
    RETURNING id
  `;
  return result[0].id;
}

export async function updateCronRun(
  id: number,
  data: {
    usersTriggered?: number;
    usersSent?: number;
    usersFailed?: number;
    usersSkipped?: number;
    status?: 'running' | 'completed' | 'failed';
    error?: string;
  }
): Promise<void> {
  const sql = getDb();

  if (data.status === 'completed' || data.status === 'failed') {
    await sql`
      UPDATE cron_runs
      SET
        users_triggered = COALESCE(${data.usersTriggered ?? null}, users_triggered),
        users_sent = COALESCE(${data.usersSent ?? null}, users_sent),
        users_failed = COALESCE(${data.usersFailed ?? null}, users_failed),
        users_skipped = COALESCE(${data.usersSkipped ?? null}, users_skipped),
        status = ${data.status},
        error = ${data.error ?? null},
        completed_at = NOW()
      WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE cron_runs
      SET
        users_triggered = COALESCE(${data.usersTriggered ?? null}, users_triggered),
        users_sent = COALESCE(${data.usersSent ?? null}, users_sent),
        users_failed = COALESCE(${data.usersFailed ?? null}, users_failed),
        users_skipped = COALESCE(${data.usersSkipped ?? null}, users_skipped),
        status = COALESCE(${data.status ?? null}, status),
        error = COALESCE(${data.error ?? null}, error)
      WHERE id = ${id}
    `;
  }
}

export async function getCronRuns(limit: number = 20): Promise<CronRun[]> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM cron_runs
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
  return result as CronRun[];
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  recentSignups: number;
  activeUsers: number;
  canceledUsers: number;
  pastDueUsers: number;
}> {
  const sql = getDb();

  const [totals] = await sql`
    SELECT
      COUNT(*)::int as total_users,
      COUNT(*) FILTER (WHERE plan = 'pro')::int as pro_users,
      COUNT(*) FILTER (WHERE plan = 'free')::int as free_users,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int as recent_signups,
      COUNT(*) FILTER (WHERE status = 'active')::int as active_users,
      COUNT(*) FILTER (WHERE status = 'canceled')::int as canceled_users,
      COUNT(*) FILTER (WHERE status = 'past_due')::int as past_due_users
    FROM users
  `;

  return {
    totalUsers: totals.total_users,
    proUsers: totals.pro_users,
    freeUsers: totals.free_users,
    recentSignups: totals.recent_signups,
    activeUsers: totals.active_users,
    canceledUsers: totals.canceled_users,
    pastDueUsers: totals.past_due_users,
  };
}

// ============ TWEET CACHE ============

export interface TweetCache {
  id: number;
  handle: string;
  tweets: unknown[];
  fetched_at: Date;
}

const CACHE_TTL_MINUTES = 60; // Cache expires after 1 hour

export async function getCachedTweets(handle: string): Promise<unknown[] | null> {
  const sql = getDb();
  const cutoffTime = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000);
  const result = await sql`
    SELECT tweets, fetched_at
    FROM tweet_cache
    WHERE handle = ${handle.toLowerCase()}
      AND fetched_at > ${cutoffTime}
  `;

  if (result.length === 0) {
    return null; // Cache miss
  }

  return result[0].tweets as unknown[];
}

export async function setCachedTweets(handle: string, tweets: unknown[]): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO tweet_cache (handle, tweets, fetched_at)
    VALUES (${handle.toLowerCase()}, ${JSON.stringify(tweets)}, NOW())
    ON CONFLICT (handle) DO UPDATE SET
      tweets = ${JSON.stringify(tweets)},
      fetched_at = NOW()
  `;
}

export async function cleanupExpiredTweetCache(): Promise<number> {
  const sql = getDb();
  const cutoffTime = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000);
  const result = await sql`
    DELETE FROM tweet_cache
    WHERE fetched_at < ${cutoffTime}
    RETURNING id
  `;
  return result.length;
}
