import { renderWall, OG_SIZE } from '@/lib/wall';

export const alt = 'Seenlog';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() { return renderWall({ name: null, items: [] }); }
