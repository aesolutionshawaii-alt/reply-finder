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

// Send magic link email for passwordless auth
export async function sendMagicLinkEmail(
  to: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to XeroScroll</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                <!-- Header -->
                <tr>
                  <td style="background: #000000; border-radius: 12px 12px 0 0; padding: 24px 32px;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff;">⚡ XeroScroll</span>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="background: #ffffff; padding: 32px; border-radius: 0 0 12px 12px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #111827;">
                      Sign in to XeroScroll
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #6b7280;">
                      Click the button below to sign in. This link expires in 15 minutes.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background: #000000; border-radius: 8px;">
                          <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">
                            Sign In →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0 0; font-size: 13px; color: #9ca3af;">
                      If you didn't request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'XeroScroll <josh@xeroscroll.com>',
      to,
      subject: 'Sign in to XeroScroll',
      html,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
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
      <tr>
        <td style="padding: 0 0 20px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <!-- Author -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <span style="font-size: 15px; font-weight: 600; color: #111827;">${opp.authorName}</span>
                      <span style="font-size: 14px; color: #6b7280;"> @${opp.author}</span>
                    </td>
                  </tr>
                </table>
                <!-- Tweet text -->
                <p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.5; color: #374151;">
                  ${opp.text.substring(0, 280)}${opp.text.length > 280 ? '...' : ''}
                </p>
                <!-- Stats -->
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af;">
                  ♥ ${opp.likes.toLocaleString()}  &nbsp;·&nbsp;  ↺ ${opp.retweets.toLocaleString()}
                </p>
                ${opp.draftReply ? `
                <!-- Draft Reply -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border-radius: 8px; padding: 16px; border-left: 3px solid #22c55e;">
                      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">💡 Suggested Reply</p>
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #166534;">${opp.draftReply}</p>
                    </td>
                  </tr>
                </table>
                ` : ''}
                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
                  <tr>
                    <td style="background: #000000; border-radius: 8px;">
                      <a href="${opp.url}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                        Reply on X →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Daily Reply Opportunities</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">

                <!-- Header -->
                <tr>
                  <td style="background: #000000; border-radius: 12px 12px 0 0; padding: 24px 32px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <span style="font-size: 20px; font-weight: 700; color: #ffffff;">⚡ XeroScroll</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 13px; color: #9ca3af;">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="background: #ffffff; padding: 32px;">
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">
                      ${opportunities.length} opportunities today
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280;">
                      Fresh tweets from your monitored accounts, ready for your reply.
                    </p>

                    <!-- Opportunities -->
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${opportunitiesHtml}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; border-radius: 0 0 12px 12px; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">
                            Sent by <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #111827; text-decoration: none; font-weight: 500;">XeroScroll</a>
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #9ca3af;">Dashboard</a>
                            &nbsp;·&nbsp;
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #9ca3af;">Unsubscribe</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: 'XeroScroll <josh@xeroscroll.com>',
      to,
      subject: `⚡ ${opportunities.length} reply opportunities waiting`,
      html,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
