import { NextResponse } from 'next/server';
import { searchAll } from '@/lib/sources';

export async function GET(req) {
  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  if (q.length < 2) return NextResponse.json({ hits: [], errors: {} });
  return NextResponse.json(await searchAll(q));
}
