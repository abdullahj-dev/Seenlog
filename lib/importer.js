// Loaded only when you open the Import page.
const KINDW = { movie: 'movie', movies: 'movie', film: 'movie', films: 'movie', series: 'series', 'tv series': 'series', 'tv shows': 'series', 'tv show': 'series', tv: 'series', shows: 'series', anime: 'anime' };
const nrm = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
export function parseList(text) {
  let kind = null; const seen = new Set(), out = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    if (/^\s*\/\//.test(raw) || !raw.trim()) continue;
    for (const part of raw.split(/\s+\|\s+/)) {
      let s = part.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/https?:\/\/\S+/g, ' ').split(/\s+->\s+/)[0].trim();
      if (!s) continue;
      const head = s.replace(/^[#*=\-\s]+/, '').replace(/[:\-=#*_\s]+$/, '').toLowerCase();
      if (KINDW[head] && s.length < 24) { kind = KINDW[head]; continue; }
      s = s.replace(/^(\s*(\d{1,3}[.)\]]|[-*•>]|\[[ xX✓]?\]|[✓✔✗✘❌✅=?]))+\s*/, '');
      let k = kind; const kh = s.match(/[(\[]\s*(movie|film|series|tv series|tv|anime)\s*[)\]]/i);
      if (kh) { k = KINDW[kh[1].toLowerCase()] || (kh[1].toLowerCase() === 'film' ? 'movie' : k); s = s.replace(kh[0], ' '); }
      const ym = s.match(/[(\[]\s*((?:19|20)\d\d)\s*[)\]]\s*$/) || s.match(/[\s,-]+((?:19|20)\d\d)\s*$/);
      const year = ym ? ym[1] : ''; if (ym) s = s.replace(ym[0], ' ');
      s = s.replace(/\bS\d{1,2}(E\d{1,3})?\b/gi, ' ').replace(/\bseason\s*\d+\b/gi, ' ').replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').replace(/^[\s\-–:,;.]+|[\s\-–:,;.]+$/g, '');
      if (s.length < 2) continue;
      const id = nrm(s) + year; if (seen.has(id)) continue; seen.add(id);
      out.push({ raw: part.trim(), q: s, year, kind: k });
    }
  }
  return out;
}
export function pickBest(row, hits) {
  const q = nrm(row.q);
  const sc = (h) => (nrm(h.title) === q ? 4 : nrm(h.title).includes(q) || q.includes(nrm(h.title)) ? 2 : 0) + (row.year && h.year === row.year ? 3 : 0) + (!row.kind || h.kind === row.kind ? 1 : 0);
  const ranked = hits.map((h, i) => ({ h, s: sc(h) - i * 0.01 })).sort((a, b) => b.s - a.s);
  const top = ranked[0]?.h;
  return { cands: ranked.map((r) => r.h), pick: top || null, sure: !!top && nrm(top.title) === q && (!row.year || top.year === row.year) };
}

