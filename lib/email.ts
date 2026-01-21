import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface ReplyOpportunity {
  author: string;
  authorName: string;
  text: string;
  url: string;
  likes: number;
  retweets: number;
  draftReply?: string;
}

export async function sendDigestEmail(
  to: string,
  opportunities: ReplyOpportunity[]
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();

  const opportunitiesHtml = opportunities
    .map(
      (opp, i) => `
      <div style="margin-bottom: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <div style="font-weight: 600; margin-bottom: 8px;">
          ${i + 1}. ${opp.authorName} (@${opp.author})
        </div>
        <div style="color: #374151; margin-bottom: 12px; white-space: pre-wrap;">
          ${opp.text.substring(0, 280)}${opp.text.length > 280 ? '...' : ''}
        </div>
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">
          ${opp.likes} likes · ${opp.retweets} retweets
        </div>
        ${opp.draftReply ? `
        <div style="margin-bottom: 12px; padding: 12px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 4px;">
          <div style="font-size: 12px; font-weight: 600; color: #059669; margin-bottom: 6px;">YOUR DRAFT REPLY:</div>
          <div style="color: #065f46; white-space: pre-wrap;">${opp.draftReply}</div>
        </div>
        ` : ''}
        <a href="${opp.url}" style="display: inline-block; background: #1d9bf0; color: white; padding: 8px 16px; border-radius: 20px; text-decoration: none; font-weight: 500;">
          Open & Reply →
        </a>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">Your Daily Reply Opportunities</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">
          ${opportunities.length} opportunities found from your monitored accounts
        </p>

        ${opportunitiesHtml}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <p style="font-size: 14px; color: #6b7280;">
          You're receiving this because you subscribed to XeroScroll.
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
        </p>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'XeroScroll <onboarding@resend.dev>',
      to,
      subject: `${opportunities.length} reply opportunities for today`,
      html,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
