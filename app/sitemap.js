import { SITE } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export default async function sitemap() {
  const out = [{ url: SITE.url, lastModified: new Date() }, { url: SITE.url + '/discover' }, { url: SITE.url + '/privacy' }, { url: SITE.url + '/terms' }, { url: SITE.url + '/community' }];
  try {
    if (supabase) {
      const { data } = await supabase.from('profiles').select('username').eq('is_public', true).not('username', 'is', null).limit(1000);
      (data || []).forEach((p) => out.push({ url: `${SITE.url}/u/${p.username}` }));
      const { data: cols } = await supabase.from('public_collections').select('username,collection').limit(1000);
      [...new Set((cols || []).map((c) => c.username + '/c/' + encodeURIComponent(c.collection)))].forEach((path) => out.push({ url: `${SITE.url}/u/${path}` }));
    }
  } catch {}
  return out;
}
