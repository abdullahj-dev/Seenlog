import { guard } from '@/lib/guard';
import { NextResponse } from 'next/server';
import { matchTitle } from '@/lib/sources';

export async function GET(req) {
  const g = guard(req, { limit: 600 }); if (g) return g;
  const p = new URL(req.url).searchParams, q = (p.get('q') || '').trim().slice(0, 120), kind = p.get('kind');
  if (q.length < 2) return NextResponse.json({ hits: [] });
  return NextResponse.json(await matchTitle(q, ['movie', 'series', 'anime'].includes(kind) ? kind : null));
}
