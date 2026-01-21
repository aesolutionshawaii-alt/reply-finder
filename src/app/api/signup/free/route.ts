import { NextRequest, NextResponse } from 'next/server';
import { createFreeUser, getUserByEmail } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      // User exists - just let them log in
      return NextResponse.json({
        success: true,
        message: 'Welcome back',
        isExisting: true,
        plan: existing.plan
      });
    }

    // Create new free user
    const user = await createFreeUser(email);

    return NextResponse.json({
      success: true,
      message: 'Account created',
      isExisting: false,
      plan: user.plan
    });
  } catch (err) {
    console.error('Free signup error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
