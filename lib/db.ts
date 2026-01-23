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
  if (result.length === 0) return null;
  return result[0] as User;
}

export async function getUserByGoogleId(googleId: string): Promise<User | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM users WHERE google_id = ${googleId}`;
  if (result.length === 0) return null;
  return result[0] as User;
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
  if (result.length === 0) return null;
  return result[0] as User;
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

// ============ VOICE LEARNING SYSTEM ============

export interface VoiceAttributes {
  conversationStyle?: 'celebratory' | 'curious' | 'relatable' | 'analytical';
  disagreementApproach?: 'direct' | 'nuanced' | 'questioning' | 'agreeing';
  valueAddStyle?: 'tactical' | 'encouraging' | 'reframing' | 'storytelling';
  humorLevel?: 'sarcastic' | 'factual' | 'self-deprecating' | 'none';
  expertiseDisplay?: 'credentialed' | 'insight-focused' | 'questioning' | 'curator';
}

export type AvoidPattern =
  | 'hype_words'
  | 'ending_questions'
  | 'self_promotion'
  | 'corporate_jargon'
  | 'emojis'
  | 'hashtags'
  | 'generic_agreement'
  | 'unsolicited_advice';

export interface SampleTweet {
  id: string;
  text: string;
  created_at: string;
}

export interface SampleReply {
  id: string;
  text: string;
  in_reply_to_id?: string;
  created_at: string;
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
  // Voice learning fields
  x_handle: string | null;
  x_bio: string | null;
  positioning: string | null;
  voice_attributes: VoiceAttributes;
  avoid_patterns: AvoidPattern[];
  sample_tweets: SampleTweet[];
  sample_replies: SampleReply[];
  voice_confidence: number;
  created_at: Date;
  updated_at: Date;
}

export interface SaveUserProfileInput {
  displayName?: string;
  bio?: string;
  expertise?: string;
  tone?: string;
  exampleReplies?: string;
  skipPolitical?: boolean;
  // Voice learning fields
  xHandle?: string;
  xBio?: string;
  positioning?: string;
  voiceAttributes?: VoiceAttributes;
  avoidPatterns?: AvoidPattern[];
  sampleTweets?: SampleTweet[];
  sampleReplies?: SampleReply[];
  voiceConfidence?: number;
}

export async function saveUserProfile(
  userId: number,
  profile: SaveUserProfileInput
): Promise<void> {
  const sql = getDb();
  const skipPolitical = profile.skipPolitical ?? true; // Default to true (skip political)

  // Calculate voice confidence if not provided
  const voiceConfidence = profile.voiceConfidence ?? calculateVoiceConfidence(profile);

  await sql`
    INSERT INTO user_profiles (
      user_id, display_name, bio, expertise, tone, example_replies, skip_political,
      x_handle, x_bio, positioning, voice_attributes, avoid_patterns, sample_tweets, sample_replies, voice_confidence
    )
    VALUES (
      ${userId},
      ${profile.displayName || null},
      ${profile.bio || null},
      ${profile.expertise || null},
      ${profile.tone || null},
      ${profile.exampleReplies || null},
      ${skipPolitical},
      ${profile.xHandle || null},
      ${profile.xBio || null},
      ${profile.positioning || null},
      ${JSON.stringify(profile.voiceAttributes || {})},
      ${profile.avoidPatterns || []},
      ${JSON.stringify(profile.sampleTweets || [])},
      ${JSON.stringify(profile.sampleReplies || [])},
      ${voiceConfidence}
    )
    ON CONFLICT (user_id) DO UPDATE SET
      display_name = COALESCE(${profile.displayName || null}, user_profiles.display_name),
      bio = COALESCE(${profile.bio || null}, user_profiles.bio),
      expertise = COALESCE(${profile.expertise || null}, user_profiles.expertise),
      tone = COALESCE(${profile.tone || null}, user_profiles.tone),
      example_replies = COALESCE(${profile.exampleReplies || null}, user_profiles.example_replies),
      skip_political = ${skipPolitical},
      x_handle = COALESCE(${profile.xHandle || null}, user_profiles.x_handle),
      x_bio = COALESCE(${profile.xBio || null}, user_profiles.x_bio),
      positioning = COALESCE(${profile.positioning || null}, user_profiles.positioning),
      voice_attributes = CASE
        WHEN ${profile.voiceAttributes !== undefined} THEN ${JSON.stringify(profile.voiceAttributes || {})}::jsonb
        ELSE user_profiles.voice_attributes
      END,
      avoid_patterns = CASE
        WHEN ${profile.avoidPatterns !== undefined} THEN ${profile.avoidPatterns || []}::text[]
        ELSE user_profiles.avoid_patterns
      END,
      sample_tweets = CASE
        WHEN ${profile.sampleTweets !== undefined} THEN ${JSON.stringify(profile.sampleTweets || [])}::jsonb
        ELSE user_profiles.sample_tweets
      END,
      sample_replies = CASE
        WHEN ${profile.sampleReplies !== undefined} THEN ${JSON.stringify(profile.sampleReplies || [])}::jsonb
        ELSE user_profiles.sample_replies
      END,
      voice_confidence = ${voiceConfidence},
      updated_at = NOW()
  `;
}

// Calculate voice confidence score (0-100)
export function calculateVoiceConfidence(profile: SaveUserProfileInput): number {
  let score = 0;

  // Basic profile (name, bio, tone): 25 pts
  if (profile.displayName) score += 8;
  if (profile.bio) score += 10;
  if (profile.tone) score += 7;

  // Voice picker complete: 25 pts
  if (profile.voiceAttributes) {
    const attrs = profile.voiceAttributes;
    if (attrs.conversationStyle) score += 5;
    if (attrs.disagreementApproach) score += 5;
    if (attrs.valueAddStyle) score += 5;
    if (attrs.humorLevel) score += 5;
    if (attrs.expertiseDisplay) score += 5;
  }

  // Positioning + anti-patterns: 15 pts
  if (profile.positioning) score += 10;
  if (profile.avoidPatterns && profile.avoidPatterns.length > 0) score += 5;

  // X handle with bio: 10 pts
  if (profile.xHandle) score += 5;
  if (profile.xBio) score += 5;

  // Sample replies: 20 pts
  if (profile.sampleReplies && profile.sampleReplies.length > 0) {
    score += Math.min(20, profile.sampleReplies.length * 5);
  } else if (profile.exampleReplies) {
    score += 10; // Legacy example replies field
  }

  return Math.min(100, score);
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const sql = getDb();
  const result = await sql`SELECT * FROM user_profiles WHERE user_id = ${userId}`;
  if (result.length === 0) return null;
  return result[0] as UserProfile;
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
  if (result.length === 0) return null;
  return result[0] as (Session & { email: string });
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
  if (result.length === 0) return null;
  return result[0] as User;
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

// ============ REPLY FEEDBACK ============

export interface ReplyFeedback {
  id: number;
  user_id: number;
  tweet_id: string;
  tweet_url: string | null;
  draft_reply: string;
  feedback_type: 'copied' | 'used' | 'skipped' | 'edited';
  actual_reply_text: string | null;
  created_at: Date;
}

export async function saveReplyFeedback(
  userId: number,
  tweetId: string,
  tweetUrl: string | null,
  draftReply: string,
  feedbackType: 'copied' | 'used' | 'skipped' | 'edited',
  actualReplyText?: string
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO reply_feedback (user_id, tweet_id, tweet_url, draft_reply, feedback_type, actual_reply_text)
    VALUES (${userId}, ${tweetId}, ${tweetUrl}, ${draftReply}, ${feedbackType}, ${actualReplyText || null})
  `;
}

export async function getReplyFeedback(userId: number, limit: number = 50): Promise<ReplyFeedback[]> {
  const sql = getDb();
  const result = await sql`
    SELECT * FROM reply_feedback
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return result as ReplyFeedback[];
}

export async function getReplyFeedbackStats(userId: number): Promise<{
  total: number;
  copied: number;
  used: number;
  skipped: number;
  edited: number;
}> {
  const sql = getDb();
  const [result] = await sql`
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE feedback_type = 'copied')::int as copied,
      COUNT(*) FILTER (WHERE feedback_type = 'used')::int as used,
      COUNT(*) FILTER (WHERE feedback_type = 'skipped')::int as skipped,
      COUNT(*) FILTER (WHERE feedback_type = 'edited')::int as edited
    FROM reply_feedback
    WHERE user_id = ${userId}
  `;
  return {
    total: result.total,
    copied: result.copied,
    used: result.used,
    skipped: result.skipped,
    edited: result.edited,
  };
}

// Update voice confidence after feedback (Phase 3)
export async function updateVoiceConfidenceFromFeedback(userId: number): Promise<void> {
  const sql = getDb();
  const stats = await getReplyFeedbackStats(userId);

  // Add up to 5 points based on feedback data
  if (stats.total >= 10) {
    const currentProfile = await getUserProfile(userId);
    if (currentProfile) {
      const feedbackBonus = Math.min(5, Math.floor(stats.used / 5));
      const newConfidence = Math.min(100, currentProfile.voice_confidence + feedbackBonus);
      await sql`
        UPDATE user_profiles
        SET voice_confidence = ${newConfidence}, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }
  }
}

// ============ SENT TWEETS TRACKING ============
// Prevents duplicate tweets from appearing in consecutive emails

export interface SentTweet {
  id: number;
  user_id: number;
  tweet_id: string;
  sent_at: Date;
}

/**
 * Save tweet IDs that were sent to a user
 * @param userId - The user's ID
 * @param tweetIds - Array of tweet IDs that were included in the email
 */
export async function saveSentTweets(userId: number, tweetIds: string[]): Promise<void> {
  if (tweetIds.length === 0) return;

  const sql = getDb();
  for (const tweetId of tweetIds) {
    await sql`
      INSERT INTO sent_tweets (user_id, tweet_id)
      VALUES (${userId}, ${tweetId})
      ON CONFLICT (user_id, tweet_id) DO UPDATE SET sent_at = NOW()
    `;
  }
}

/**
 * Get tweet IDs that were recently sent to a user (last 7 days)
 * @param userId - The user's ID
 * @returns Array of tweet IDs
 */
export async function getSentTweetIds(userId: number): Promise<string[]> {
  const sql = getDb();
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const result = await sql`
    SELECT tweet_id FROM sent_tweets
    WHERE user_id = ${userId}
      AND sent_at > ${cutoffDate}
  `;

  return result.map((row) => row.tweet_id as string);
}

/**
 * Clean up old sent tweet records (older than 7 days)
 * Call this periodically to keep the table small
 */
export async function cleanupOldSentTweets(): Promise<number> {
  const sql = getDb();
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await sql`
    DELETE FROM sent_tweets
    WHERE sent_at < ${cutoffDate}
    RETURNING id
  `;

  return result.length;
}
