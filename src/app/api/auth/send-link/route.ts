import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink, checkRateLimit, getClientIP } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Rate limit: 5 attempts per email per 15 minutes
    const emailLimit = await checkRateLimit(`magic:${email.toLowerCase()}`, 5, 900);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Rate limit: 20 attempts per IP per 15 minutes
    const ip = getClientIP(request);
    const ipLimit = await checkRateLimit(`magic:ip:${ip}`, 20, 900);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await sendMagicLink(email.toLowerCase().trim());

    // Always return success to avoid revealing if email exists
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a sign-in link has been sent.',
    });
  } catch (err) {
    console.error('Send magic link error:', err);
    return NextResponse.json({ error: 'Failed to send link' }, { status: 500 });
  }
}
