'use client';
import Shelf from '@/components/Shelf';
import { KD, sm, bg } from '@/lib/ui';
import { useApp } from '@/components/AppContext';

export default function DiscoverRow() {
  const { add, because, fmt, fresh, lib } = useApp();
  const dcard = (h) => (
    <article className="card" key={h.key}>
      <button className="pb" onClick={() => add(h)}>
        <div className={'poster' + (h.poster ? '' : ' blank')} style={bg(sm(h.poster))}>{h.poster ? '' : h.title}{lib.some((x) => x.key === h.key) && <span className="st done">In your list</span>}</div>
        <div className="stub"><b>{h.title}</b><small>{KD[h.kind]}{h.year ? ', ' + h.year : ''}</small></div>
      </button>
    </article>
  );
  const discover = because?.hits.length > 0 && fresh(because.hits).length > 0 ? (
    <section><h2 className="rh d" style={{ fontSize: '1.3rem' }}>Because you rated {because.title} {fmt(because.rating)}</h2><Shelf>{fresh(because.hits).slice(0, 14).map(dcard)}</Shelf></section>
  ) : null;
  return discover;
}
