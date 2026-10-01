import { ImageResponse } from 'next/og';
import { SITE } from './config';

export const OG_SIZE = { width: 1200, height: 630 };
export const okImg = (u) => /^https:\/\/(image\.tmdb\.org|s4\.anilist\.co)\//.test(u || '');

// Link-preview image: profile name and stats on the left, a wall of up to six posters on the right.
export function renderWall({ name, items }) {
  const withPoster = items.filter((x) => okImg(x.poster));
  const wall = [...withPoster.filter((x) => x.rating != null).sort((a, b) => b.rating - a.rating), ...withPoster.filter((x) => x.rating == null)].slice(0, 6);
  const rated = items.filter((x) => x.rating != null);
  const avg = rated.length ? (rated.reduce((t, x) => t + x.rating, 0) / rated.length / 10).toFixed(1) : null;
  const watched = items.filter((x) => x.status === 'done').length;
  const big = name ? (name.length > 12 ? 68 : 92) : 88;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: 'linear-gradient(135deg,#3d1620,#1d0c11)', padding: 56, color: '#f3e6cf' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 30 }}>
          <div style={{ display: 'flex', fontSize: 32, color: '#d4a95a', letterSpacing: 3 }}>{SITE.name.toUpperCase()}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: big, fontWeight: 800, lineHeight: 1.05 }}>{name || SITE.name}</div>
            <div style={{ display: 'flex', fontSize: 30, color: '#b39a8e', marginTop: 20, lineHeight: 1.3 }}>
              {name ? `${items.length} titles logged, ${watched} watched${avg ? ', average ' + avg + ' out of 10' : ''}` : SITE.tagline}
            </div>
          </div>
          <div style={{ display: 'flex', width: 300, height: 6, background: '#d4a95a' }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: 540, gap: 14, alignContent: 'center', justifyContent: 'flex-end' }}>
          {wall.map((x, i) => <img key={i} src={x.poster} width={168} height={252} style={{ objectFit: 'cover', borderRadius: 8 }} />)}
        </div>
      </div>
    ),
    OG_SIZE
  );
}
