// Vercel serverless function: emails sponsorship applications to Konstantin.
// Runs on Vercel (no Supabase needed), so it keeps working even if the
// Supabase project ever sleeps. Set RESEND_API_KEY in the Vercel env vars.
//
// Optional env:
//   SPONSOR_TO    - recipient (default konstantinsaifo@gmail.com)
//   SPONSOR_FROM  - verified sender (default Resend's shared test sender)

const TO_DEFAULT = 'konstantinsaifo@gmail.com';
const FROM_DEFAULT = 'onboarding@resend.dev';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const KEY = process.env.RESEND_API_KEY || '';
  const TO = process.env.SPONSOR_TO || TO_DEFAULT;
  const FROM = process.env.SPONSOR_FROM || FROM_DEFAULT;

  // health check: /api/sponsor  -> tells you if the key is configured
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, mail_configured: KEY.length > 0, to: TO, from: FROM });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const p = (body && body.payload) || body || {};

  const company = String(p.company || '').slice(0, 200);
  const contact = String(p.contact_name || '').slice(0, 120);
  const email = String(p.email || '').slice(0, 200);
  const website = String(p.website || '').slice(0, 300);
  const budget = String(p.budget || '').slice(0, 80);
  const message = String(p.message || '').slice(0, 4000);

  if (!company && !email) return res.status(400).json({ error: 'company or email required' });

  if (!KEY) return res.status(500).json({ ok: false, emailed: false, error: 'RESEND_API_KEY not set' });

  const html = `<div style="font-family:-apple-system,Segoe UI,Inter,Arial,sans-serif;font-size:15px;color:#111;line-height:1.6">
    <h2 style="margin:0 0 12px">New sponsorship application</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td style="color:#666">Company</td><td><b>${esc(company)}</b></td></tr>
      <tr><td style="color:#666">Contact</td><td>${esc(contact) || '—'}</td></tr>
      <tr><td style="color:#666">Email</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
      <tr><td style="color:#666">Website</td><td>${esc(website) || '—'}</td></tr>
      <tr><td style="color:#666">Budget</td><td>${esc(budget) || '—'}</td></tr>
    </table>
    <p style="margin:14px 0 4px;color:#666">Message</p>
    <div style="white-space:pre-wrap;background:#f6f5f2;padding:12px;border-radius:8px">${esc(message) || '—'}</div>
    <p style="margin-top:18px;color:#888;font-size:12px">Sent from konstantinsaifoulline.com/sponsor</p>
  </div>`;

  const subject = `Sponsor application — ${company || email}`;
  const send = (from, to) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      from: `Sponsorships <${from}>`,
      to: [to],
      reply_to: email || undefined,
      subject,
      html,
    }),
  });

  // Try the best option first, then degrade so an application is never lost:
  //   1. configured sender -> desired inbox      (works once the domain is verified)
  //   2. Resend test sender -> desired inbox
  //   3. Resend test sender -> Resend account owner (always allowed)
  try {
    let lastError = '';

    for (const from of [FROM, FROM_DEFAULT]) {
      const r = await send(from, TO);
      if (r.ok) return res.status(200).json({ ok: true, emailed: true, to: TO, from });
      lastError = (await r.text()).slice(0, 400);

      // Test sender can only reach the account owner - use that address.
      const owner = (lastError.match(/your own email address \(([^)]+)\)/) || [])[1];
      if (owner && owner !== TO) {
        const r2 = await send(FROM_DEFAULT, owner);
        if (r2.ok) {
          return res.status(200).json({
            ok: true, emailed: true, to: owner,
            note: `Delivered to ${owner}. To receive these at ${TO}, verify konstantinsaifoulline.com at resend.com/domains.`,
          });
        }
        lastError = (await r2.text()).slice(0, 400);
      }
      if (from === FROM_DEFAULT) break;
    }

    return res.status(502).json({ ok: false, emailed: false, error: lastError });
  } catch (e) {
    return res.status(502).json({ ok: false, emailed: false, error: String(e).slice(0, 300) });
  }
};
