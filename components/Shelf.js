'use client';
import { useRef } from 'react';

// Horizontal row with arrow buttons and no scrollbar.
export default function Shelf({ children, cls = '' }) {
  const r = useRef();
  const go = (n) => r.current.scrollBy({ left: n * r.current.clientWidth * 0.85, behavior: 'smooth' });
  return <div className={'shelfw ' + cls}><button className="arr l" aria-label="Scroll left" onClick={() => go(-1)}>‹</button><div className="shelf" ref={r}>{children}</div><button className="arr r" aria-label="Scroll right" onClick={() => go(1)}>›</button></div>;
}
