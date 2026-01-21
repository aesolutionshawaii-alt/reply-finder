import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '../../../../../lib/db';

// Temporary endpoint to manually create a user
// DELETE THIS after fixing the webhook issue
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const user = await createUser(email, 'manual', 'manual');
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
