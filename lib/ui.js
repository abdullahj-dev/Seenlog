// Pure constants and small helpers used by the interface. No state lives here.
export const KD = { movie: 'Movie', series: 'Series', anime: 'Anime' };
export const ST = { plan: 'Plan to watch', now: 'Watching', done: 'Watched' };
export const MOODS = ['Loved it', 'Moved me', 'Fun', 'Thrilling', 'Comforting', 'Mind-bending', 'Slow burn', 'Disappointing'];
export const TAGS = ['great story', 'slow burn', 'beautiful', 'rewatchable', 'cried', 'funny', 'mind-bending', 'comfort', 'underrated', 'overrated'];
export const ACCENTS = [['#d4a95a', 'Brass'], ['#e2513b', 'Ember'], ['#ff7eb6', 'Rose'], ['#8d7bff', 'Violet'], ['#4aa8ff', 'Sky'], ['#2fb7a6', 'Teal'], ['#4cc38a', 'Emerald']];
export const MINOPTS = { 10: [[6, '6.0+'], [7, '7.0+'], [8, '8.0+'], [9, '9.0+']], 100: [[6, '60+'], [7, '70+'], [8, '80+'], [9, '90+']], 5: [[4, '★2+'], [6, '★3+'], [8, '★4+'], [10, '★5']], smiley: [[4, '🙁 or better'], [6, '😐 or better'], [8, '🙂 or better'], [10, '🤩 only']] };
export const simUrl = (k) => (k.startsWith('al') ? `/api/similar?al=${k.slice(2)}` : `/api/similar?tm=${k.startsWith('tmmovie') ? 'movie' : 'tv'}&id=${k.replace(/^tm(movie|tv)/, '')}`);
export const sm = (u) => (u || '').replace('/w342/', '/w185/');
export const pad = (n) => String(n || 0).padStart(3, '0');
export const bg = (u) => (u ? { backgroundImage: `url('${u}')` } : {});
