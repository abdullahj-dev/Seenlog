import { guard } from '@/lib/guard';
import { NextResponse } from 'next/server';
import { similar, anilistSimilar } from '@/lib/sources';

export async function GET(req) {
  const g = guard(req); if (g) return g;
  const p = new URL(req.url).searchParams, tm = p.get('tm'), id = p.get('id'), al = p.get('al');
  try {
    if (/^\d+$/.test(al || '')) return NextResponse.json({ hits: await anilistSimilar(al) });
    if (!['movie', 'tv'].includes(tm) || !/^\d+$/.test(id || '')) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    return NextResponse.json({ hits: await similar(tm, id) });
  } catch (e) { return NextResponse.json({ hits: [], error: e.message }, { status: 502 }); }
}
