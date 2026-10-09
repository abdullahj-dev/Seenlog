import '@/components/styles/legal.css';
import { SITE } from '@/lib/config';

export const metadata = { title: 'Terms', description: 'The simple rules for using Seenlog.', alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <article className="legal">
      <h2 className="rh d">Terms<small>last updated 9 October 2026</small></h2>
      <p>By using {SITE.name} you agree to these rules. They are short on purpose.</p>

      <h3>What this is</h3>
      <p>A free, non-commercial site for keeping track of movies, series and anime and, if you want, sharing your list. It is run by one person in spare time and comes as it is, with no promise that it will always be online or free of mistakes. Keep your own backup with the download button in Settings.</p>

      <h3>Your account</h3>
      <ul>
        <li>Keep your password to yourself. You are responsible for what happens under your account.</li>
        <li>One person, one account. Do not impersonate anyone.</li>
        <li>You must be at least 13.</li>
      </ul>

      <h3>What you put on the site</h3>
      <ul>
        <li>Your list, reviews, notes and uploaded posters stay yours. By making them public you allow the site to display them to visitors.</li>
        <li>Only upload posters you have the right to use. Do not upload anything illegal, sexual, hateful, or that targets or exposes a real person.</li>
        <li>No harassment, spam, or abuse of the follow, heart and report tools. Fake or mass voting is not allowed.</li>
        <li>Do not try to break, overload or scrape the site.</li>
      </ul>

      <h3>Moderation</h3>
      <p>Admins can hide a profile, remove content, turn down catalog suggestions, and suspend an account that breaks these rules. Reports go to the admin inbox. Decisions are made by a person, and you can write back through Contact.</p>

      <h3>Data from others</h3>
      <p>Title information and images come from TMDB and AniList, and streaming availability from JustWatch. They belong to their owners and are used under their terms. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>

      <h3>Limits</h3>
      <p>To the extent the law allows, the site owner is not liable for lost data, downtime, or anything that results from using the site. You can stop using it and delete your account at any time.</p>

      <h3>Changes</h3>
      <p>These terms may change. Continuing to use the site after a change means you accept it. Questions: use the Contact link in the footer{SITE.email ? ' or write to ' + SITE.email : ''}.</p>
    </article>
  );
}
