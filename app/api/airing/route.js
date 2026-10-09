import { NextResponse } from 'next/server';
import { guard } from '@/lib/guard';
import { airing } from '@/lib/sources';

export async function GET(req) {
  const g = guard(req); if (g) return g;
  const keys = (new URL(req.url).searchParams.get('keys') || '').split(',').filter((k) => /^(tmtv|al)\d+$/.test(k)).slice(0, 12);
  if (!keys.length) return NextResponse.json({ airing: {} });
  return NextResponse.json({ airing: await airing(keys) });
}
