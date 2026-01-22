import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { getAdminStats } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const stats = await getAdminStats();
    const mrr = stats.proUsers * 29;

    return NextResponse.json({
      totalUsers: stats.totalUsers,
      proUsers: stats.proUsers,
      freeUsers: stats.freeUsers,
      mrr,
      recentSignups: stats.recentSignups,
      byStatus: {
        active: stats.activeUsers,
        canceled: stats.canceledUsers,
        past_due: stats.pastDueUsers,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
