import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { getDb, getSessionByToken, getUserByEmail, createSession, createMagicLink, verifyMagicLink, deleteSession } from './db';
import { sendMagicLinkEmail } from './email';

const SESSION_COOKIE = 'xs_session';

// Generate a secure random token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Get session from request (checks cookie or Authorization header)
export async function getSession(request: NextRequest) {
  // Check Authorization header first (for API calls)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return getSessionByToken(token);
  }

  // Check cookie
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    return getSessionByToken(sessionToken);
  }

  return null;
}

// Require authentication - returns user data or throws
export async function requireAuth(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

// Send magic link to email
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  // Check if user exists
  const user = await getUserByEmail(email);
  if (!user) {
    // Don't reveal if user exists or not
    return { success: true };
  }

  const token = generateToken();
  await createMagicLink(email, token, 15); // 15 minutes

  const result = await sendMagicLinkEmail(email, token);
  return result;
}

// Verify magic link and create session
export async function verifyAndCreateSession(token: string): Promise<{ sessionToken: string; email: string } | null> {
  const email = await verifyMagicLink(token);
  if (!email) {
    return null;
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return null;
  }

  const sessionToken = generateToken();
  await createSession(user.id, sessionToken, 30); // 30 days

  return { sessionToken, email };
}

// Set session cookie
export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Logout
export async function logout(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) {
    await deleteSession(sessionToken);
  }
  await clearSessionCookie();
}

// ============ Rate Limiting ============

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const sql = getDb();
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  // Try to get existing rate limit record
  const existing = await sql`
    SELECT * FROM rate_limits
    WHERE key = ${key} AND window_start > ${windowStart}
  `;

  if (existing.length === 0) {
    // No recent record, create new one
    await sql`
      INSERT INTO rate_limits (key, count, window_start)
      VALUES (${key}, 1, NOW())
      ON CONFLICT (key) DO UPDATE SET count = 1, window_start = NOW()
    `;
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
    };
  }

  const record = existing[0];
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(new Date(record.window_start).getTime() + windowSeconds * 1000),
    };
  }

  // Increment count
  await sql`
    UPDATE rate_limits SET count = count + 1 WHERE key = ${key}
  `;

  return {
    allowed: true,
    remaining: limit - record.count - 1,
    resetAt: new Date(new Date(record.window_start).getTime() + windowSeconds * 1000),
  };
}

// Rate limit by IP
export function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

// ============ Admin Auth ============

export function isAdmin(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

export async function requireAdmin(request: NextRequest) {
  const session = await requireAuth(request);
  if (!isAdmin(session.email)) {
    throw new Error('Not authorized');
  }
  return session;
}
