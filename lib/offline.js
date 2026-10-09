// Edits made while offline (or while a save fails) are remembered here and sent later.
const KEY = 'seenlog_dirty';
const empty = () => ({ uid: null, up: [], gone: [] });
export function readDirty() { try { return { ...empty(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return empty(); } }
function write(d) { try { if (!d.up.length && !d.gone.length) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }
export const hasDirty = () => { const d = readDirty(); return d.up.length + d.gone.length; };
export function markDirty(uid, up = [], gone = []) {
  let d = readDirty(); if (d.uid && d.uid !== uid) d = empty();
  const u = new Set(d.up), g = new Set(d.gone);
  up.forEach((k) => { u.add(k); g.delete(k); });
  gone.forEach((k) => { g.add(k); u.delete(k); });
  write({ uid, up: [...u], gone: [...g] });
}
// Sends remembered edits to the account. Returns how many are still waiting.
export async function flushDirty(supabase, uid, list) {
  const d = readDirty();
  if (!d.up.length && !d.gone.length) return 0;
  if (d.uid !== uid) { write(empty()); return 0; }
  const by = new Map(list.map((x) => [x.key, x]));
  const up = d.up.filter((k) => by.has(k)).map((k) => ({ key: k, data: by.get(k), updated_at: new Date().toISOString() }));
  let upOk = true, goneOk = true;
  for (let i = 0; i < up.length; i += 200) { const { error } = await supabase.from('entries').upsert(up.slice(i, i + 200), { onConflict: 'user_id,key' }); if (error) { upOk = false; break; } }
  if (d.gone.length) { const { error } = await supabase.from('entries').delete().eq('user_id', uid).in('key', d.gone); if (error) goneOk = false; }
  write({ uid, up: upOk ? [] : d.up, gone: goneOk ? [] : d.gone });
  return (upOk ? 0 : d.up.length) + (goneOk ? 0 : d.gone.length);
}
