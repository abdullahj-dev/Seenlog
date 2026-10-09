'use client';
import { useState } from 'react';
import { KD, ST } from '@/lib/ui';
import { useApp } from '@/components/AppContext';

export default function ImportScreen() {
  const { L, commit, done, hits, rows, say } = useApp();
  const [impText, setImpText] = useState('');
  const [impRows, setImpRows] = useState([]);
  const [impBusy, setImpBusy] = useState(false);
  const [impProg, setImpProg] = useState(0);
  const [impStatus, setImpStatus] = useState('done');
  async function runMatch() {
    const { parseList, pickBest } = await import('@/lib/importer');
    const rows = parseList(impText);
    if (!rows.length) return say('Nothing to import. Paste your list first.');
    setImpBusy(true); setImpRows([]); setImpProg(0);
    const out = []; let next = 0, done = 0, warned = false;
    async function worker() {
      while (next < rows.length) {
        const k = next++, r = rows[k]; let hits = [];
        try { const p = new URLSearchParams({ q: r.q }); if (r.kind) p.set('kind', r.kind); const d = await (await fetch('/api/match?' + p)).json(); hits = d.hits || []; if (d.error && !hits.length && !warned) { warned = true; say(d.error); } } catch {}
        const b = pickBest(r, hits);
        out[k] = { ...r, id: k, cands: b.cands, pick: b.pick?.key || '', state: !b.pick ? 'none' : b.sure ? 'ok' : 'guess', include: !!b.pick && !L.current.some((x) => x.key === b.pick.key), dupe: !!b.pick && L.current.some((x) => x.key === b.pick.key) };
        setImpProg(Math.round((++done / rows.length) * 100));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setImpRows(out); setImpBusy(false);
  }
  async function runImport() {
    const chosen = impRows.filter((r) => r.include && r.pick && !r.dupe);
    if (!chosen.length) return say('Nothing selected');
    setImpBusy(true); setImpProg(0);
    const made = [], res = {}; let next = 0, done = 0;
    async function worker() {
      while (next < chosen.length) {
        const r = chosen[next++], h = r.cands.find((c) => c.key === r.pick);
        try {
          if (made.some((m) => m.key === h.key)) { res[r.id] = 'dupe'; continue; }
          let f = h.item;
          if (!f) { f = await (await fetch(h.src === 'al' ? `/api/title?al=${h.id}` : `/api/title?tm=${h.tm}&id=${h.id}`)).json(); if (f.error) throw 0; }
          made.push({ kind: h.kind, title: h.title, year: h.year, poster: h.poster, ...f, key: h.key, status: impStatus, rating: null, notes: '', added: Date.now() - r.id });
          res[r.id] = 'added';
        } catch { res[r.id] = 'failed'; }
        setImpProg(Math.round((++done / chosen.length) * 100));
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    made.sort((a, b) => b.added - a.added);
    let n = Math.max(0, ...L.current.map((x) => x.no || 0));
    commit([...made.map((m) => ({ ...m, no: ++n })), ...L.current]);
    setImpRows(impRows.map((r) => ({ ...r, result: res[r.id] })));
    setImpBusy(false); say(made.length + ' titles added');
  }
  function downloadReport() {
    const lines = ['// Seenlog import report. ✓ added, = already in your list, ✗ not found or failed, ? unchecked guess, - skipped by you.', '// You can paste this whole file back into Import and it will work.'];
    impRows.forEach((r) => {
      const h = r.cands.find((c) => c.key === r.pick);
      const mark = r.result === 'added' ? '✓' : r.result === 'failed' || !r.pick ? '✗' : r.dupe || r.result === 'dupe' ? '=' : r.include ? '?' : '-';
      lines.push(`${mark} ${r.raw}${h ? '  ->  ' + h.title + (h.year ? ' (' + h.year + ')' : '') + ', ' + KD[h.kind] : '  ->  not found'}`);
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })); a.download = 'import-report.txt'; a.click();
  }
  const cnt = (st) => impRows.filter((r) => r.state === st).length;
  const setRow = (id, ch) => setImpRows(impRows.map((x) => (x.id === id ? { ...x, ...ch } : x)));
  const imp = (
    <section>
      <h2 className="rh d">Import a list<small>paste names, or open a .txt file</small></h2>
      <textarea className="imp" value={impText} onChange={(e) => setImpText(e.target.value)} placeholder={'Movies:\nInception (2010)\n2. the prestige\nSeries\n- Breaking Bad\nSteins;Gate (anime)'} />
      <div className="bar">
        <label className="btn g">Open .txt file<input type="file" accept=".txt,.md,.csv" hidden onChange={async (e) => { if (e.target.files[0]) setImpText(await e.target.files[0].text()); e.target.value = ''; }} /></label>
        <span className="gap" />
        <select value={impStatus} onChange={(e) => setImpStatus(e.target.value)} aria-label="Mark imported titles as">{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>Mark all as {v}</option>)}</select>
        <button className="btn" disabled={impBusy || !impText.trim()} onClick={runMatch}>Find matches</button>
      </div>
      {impBusy && <div className="pbar"><span style={{ width: impProg + '%' }} /></div>}
      {impRows.length > 0 && (<>
        <p className="tag">✓ {cnt('ok')} sure, ? {cnt('guess')} worth a look, ✗ {cnt('none')} not found. Untick anything you do not want, or pick a different match.</p>
        <div className="improws">{impRows.map((r) => (
          <div className={'ir ' + r.state} key={r.id}>
            <input type="checkbox" checked={!!r.include} disabled={!r.pick || r.dupe} onChange={(e) => setRow(r.id, { include: e.target.checked })} aria-label={'Include ' + r.raw} />
            <span className="mk">{r.result === 'added' ? '✓✓' : r.state === 'ok' ? '✓' : r.state === 'guess' ? '?' : '✗'}</span>
            <span className="rawt" title={r.raw}>{r.raw}</span>
            {r.cands.length ? <select value={r.pick} onChange={(e) => setRow(r.id, { pick: e.target.value, include: !L.current.some((x) => x.key === e.target.value), dupe: L.current.some((x) => x.key === e.target.value), state: 'guess' })}>{r.cands.map((c) => <option key={c.key} value={c.key}>{c.title} ({c.year || '?'}, {KD[c.kind]})</option>)}</select> : <em>no match</em>}
            {r.dupe && <small>already in your list</small>}
          </div>
        ))}</div>
        <div className="act"><button className="btn" disabled={impBusy} onClick={runImport}>Add {impRows.filter((r) => r.include && r.pick && !r.dupe).length} titles</button><button className="btn g" onClick={downloadReport}>Download report (.txt)</button></div>
      </>)}
    </section>
  );
  return imp;
}
