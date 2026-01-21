import { NextRequest, NextResponse } from 'next/server';
import { verifyAndCreateSession, setSessionCookie } from '../../../../../lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/dashboard?error=invalid_link', request.url));
  }

  try {
    const result = await verifyAndCreateSession(token);

    if (!result) {
      return NextResponse.redirect(new URL('/dashboard?error=expired_link', request.url));
    }

    // Set the session cookie
    await setSessionCookie(result.sessionToken);

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err) {
    console.error('Verify magic link error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=verification_failed', request.url));
  }
}
