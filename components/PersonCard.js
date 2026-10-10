'use client';
import Link from 'next/link';
import { fmtRating } from '@/lib/rating';
import { Heart, SHOW_DISLIKES } from '@/lib/social';
import { SITE } from '@/lib/config';

// One person on the Community and Following pages. Children are optional action buttons.
export default function PersonCard({ p, children }) {
  const avg = p.avg_rating != null ? fmtRating(p.avg_rating * 10, SITE.ratingMode || '10') : null;
  return (
    <article className="pcard">
      <Link className="pmain" href={'/u/' + p.username}>
        {p.is_featured && <span className="pick">EDITOR'S PICK</span>}
        <span className="pid"><i className="mono" aria-hidden="true">{p.username[0].toUpperCase()}</i><b>{p.username}</b></span>
        <span className="pstat">{p.titles} titles{avg != null && <>, average {avg}</>}</span>
        <span className="pmeta">
          <span title="Followers">{p.followers} {p.followers === 1 ? 'follower' : 'followers'}</span>
          <span className="hv" title="Hearts"><Heart size={13} /> {p.hearts}</span>
          {SHOW_DISLIKES && <span className="hv br" title="Broken hearts"><Heart broken size={13} /> {p.broken}</span>}
        </span>
        {p.posters.length > 0 && <span className="pstrip">{p.posters.map((x, i) => <img key={i} src={x.poster} alt="" loading="lazy" />)}</span>}
      </Link>
      {children && <div className="pact">{children}</div>}
    </article>
  );
}
