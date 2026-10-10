'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// The signed-in user for pages that sit outside the app shell (profiles, Community). undefined while loading, null if signed out.
export function useUser() {
  const [u, setU] = useState(undefined);
  useEffect(() => {
    if (!supabase) { setU(null); return; }
    let dead = false;
    supabase.auth.getSession().then(({ data }) => { if (!dead) setU(data.session?.user ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setU(s?.user ?? null));
    return () => { dead = true; data.subscription.unsubscribe(); };
  }, []);
  return u;
}
