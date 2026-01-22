import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

// One-time fix endpoint - delete after use
export async function POST(request: NextRequest) {
  try {
    const { email, secret } = await request.json();

    // Simple protection
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      UPDATE users
      SET plan = 'free',
          stripe_customer_id = NULL,
          stripe_subscription_id = NULL,
          updated_at = NOW()
      WHERE email = ${email}
    `;

    return NextResponse.json({ success: true, message: `Reset ${email} to free plan` });
  } catch (err) {
    console.error('Fix account error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
