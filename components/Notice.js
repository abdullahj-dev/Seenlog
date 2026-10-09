'use client';
import '@/components/styles/legal.css';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const DK = 'seenlog_notices_off';
let cache = null, at = 0;
const gone = () => { try { return JSON.parse(localStorage.getItem(DK)) || []; } catch { return []; } };

// Banner for announcements an admin has posted. Closing one hides it on this device only.
export default function Notice() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    if (!supabase) return;
    if (cache && Date.now() - at < 120000) return setList(cache);
    let dead = false;
    supabase.from('announcements').select('id,title,body,link,level,expires_at').eq('active', true).order('created_at', { ascending: false }).limit(5)
      .then(({ data, error }) => {
        if (dead || error || !data) return;
        cache = data.filter((n) => !n.expires_at || new Date(n.expires_at) > new Date()); at = Date.now(); setList(cache);
      });
    return () => { dead = true; };
  }, []);
  const [off, setOff] = useState([]);
  useEffect(() => { setOff(gone()); }, []);
  const shown = list.filter((n) => !off.includes(n.id)).slice(0, 2);
  if (!shown.length) return null;
  const close = (id) => { const n = [...gone(), id].slice(-50); try { localStorage.setItem(DK, JSON.stringify(n)); } catch {} setOff(n); };
  return shown.map((n) => (
    <div key={n.id} className={'notice ' + n.level} role="status">
      <div>
        <b>{n.title}</b>
        {n.body && <p>{n.body}</p>}
        {n.link && (n.link.startsWith('/') ? <Link href={n.link}>Read more</Link> : <a href={n.link} target="_blank" rel="noopener noreferrer">Read more</a>)}
      </div>
      <button onClick={() => close(n.id)} aria-label="Dismiss this notice">×</button>
    </div>
  ));
}
