export type EmailConfig = {
  /** Transactional email HTTP API (Resend-compatible: POST JSON {from, to, subject, text, html}). */
  apiUrl: string;
  apiKey: string;
  from: string;
  /** Public https page that completes the confirmation, e.g. https://tappay.example/confirm */
  confirmUrl: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch] as string));

export function buildConfirmationEmail(name: string, link: string) {
  const first = name.trim().split(/\s+/)[0] || 'there';
  return {
    subject: 'Confirm your TapPay waitlist spot',
    text:
      `Hi ${first},\n\nConfirm your email to join the TapPay waitlist:\n\n${link}\n\n` +
      'The link works once and expires in 24 hours. If you did not sign up, ignore this email and nothing happens.\n',
    html:
      `<p>Hi ${escapeHtml(first)},</p><p>Confirm your email to join the TapPay waitlist:</p>` +
      `<p><a href="${escapeHtml(link)}">Confirm my email</a></p>` +
      '<p>The link works once and expires in 24 hours. If you did not sign up, ignore this email and nothing happens.</p>',
  };
}

/** Returns true when the provider accepted the message. Never throws. */
export async function sendConfirmationEmail(
  config: EmailConfig,
  to: string,
  name: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const link = `${config.confirmUrl}?token=${encodeURIComponent(token)}`;
    const {subject, text, html} = buildConfirmationEmail(name, link);
    const response = await fetcher(config.apiUrl, {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({from: config.from, to: [to], subject, text, html}),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
