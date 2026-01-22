import { NextRequest, NextResponse } from 'next/server';
import { verifyAndCreateSession } from '../../../../../lib/auth';

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

    // Redirect to dashboard with cookie set on response
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.set('xs_session', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Verify magic link error:', err);
    return NextResponse.redirect(new URL('/dashboard?error=verification_failed', request.url));
  }
}
