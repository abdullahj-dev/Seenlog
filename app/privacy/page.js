import '@/components/styles/legal.css';
import { SITE } from '@/lib/config';

export const metadata = { title: 'Privacy', description: 'What Seenlog stores about you, who can see it, and how to delete it.', alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <article className="legal">
      <h2 className="rh d">Privacy<small>last updated 9 October 2026</small></h2>
      <p>{SITE.name} is a personal project run by one person, not a company. This page says in plain words what it stores and who can see it.</p>

      <h3>What is stored</h3>
      <ul>
        <li>Your email address and password. The password is handled by Supabase sign-in and is stored scrambled, so nobody, including me, can read it.</li>
        <li>Your list: the titles you add, their status, ratings, notes, dates, collections, and any poster you upload yourself.</li>
        <li>Your username and profile settings, and if you use them, your follows, hearts and broken hearts.</li>
        <li>Messages you send through feedback, including reports.</li>
        <li>The date you joined and the date you were last seen.</li>
      </ul>

      <h3>Who can see it</h3>
      <ul>
        <li>Your list is private by default. Only you can see it until you make your profile public.</li>
        <li>If you go public, people can see your username, the titles you chose to share, the reviews you chose to share, your follower, following and heart counts. The names of the people you follow are not shown. You can switch back to private at any time and the page disappears.</li>
        <li>Your email address is never shown to other users or on any public page.</li>
        <li>The site owner and any admin can see your email, your username and your feedback messages, so they can fix problems, answer you and deal with abuse. Admins cannot read your password.</li>
      </ul>

      <h3>Other services involved</h3>
      <ul>
        <li>Supabase stores accounts, lists and uploaded posters. Vercel hosts the site and keeps normal server logs.</li>
        <li>When you search, the words you type are sent from the server to TMDB and AniList to find titles. Posters load from their image servers.</li>
        <li>Fonts load from Google Fonts, which means Google can see your IP address when a page loads.</li>
        <li>There are no ads, no selling of data and no tracking scripts added by this site.</li>
      </ul>

      <h3>On your device</h3>
      <p>The site keeps a copy of your list, your settings and recently opened pages in your browser storage and cache. That is how it opens fast and works offline. If you edit while offline, the changes wait on your device and are sent to your account when you are back online. Signing out clears the copy of your list.</p>

      <h3>Your choices</h3>
      <ul>
        <li>Settings has a button that downloads everything stored about you as a file.</li>
        <li>Settings also has a button that deletes your account, your list, your profile, your uploaded posters and your messages. It cannot be undone.</li>
        <li>You can make your profile private whenever you like.</li>
      </ul>

      <h3>Age</h3>
      <p>This site is not meant for children under 13.</p>

      <h3>Changes and contact</h3>
      <p>If this page changes in a way that matters, an announcement will say so. Questions or removal requests: use the Contact link in the footer{SITE.email ? ' or write to ' + SITE.email : ''}.</p>
    </article>
  );
}
