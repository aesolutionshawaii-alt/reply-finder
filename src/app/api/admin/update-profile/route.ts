import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveUserProfile } from '../../../../../lib/db';

// Temporary endpoint to update profile for existing users
// Usage: POST /api/admin/update-profile
// Body: { email, displayName, bio, expertise, tone, exampleReplies }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName, bio, expertise, tone, exampleReplies } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await saveUserProfile(user.id, {
      displayName,
      bio,
      expertise,
      tone,
      exampleReplies,
    });

    return NextResponse.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
