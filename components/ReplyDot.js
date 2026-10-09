'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/components/AppContext';

// Counts your messages that have an admin answer you have not opened yet.
export function useUnread() {
  const { user } = useApp();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!supabase || !user) { setN(0); return; }
    let dead = false;
    const load = () => supabase.from('feedback').select('created_at,updated_at,reply_seen_at').order('created_at', { ascending: false }).limit(50)
      .then(({ data, error }) => { if (!dead && !error) setN((data || []).filter((m) => m.updated_at > m.created_at && (!m.reply_seen_at || m.reply_seen_at < m.updated_at)).length); });
    load();
    window.addEventListener('focus', load); window.addEventListener('seenlog:fbseen', load);
    return () => { dead = true; window.removeEventListener('focus', load); window.removeEventListener('seenlog:fbseen', load); };
  }, [user?.id]);
  return n;
}

// Small red dot for the avatar button.
export default function ReplyDot() {
  const n = useUnread();
  return n > 0 ? <i className="rdot" aria-label={n + ' new replies'} /> : null;
}

// Text for the menu link, empty when nothing is waiting.
export function ReplyCount() {
  const n = useUnread();
  return n > 0 ? <span className="tabn">{n} new</span> : null;
}
