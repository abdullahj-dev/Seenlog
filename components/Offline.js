'use client';
import '@/components/styles/legal.css';
import { useEffect, useState } from 'react';

// Registers the service worker and tells people when they are offline.
export default function Offline() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const up = () => setOff(false), down = () => setOff(true);
    setOff(!navigator.onLine);
    window.addEventListener('online', up); window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return off ? <div className="offbar" role="status">You are offline. Your list is saved on this device and changes will sync when you are back.</div> : null;
}
