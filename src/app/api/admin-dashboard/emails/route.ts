import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { getEmailLogs } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const emails = await getEmailLogs(Math.min(limit, 100));

    return NextResponse.json(emails.map(email => ({
      id: email.id,
      userId: email.user_id,
      userEmail: email.user_email,
      sentAt: email.sent_at,
      opportunitiesCount: email.opportunities_count,
      status: email.status,
    })));
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin emails error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
