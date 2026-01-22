import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUserByGoogleId, createUserWithGoogle, linkGoogleId, createSession } from '../../../../../../lib/db';
import { generateToken } from '../../../../../../lib/auth';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name?: string;
  picture: string;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=google_denied', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?error=no_code', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Google OAuth not configured');
    return NextResponse.redirect(new URL('/dashboard?error=config_error', request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(new URL('/dashboard?error=token_failed', request.url));
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(new URL('/dashboard?error=userinfo_failed', request.url));
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email || !googleUser.verified_email) {
      return NextResponse.redirect(new URL('/dashboard?error=email_not_verified', request.url));
    }

    // Find or create user
    let user = await getUserByGoogleId(googleUser.id);

    if (!user) {
      // Check if user exists with this email
      user = await getUserByEmail(googleUser.email);

      if (user) {
        // Link Google ID to existing account
        await linkGoogleId(user.id, googleUser.id);
      } else {
        // Create new user with Google
        user = await createUserWithGoogle(googleUser.email, googleUser.id, googleUser.name);
      }
    }

    // Create session
    const sessionToken = generateToken();
    await createSession(user.id, sessionToken, 30);

    // Redirect to dashboard with cookie set on response
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('xs_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const errorMsg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.redirect(new URL(`/dashboard?error=callback_failed&detail=${encodeURIComponent(errorMsg)}`, request.url));
  }
}
