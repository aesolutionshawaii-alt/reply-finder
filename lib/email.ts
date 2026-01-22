import { Resend } from 'resend';

let resendClient: Resend | null = null;

// HTML escape to prevent XSS in emails
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Get admin emails from env
function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
}

function getResend(): Resend | null {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured');
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// ZeptoMail (Zoho) fallback
async function sendViaZeptoMail(params: {
  to: string[];
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'ZEPTOMAIL_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({
        from: { address: params.fromEmail, name: params.fromName },
        to: params.to.map(email => ({ email_address: { address: email } })),
        subject: params.subject,
        htmlbody: params.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ZeptoMail error response:', errorText);
      return { success: false, error: `ZeptoMail API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('ZeptoMail request failed:', error);
    return { success: false, error: String(error) };
  }
}

// Generic email sender with fallback
async function sendEmailWithFallback(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; provider?: string; error?: string }> {
  const { to, subject, html, from = 'XeroScroll <josh@xeroscroll.com>' } = params;
  const toAddresses = Array.isArray(to) ? to : [to];

  // Parse from address
  const fromMatch = from.match(/^(.+?)\s*<(.+)>$/);
  const fromName = fromMatch ? fromMatch[1].trim() : 'XeroScroll';
  const fromEmail = fromMatch ? fromMatch[2].trim() : 'josh@xeroscroll.com';

  // Try Resend first
  const resend = getResend();
  if (resend) {
    try {
      await resend.emails.send({
        from,
        to: toAddresses,
        subject,
        html,
      });
      console.log(`Email sent via Resend to ${toAddresses.join(', ')}`);
      return { success: true, provider: 'resend' };
    } catch (resendError) {
      console.error('Resend failed, trying fallback:', resendError);
    }
  }

  // Try ZeptoMail as fallback
  const zeptoResult = await sendViaZeptoMail({
    to: toAddresses,
    subject,
    html,
    fromName,
    fromEmail,
  });

  if (zeptoResult.success) {
    console.log(`Email sent via ZeptoMail (fallback) to ${toAddresses.join(', ')}`);
    return { success: true, provider: 'zeptomail' };
  }

  // Both failed
  if (!resend) {
    return { success: false, error: 'No email providers configured' };
  }

  return { success: false, error: `Resend failed and ZeptoMail fallback failed: ${zeptoResult.error}` };
}

// Send magic link email for passwordless auth
export async function sendMagicLinkEmail(
  to: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign in to XeroScroll</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 480px;">
                <!-- Header -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff;">⚡ XeroScroll</span>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="background: #18181b; padding: 32px; border-radius: 12px;">
                    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                      Sign in to XeroScroll
                    </h1>
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #a1a1aa;">
                      Click the button below to sign in. This link expires in 15 minutes.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background: #ffffff; border-radius: 8px;">
                          <a href="${loginUrl}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #000000; text-decoration: none;">
                            Sign In →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0 0; font-size: 13px; color: #52525b;">
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

  return sendEmailWithFallback({
    to,
    subject: 'Sign in to XeroScroll',
    html,
  });
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
  const opportunitiesHtml = opportunities
    .map(
      (opp, i) => `
      <tr>
        <td style="padding: 0 0 16px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #18181b; border-radius: 12px;">
            <tr>
              <td style="padding: 20px;">
                <!-- Author -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td>
                      <span style="font-size: 15px; font-weight: 600; color: #ffffff;">${escapeHtml(opp.authorName)}</span>
                      <span style="font-size: 14px; color: #71717a;"> @${escapeHtml(opp.author)}</span>
                    </td>
                  </tr>
                </table>
                <!-- Tweet text -->
                <p style="margin: 12px 0 0 0; font-size: 15px; line-height: 1.5; color: #d4d4d8;">
                  ${escapeHtml(opp.text.substring(0, 280))}${opp.text.length > 280 ? '...' : ''}
                </p>
                <!-- Stats -->
                <p style="margin: 12px 0 0 0; font-size: 13px; color: #71717a;">
                  <span style="color: #f87171;">♥</span> ${opp.likes.toLocaleString()}  &nbsp;·&nbsp;  ↺ ${opp.retweets.toLocaleString()}
                </p>
                ${opp.draftReply ? `
                <!-- Draft Reply -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 16px;">
                  <tr>
                    <td style="background: #27272a; border-radius: 8px; padding: 16px; border-left: 3px solid #a3a3a3;">
                      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.5px;">Draft Reply</p>
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #e4e4e7;">${escapeHtml(opp.draftReply)}</p>
                    </td>
                  </tr>
                </table>
                ` : ''}
                <!-- CTA Button -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 16px;">
                  <tr>
                    <td style="background: #ffffff; border-radius: 8px;">
                      <a href="${opp.url}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #000000; text-decoration: none;">
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
        <title>Your Daily Reply Pack</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px;">

                <!-- Header -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <span style="font-size: 20px; font-weight: 700; color: #ffffff;">⚡ XeroScroll</span>
                        </td>
                        <td align="right">
                          <span style="font-size: 13px; color: #71717a;">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Main Content -->
                <tr>
                  <td style="padding: 0 0 24px 0;">
                    <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff;">
                      ${opportunities.length} opportunities today
                    </h1>
                    <p style="margin: 0; font-size: 15px; color: #71717a;">
                      Fresh tweets from your monitored accounts, ready for your reply.
                    </p>
                  </td>
                </tr>

                <!-- Opportunities -->
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${opportunitiesHtml}
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 0 0 0; border-top: 1px solid #27272a;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 13px; color: #71717a;">
                            Sent by <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #ffffff; text-decoration: none; font-weight: 500;">XeroScroll</a>
                          </p>
                          <p style="margin: 0; font-size: 12px; color: #52525b;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: #52525b;">Dashboard</a>
                            &nbsp;·&nbsp;
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe" style="color: #52525b;">Unsubscribe</a>
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

  return sendEmailWithFallback({
    to,
    subject: `⚡ ${opportunities.length} reply opportunities waiting`,
    html,
  });
}

// Send admin alert for cron results
export async function sendCronAlertEmail(data: {
  status: 'completed' | 'failed';
  hourUtc: number;
  usersTriggered: number;
  usersSent: number;
  usersFailed: number;
  usersSkipped: number;
  error?: string;
}): Promise<{ success: boolean; error?: string }> {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    console.log('No admin emails configured, skipping cron alert');
    return { success: true };
  }

  const isFailure = data.status === 'failed' || data.usersFailed > 0;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>XeroScroll Cron ${isFailure ? 'Alert' : 'Summary'}</title>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid ${isFailure ? '#fecaca' : '#e5e7eb'};">
          <div style="background: ${isFailure ? '#dc2626' : '#000'}; padding: 20px;">
            <span style="color: #fff; font-weight: 700; font-size: 16px;">
              ${isFailure ? '⚠️ XeroScroll Cron Alert' : '✓ XeroScroll Cron Summary'}
            </span>
          </div>
          <div style="padding: 24px;">
            <p style="margin: 0 0 16px 0; color: #374151;">
              <strong>Status:</strong> ${data.status.toUpperCase()}
            </p>
            <p style="margin: 0 0 8px 0; color: #374151;">
              <strong>Hour (UTC):</strong> ${data.hourUtc}:00
            </p>
            <p style="margin: 0 0 8px 0; color: #374151;">
              <strong>Users Triggered:</strong> ${data.usersTriggered}
            </p>
            <p style="margin: 0 0 8px 0; color: #22c55e;">
              <strong>Sent:</strong> ${data.usersSent}
            </p>
            <p style="margin: 0 0 8px 0; color: ${data.usersFailed > 0 ? '#dc2626' : '#374151'};">
              <strong>Failed:</strong> ${data.usersFailed}
            </p>
            <p style="margin: 0 0 8px 0; color: #6b7280;">
              <strong>Skipped:</strong> ${data.usersSkipped}
            </p>
            ${data.error ? `
              <div style="margin-top: 16px; padding: 12px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <p style="margin: 0; color: #dc2626; font-size: 14px;">
                  <strong>Error:</strong> ${data.error}
                </p>
              </div>
            ` : ''}
            <div style="margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px;">
                View Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmailWithFallback({
    to: adminEmails,
    from: 'XeroScroll Alerts <josh@xeroscroll.com>',
    subject: isFailure
      ? `⚠️ XeroScroll Cron Failed - ${data.usersFailed} failures`
      : `✓ XeroScroll Cron Complete - ${data.usersSent} digests sent`,
    html,
  });
}
