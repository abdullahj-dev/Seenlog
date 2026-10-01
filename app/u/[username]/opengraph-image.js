import { supabase } from '@/lib/supabase';
import { renderWall, OG_SIZE } from '@/lib/wall';

export const alt = 'Poster wall';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 300;

export default async function Image({ params }) {
  const { username } = await params;
  let name = null, items = [];
  try {
    if (supabase) {
      const { data: p } = await supabase.from('profiles').select('id,username').eq('username', String(username).toLowerCase()).eq('is_public', true).maybeSingle();
      if (p) {
        name = p.username;
        const { data } = await supabase.from('public_entries').select('data').eq('user_id', p.id).limit(500);
        items = (data || []).map((r) => r.data);
      }
    }
  } catch {}
  return renderWall({ name, items });
}
