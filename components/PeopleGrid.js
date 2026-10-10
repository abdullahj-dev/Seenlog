'use client';
import '@/components/styles/social.css';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import PersonCard from '@/components/PersonCard';
import { useUser } from '@/lib/useUser';

const SORTS = { titles: 'Most titles', followers: 'Most followed', hearts: 'Most loved' };

// Community people list with a search box and sorting. Data comes from the server page.
export default function PeopleGrid({ people }) {
  const user = useUser();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('titles');
  const shown = useMemo(() => people.filter((p) => !q.trim() || p.username.includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.is_featured - a.is_featured) || (b[sort] - a[sort]) || a.username.localeCompare(b.username)), [people, q, sort]);
  return (
    <>
      <div className="ptools">
        <input className="fld" type="search" placeholder="Find a person" aria-label="Find a person" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="prov">{Object.entries(SORTS).map(([k, v]) => <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>{v}</button>)}</div>
        {user && <Link className="chip" href="/following">People you follow</Link>}
      </div>
      {!shown.length ? <p className="none">Nobody matches.</p> : <div className="pgrid">{shown.map((p) => <PersonCard key={p.username} p={p} />)}</div>}
    </>
  );
}
