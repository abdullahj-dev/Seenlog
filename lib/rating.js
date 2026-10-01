// One place that turns the stored 0-100 score into what a given person prefers to see.
const F = ['😖', '🙁', '😐', '🙂', '🤩'];
export const face = (v) => Math.max(0, Math.min(4, Math.floor((v - 0.1) / 20)));
export const fmtRating = (v, m) => v == null ? '-' : m === '100' ? String(Math.round(v)) : m === '5' ? '★' + (v / 20).toFixed(1).replace('.0', '') : m === 'smiley' ? F[face(v)] : (v / 10).toFixed(1);
