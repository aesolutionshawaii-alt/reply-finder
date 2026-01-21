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
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'canceled' | 'past_due';
  created_at: Date;
  updated_at: Date;
}

export interface MonitoredAccount {
  id: number;
  user_id: number;
  handle: string;
  name: string | null;
  category: string | null;
  created_at: Date;
}

export async function createUser(email: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO users (email, stripe_customer_id, stripe_subscription_id, status)
    VALUES (${email}, ${stripeCustomerId}, ${stripeSubscriptionId}, 'active')
    ON CONFLICT (email) DO UPDATE SET
      stripe_customer_id = ${stripeCustomerId},
      stripe_subscription_id = ${stripeSubscriptionId},
      status = 'active',
      updated_at = NOW()
    RETURNING *
  `;
  return result[0] as User;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE email = ${email}`;
  return result[0] as User || null;
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

export async function saveMonitoredAccounts(userId: number, accounts: { handle: string; name?: string; category?: string }[]): Promise<void> {
  const sql = getDb();

  // Clear existing accounts
  await sql`DELETE FROM monitored_accounts WHERE user_id = ${userId}`;

  // Insert new accounts
  for (const account of accounts) {
    await sql`
      INSERT INTO monitored_accounts (user_id, handle, name, category)
      VALUES (${userId}, ${account.handle}, ${account.name || null}, ${account.category || null})
    `;
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
  created_at: Date;
  updated_at: Date;
}

export async function saveUserProfile(
  userId: number,
  profile: { displayName?: string; bio?: string; expertise?: string; tone?: string; exampleReplies?: string }
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO user_profiles (user_id, display_name, bio, expertise, tone, example_replies)
    VALUES (${userId}, ${profile.displayName || null}, ${profile.bio || null}, ${profile.expertise || null}, ${profile.tone || null}, ${profile.exampleReplies || null})
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = ${profile.displayName || null},
      bio = ${profile.bio || null},
      expertise = ${profile.expertise || null},
      tone = ${profile.tone || null},
      example_replies = ${profile.exampleReplies || null},
      updated_at = NOW()
  `;
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
  return result[0] as UserProfile || null;
}
