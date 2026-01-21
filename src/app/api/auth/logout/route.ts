import { NextRequest, NextResponse } from 'next/server';
import { logout } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    await logout(request);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
