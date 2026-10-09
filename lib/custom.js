// Helpers for titles you add yourself (keys that start with "cu"). Client side only.
import { supabase } from '@/lib/supabase';

export const LANGS = [['ur', 'Urdu'], ['pa', 'Punjabi'], ['hi', 'Hindi'], ['ps', 'Pashto'], ['sd', 'Sindhi'], ['skr', 'Saraiki'], ['en', 'English'], ['ko', 'Korean'], ['ja', 'Japanese'], ['tr', 'Turkish'], ['ta', 'Tamil'], ['te', 'Telugu'], ['bn', 'Bengali'], ['ar', 'Arabic'], ['fa', 'Persian']];

export function langName(code) {
  if (!code) return '';
  const hit = LANGS.find(([c]) => c === code);
  if (hit) return hit[1];
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || ''; } catch { return ''; }
}

export const isCustom = (key) => typeof key === 'string' && key.startsWith('cu');
export const newKey = () => 'cu' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// A pasted poster link must be a plain https address. Quotes, brackets and spaces are refused
// because the link ends up inside a CSS background-image.
export function cleanPosterUrl(v) {
  const s = (v || '').trim();
  if (!s) return '';
  return /^https:\/\/[^\s'"()<>\\]+$/.test(s) && s.length < 600 ? s : null;
}

// Shrinks any image to about 360px wide, JPEG, usually 20 to 40 KB.
export async function shrinkImage(file, maxW = 360) {
  if (!file || !/^image\//.test(file.type)) throw new Error('Pick an image file');
  if (file.size > 12 * 1024 * 1024) throw new Error('That image is over 12 MB');
  const bmp = await createImageBitmap(file);
  const w = Math.min(maxW, bmp.width), h = Math.round(bmp.height * (w / bmp.width));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#1d0c11'; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read that image'))), 'image/jpeg', 0.78));
}

const toDataUrl = (blob) => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = rej; f.readAsDataURL(blob); });

// Signed in: the shrunken image goes to the "posters" storage bucket and you get its public link.
// Signed out, or if the upload fails: the image is kept inside the entry as a small data link.
export async function savePosterBlob(blob, key, user) {
  if (supabase && user) {
    const path = `${user.id}/${key}.jpg`;
    const { error } = await supabase.storage.from('posters').upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '31536000' });
    if (!error) return supabase.storage.from('posters').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  }
  return toDataUrl(blob);
}

// Removes the stored file when a custom title is deleted. Safe to call for any poster value.
export function dropPoster(entry, user) {
  const m = supabase && user && /\/storage\/v1\/object\/public\/posters\/([^?]+)/.exec(entry?.poster || '');
  if (m && m[1].startsWith(user.id + '/')) supabase.storage.from('posters').remove([m[1]]).catch(() => {});
}
