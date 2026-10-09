'use client';
import '@/components/styles/custom.css';
import { useEffect, useRef, useState } from 'react';
import { KD } from '@/lib/ui';
import { supabase } from '@/lib/supabase';
import { LANGS, cleanPosterUrl, newKey, savePosterBlob, shrinkImage } from '@/lib/custom';
import { useApp } from '@/components/AppContext';

const BLANK = { title: '', kind: 'movie', year: '', lang: '', director: '', cast: '', genres: '', about: '', url: '', suggest: false };

// Form for a title the search could not find, or for fixing one you added earlier.
export default function CustomAdd() {
  const { L, commit, customOpen, defaultStatus, patch, say, setCustomOpen, setJust, user } = useApp();
  const ref = useRef();
  const [f, setF] = useState(BLANK);
  const [blob, setBlob] = useState(null);
  const [preview, setPreview] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const editKey = customOpen?.key || null;

  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (customOpen && !d.open) {
      const old = editKey ? L.current.find((x) => x.key === editKey) : null;
      setF(old ? { title: old.title || '', kind: old.kind || 'movie', year: old.year || '', lang: old.lang || '', director: old.director || '', cast: old.cast || '', genres: (old.genres || []).join(', '), about: old.overview || '', url: /^https:/.test(old.poster || '') && !/\/storage\/v1\//.test(old.poster) ? old.poster : '' }
        : { ...BLANK, title: customOpen.seed || '' });
      setPreview(old?.poster || ''); setBlob(null); setErr(''); setBusy(false);
      d.showModal();
    }
    if (!customOpen && d.open) d.close();
  }, [customOpen]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try { const b = await shrinkImage(file); setBlob(b); setPreview(URL.createObjectURL(b)); setF((p) => ({ ...p, url: '' })); setErr(''); }
    catch (x) { setErr(x.message || 'Could not read that image'); }
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    const title = f.title.trim(), year = f.year.trim();
    if (!title) return setErr('A title is needed.');
    if (year && !/^\d{4}$/.test(year)) return setErr('Year should be four digits, like 1979.');
    const link = cleanPosterUrl(f.url);
    if (link === null) return setErr('The poster link must start with https:// and contain no spaces.');
    if (!editKey && L.current.some((x) => x.custom && x.title.toLowerCase() === title.toLowerCase() && String(x.year || '') === year)) return setErr('You already added this one.');
    setBusy(true);
    const key = editKey || newKey();
    try {
      let poster = editKey ? (L.current.find((x) => x.key === key)?.poster || '') : '';
      if (blob) poster = await savePosterBlob(blob, key, user);
      else if (link) poster = link;
      else if (!preview) poster = '';
      const fields = {
        kind: f.kind, title, year, poster, overview: f.about.trim(), lang: f.lang,
        director: f.director.trim(), cast: f.cast.trim(),
        genres: f.genres.split(',').map((g) => g.trim()).filter(Boolean).slice(0, 6),
      };
      if (editKey) { patch(key, fields); say('Saved changes'); }
      else {
        const entry = { writer: '', studio: '', runtime: '', ...fields, key, custom: true,
          no: Math.max(0, ...L.current.map((x) => x.no || 0)) + 1, status: defaultStatus, rating: null, notes: '', added: Date.now() };
        commit([entry, ...L.current]); say('Logged: ' + title); setJust(key);
        if (f.suggest && supabase && user) {
          // Sent to the admin inbox, who can approve it into everyone's search. Your own copy is already saved above.
          const { error } = await supabase.from('feedback').insert({ kind: 'missing', body: ('Suggested for everyone: ' + title + (year ? ' (' + year + ')' : '')).slice(0, 2000),
            title_data: { title: title.slice(0, 140), year, kind: f.kind, lang: f.lang, director: fields.director.slice(0, 120), cast: fields.cast.slice(0, 200), genres: fields.genres, about: fields.overview.slice(0, 600), poster: poster && !poster.startsWith('data:') ? poster : '' } });
          say(error ? 'Saved to your list. The suggestion was not sent: ' + error.message : 'Logged, and suggested for everyone. You will see the answer under Send feedback.');
        }
      }
      setCustomOpen(null);
    } catch { setErr('Could not save. Try again.'); setBusy(false); }
  }

  return (
    <dialog ref={ref} className="cdlg" onClose={() => setCustomOpen(null)} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}>
      {customOpen && (
        <form className="cf" onSubmit={submit}>
          <h2 className="d">{editKey ? 'Edit details' : 'Add it yourself'}</h2>
          {!editKey && <p className="tag" style={{ margin: 0 }}>For old, regional or rare titles the search could not find. It lives in your list like any other: rate it, tag it, add it to the diary.</p>}
          <div className="cgrid">
            <label className="wide">Title<input className="fld" value={f.title} onChange={set('title')} maxLength={140} autoFocus required /></label>
            <label>Type<select className="fld" value={f.kind} onChange={set('kind')}>{Object.entries(KD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Year<input className="fld" inputMode="numeric" value={f.year} onChange={set('year')} maxLength={4} placeholder="1979" /></label>
            <label>Language<select className="fld" value={f.lang} onChange={set('lang')}><option value="">Not set</option>{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
            <label className="wide">Director<input className="fld" value={f.director} onChange={set('director')} maxLength={120} /></label>
            <label className="wide">Cast<input className="fld" value={f.cast} onChange={set('cast')} maxLength={200} placeholder="Comma separated" /></label>
            <label className="wide">Genres<input className="fld" value={f.genres} onChange={set('genres')} maxLength={120} placeholder="Action, Drama" /></label>
            <label className="wide">About<textarea className="fld" rows={3} value={f.about} onChange={set('about')} maxLength={600} placeholder="One or two lines, optional" /></label>
          </div>
          <div className="cposter">
            <div className={'poster' + (preview ? '' : ' blank')} style={preview ? { backgroundImage: `url('${preview}')` } : undefined}>{preview ? '' : 'No poster'}</div>
            <div>
              <label className="btn g up">Upload an image<input type="file" accept="image/*" onChange={pick} hidden /></label>
              <label>or paste a link<input className="fld" value={f.url} onChange={(e) => { setF((p) => ({ ...p, url: e.target.value })); setBlob(null); const u = cleanPosterUrl(e.target.value); if (u) setPreview(u); }} placeholder="https://..." /></label>
              {preview && <button type="button" className="linkbtn" onClick={() => { setPreview(''); setBlob(null); setF((p) => ({ ...p, url: '' })); }}>Remove poster</button>}
              <small className="tag">Uploads are shrunk to about 30 KB first.</small>
            </div>
          </div>
          {!editKey && supabase && user && <label className="chk"><input type="checkbox" checked={f.suggest} onChange={(e) => setF((p) => ({ ...p, suggest: e.target.checked }))} /> <span>Suggest this title for everyone's search. The admin checks it first, and your own copy stays yours either way.</span></label>}
          {err && <p className="msg err" role="alert">{err}</p>}
          <div className="act">
            <button className="btn" disabled={busy}>{busy ? 'Saving...' : editKey ? 'Save changes' : 'Add to my list'}</button>
            <button type="button" className="btn g" onClick={() => ref.current.close()}>Cancel</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
