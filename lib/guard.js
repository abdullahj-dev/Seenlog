import { NextResponse } from 'next/server';

// Best-effort protection for the API routes that spend your TMDB and AniList quota.
// 1) refuse browsers calling from some other website, 2) cap requests per visitor per minute.
// Note: serverless instances do not share memory, so this is a speed bump. Add a Vercel Firewall rate limit for a hard cap.
const hits = new Map();

export function guard(req, { limit = 90, windowMs = 60000 } = {}) {
  const from = req.headers.get('origin') || req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  if (from && host && !from.includes(host)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > windowMs) { rec.n = 0; rec.t = now; }
  rec.n += 1; hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  if (rec.n > limit) return NextResponse.json({ error: 'Too many requests. Wait a minute and try again.' }, { status: 429 });
  return null;
}
