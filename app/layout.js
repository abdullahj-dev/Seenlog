import './globals.css';
import '@/components/styles/legal.css';
import Link from 'next/link';
import App from '@/components/App';
import { SITE } from '@/lib/config';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} | ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  openGraph: { title: SITE.name, description: SITE.description, type: 'website' },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'black-translucent' },
  alternates: { canonical: '/' },
};
export const viewport = { themeColor: '#1d0c11' };

export default function RootLayout({ children }) {
  const ld = { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, description: SITE.description, url: SITE.url, author: { '@type': 'Person', name: SITE.owner } };
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <script dangerouslySetInnerHTML={{ __html: "try{var a=localStorage.getItem('seenlog_accent');if(a)document.documentElement.style.setProperty('--brass',a)}catch(e){}" }} />
        <link rel="preconnect" href="https://s4.anilist.co" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Limelight&family=Hanken+Grotesk:wght@400;600;800&display=swap" />
      </head>
      <body>
        <div className="wrap">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
          <a className="skip" href="#main">Skip to content</a>
          <header>
            <div className="head"><div>
              <h1 className="d">{SITE.name}</h1>
              <p className="tag">{SITE.tagline}</p>
            </div></div>
          </header>
          <main id="main"><App />{children}</main>
          <footer>
            <span>© {new Date().getFullYear()} {SITE.name}{SITE.email ? ' · ' + SITE.email : ''}</span>
            <nav aria-label="About this site"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/feedback">Contact</Link></nav>
            <span className="credit">Movie and series data from <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">TMDB</a>, anime data from <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>, streaming availability from JustWatch. This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
