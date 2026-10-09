import { ImageResponse } from 'next/og';

export async function GET(_req, { params }) {
  const { size } = await params;
  const s = size === '512' ? 512 : 192;
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#1d0c11' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width={s} height={s} viewBox="0 0 64 64">
          <path d="M14 20h36a3 3 0 0 1 3 3v4a5 5 0 0 0 0 10v4a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3v-4a5 5 0 0 0 0-10v-4a3 3 0 0 1 3-3z" fill="#d4a95a" />
          <circle cx="26" cy="32" r="6" fill="#1d0c11" />
          <circle cx="26" cy="32" r="2" fill="#d4a95a" />
        </svg>
      </div>
    ),
    { width: s, height: s }
  );
}
