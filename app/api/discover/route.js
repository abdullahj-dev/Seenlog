import { NextResponse } from 'next/server';
import { discover } from '@/lib/sources';

export async function GET(req) {
  const p = new URL(req.url).searchParams, tab = p.get('tab'), kind = p.get('kind');
  const page = Math.min(50, Math.max(1, parseInt(p.get('page')) || 1));
  if (!['newest', 'trending', 'top'].includes(tab) || !['movie', 'series', 'anime'].includes(kind)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  try { return NextResponse.json({ hits: await discover(tab, kind, page) }); }
  catch (e) { return NextResponse.json({ hits: [], error: e.message }, { status: 502 }); }
}
