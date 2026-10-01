import { NextResponse } from 'next/server';
import { tmdbDetails, anilistById } from '@/lib/sources';

export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const al = p.get('al'), tm = p.get('tm'), id = p.get('id');
  try {
    if (/^\d+$/.test(al || '')) return NextResponse.json(await anilistById(al));
    if (!['movie', 'tv'].includes(tm) || !/^\d+$/.test(id || '')) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    return NextResponse.json(await tmdbDetails(tm, id));
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 502 }); }
}
