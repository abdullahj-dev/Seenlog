'use client';
import Link from 'next/link';
import { useApp } from '@/components/AppContext';

export default function NavBar() {
  const { failed, moveLocal, path, pending, pickTonight, setPending, user } = useApp();
  
  return (
    <>
<nav className="nav" aria-label="Pages">
        <Link href="/" className={path === '/' ? 'on' : ''}>My list</Link>
        <Link href="/diary" className={path === '/diary' ? 'on' : ''}>Diary</Link>
        <Link href="/discover" className={path === '/discover' ? 'on' : ''}>Discover</Link>
        <Link href="/year" className={path === '/year' ? 'on' : ''}>Year</Link>
        <Link href="/community" className={path === '/community' ? 'on' : ''}>Community</Link>
        <Link href="/import" className={path === '/import' ? 'on' : ''}>Import</Link>
        <span className="gap" /><button className="btn" onClick={() => pickTonight()}>Pick for tonight</button>
      </nav>
{failed.map(([k, v]) => <p className="tag" key={k} style={{ color: 'var(--ember)' }}>{k} failed: {v}</p>)}
{user && pending > 0 && (
        <p className="tag">This browser has {pending} {pending === 1 ? 'title' : 'titles'} that {pending === 1 ? 'is' : 'are'} not in your account.{' '}
          <button className="chip" onClick={moveLocal}>Move them in</button> <button className="chip" onClick={() => setPending(0)}>Skip</button></p>
      )}
    </>
  );
}
