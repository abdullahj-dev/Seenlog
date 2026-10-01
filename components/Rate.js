'use client';
import { useEffect, useState } from 'react';
import { fmtRating } from '@/lib/rating';

// Shows a stored 0-100 score in the viewer's own rating style. Search engines and first paint get the site default.
export default function Rate({ v, def }) {
  const [m, setM] = useState(null);
  useEffect(() => {
    const read = () => { try { setM(localStorage.getItem('seenlog_mode')); } catch {} };
    read();
    window.addEventListener('seenlog:mode', read);
    return () => window.removeEventListener('seenlog:mode', read);
  }, []);
  return <>{m && v != null ? fmtRating(Number(v), m) : def}</>;
}
