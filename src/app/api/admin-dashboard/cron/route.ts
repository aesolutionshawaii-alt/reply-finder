import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { getCronRuns } from '../../../../../lib/db';

export async function GET(request: Request) {
  try {
    await requireAdmin(request as any);

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');

    const cronRuns = await getCronRuns(limit);

    return NextResponse.json(cronRuns);
  } catch (error) {
    if (String(error).includes('Not authorized')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (String(error).includes('Not authenticated')) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    console.error('Error fetching cron runs:', error);
    return NextResponse.json({ error: 'Failed to fetch cron runs' }, { status: 500 });
  }
}
