'use client';
import '@/components/styles/custom.css';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { KD } from '@/lib/ui';
import { LANGS, cleanPosterUrl, langName, newKey, savePosterBlob, shrinkImage } from '@/lib/custom';
import { useApp } from '@/components/AppContext';

const BLANK = { title: '', kind: 'movie', year: '', lang: '', director: '', cast: '', genres: '', about: '', url: '' };

// Admin tab: titles everyone can find in search. A missing-title request can open the form pre-filled.
export default function AdminCatalog({ seed, onSaved, onSeedUsed }) {
  const { say, user } = useApp();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null); // null, or { key?, ...fields }
  const [blob, setBlob] = useState(null);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { supabase.from('catalog').select('*').order('created_at', { ascending: false }).limit(300).then(({ data, error }) => (error ? setErr(error.message + '. Did you run supabase/catalog.sql?') : setRows(data))); }, []);
  useEffect(() => {
    if (!seed) return;
    const p = typeof seed.poster === 'string' && /^https:\/\//.test(seed.poster) ? seed.poster : '';
    setForm({ ...BLANK, title: seed.title || '', year: seed.year || '', kind: seed.kind || 'movie', lang: seed.lang || '', fbId: seed.fbId,
      director: seed.director || '', cast: seed.cast || '', genres: Array.isArray(seed.genres) ? seed.genres.join(', ') : '', about: seed.about || '',
      url: p && !/\/storage\/v1\//.test(p) ? p : '', keepPoster: p });
    setBlob(null); setPreview(p); setErr('');
  }, [seed]);

  const open = (r) => { setForm(r ? { key: r.key, title: r.title, kind: r.kind, year: r.year || '', lang: r.lang || '', director: r.director || '', cast: r.cast_names || '', genres: (r.genres || []).join(', '), about: r.overview || '', url: /^https:/.test(r.poster || '') && !/\/storage\/v1\//.test(r.poster) ? r.poster : '' } : { ...BLANK });
    setBlob(null); setPreview(r?.poster || ''); setErr(''); };
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const close = () => { setForm(null); onSeedUsed?.(); };

  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    try { const b = await shrinkImage(file); setBlob(b); setPreview(URL.createObjectURL(b)); setForm((p) => ({ ...p, url: '' })); } catch (x) { setErr(x.message); }
  }

  async function save(e) {
    e.preventDefault(); setErr('');
    const title = form.title.trim(), year = form.year.trim();
    if (!title) return setErr('A title is needed.');
    if (year && !/^\d{4}$/.test(year)) return setErr('Year should be four digits.');
    const link = cleanPosterUrl(form.url);
    if (link === null) return setErr('The poster link must start with https:// and contain no spaces.');
    if (!form.key && rows?.some((r) => r.title.toLowerCase() === title.toLowerCase() && (r.year || '') === year)) return setErr('Already in the catalog.');
    setBusy(true);
    try {
      const key = form.key || newKey();
      let poster = form.key ? rows.find((r) => r.key === key)?.poster || '' : form.keepPoster || '';
      if (blob) poster = await savePosterBlob(blob, key, user); else if (link) poster = link; else if (!preview) poster = '';
      // A poster someone else uploaded would vanish if they delete their account, so keep a copy in your own folder.
      if (poster && !blob && !link && /\/storage\/v1\/object\/public\/posters\//.test(poster) && !poster.includes('/' + user.id + '/')) {
        try { const r = await fetch(poster); if (r.ok) poster = await savePosterBlob(await r.blob(), key, user); } catch { say('Added, but the poster could not be copied. Re-upload it if it breaks.'); }
      }
      const row = { kind: form.kind, title, year: year || null, lang: form.lang || null, poster: poster || null, overview: form.about.trim() || null,
        genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 6), director: form.director.trim() || null, cast_names: form.cast.trim() || null };
      const { error } = form.key ? await supabase.from('catalog').update(row).eq('key', key) : await supabase.from('catalog').insert({ key, ...row, created_by: user.id });
      if (error) throw error;
      setRows((l) => (form.key ? l.map((r) => (r.key === key ? { ...r, ...row } : r)) : [{ key, ...row, created_at: new Date().toISOString() }, ...(l || [])]));
      say(form.key ? 'Saved' : 'Added. It now shows up in search.');
      if (form.fbId) onSaved?.(form.fbId);
      close();
    } catch (x) { setErr(x.message || 'Could not save'); }
    setBusy(false);
  }

  async function del(r) {
    if (!window.confirm('Remove "' + r.title + '" from the catalog? People who already added it keep their copy.')) return;
    const { error } = await supabase.from('catalog').delete().eq('key', r.key);
    if (error) return say('Could not remove: ' + error.message);
    setRows((l) => l.filter((x) => x.key !== r.key));
  }

  return (
    <div className="inbox">
      {err && !form && <p className="msg err" role="alert">{err}</p>}
      {!form && <div><button className="btn" onClick={() => open(null)}>Add a title</button> <small className="tag">Everything here shows up in everyone's search.</small></div>}
      {form && (
        <form className="cf scard" onSubmit={save} style={{ marginTop: 12 }}>
          <h3>{form.key ? 'Edit catalog title' : 'New catalog title'}</h3>
          <div className="cgrid">
            <label className="wide">Title<input className="fld" value={form.title} onChange={set('title')} maxLength={140} required autoFocus /></label>
            <label>Type<select className="fld" value={form.kind} onChange={set('kind')}>{Object.entries(KD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Year<input className="fld" inputMode="numeric" maxLength={4} value={form.year} onChange={set('year')} /></label>
            <label>Language<select className="fld" value={form.lang} onChange={set('lang')}><option value="">Not set</option>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
            <label className="wide">Director<input className="fld" value={form.director} onChange={set('director')} maxLength={120} /></label>
            <label className="wide">Cast<input className="fld" value={form.cast} onChange={set('cast')} maxLength={200} /></label>
            <label className="wide">Genres<input className="fld" value={form.genres} onChange={set('genres')} placeholder="Action, Drama" maxLength={120} /></label>
            <label className="wide">About<textarea className="fld" rows={3} value={form.about} onChange={set('about')} maxLength={600} /></label>
          </div>
          <div className="cposter">
            <div className={'poster' + (preview ? '' : ' blank')} style={preview ? { backgroundImage: `url('${preview}')` } : undefined}>{preview ? '' : 'No poster'}</div>
            <div>
              <label className="btn g up">Upload an image<input type="file" accept="image/*" onChange={pick} hidden /></label>
              <label>or paste a link<input className="fld" value={form.url} placeholder="https://..." onChange={(e) => { setForm((p) => ({ ...p, url: e.target.value })); setBlob(null); const u = cleanPosterUrl(e.target.value); if (u) setPreview(u); }} /></label>
              {preview && <button type="button" className="linkbtn" onClick={() => { setPreview(''); setBlob(null); setForm((p) => ({ ...p, url: '' })); }}>Remove poster</button>}
            </div>
          </div>
          {err && <p className="msg err" role="alert">{err}</p>}
          <div className="act"><button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save to catalog'}</button><button type="button" className="btn g" onClick={close}>Cancel</button></div>
        </form>
      )}
      {rows === null && !err && <p className="tag">Loading...</p>}
      {rows && !rows.length && !form && <p className="tag">The catalog is empty.</p>}
      {(rows || []).map((r) => (
        <div className="urow" key={r.key}>
          <div><b>{r.title}{r.year ? ' (' + r.year + ')' : ''}</b><small>{KD[r.kind]}{r.lang ? ', ' + langName(r.lang) : ''}{r.director ? ', ' + r.director : ''}</small></div>
          <div className="srow"><button className="btn g" onClick={() => open(r)}>Edit</button><button className="btn g x" onClick={() => del(r)}>Remove</button></div>
        </div>
      ))}
    </div>
  );
}
