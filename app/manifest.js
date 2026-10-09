import { SITE } from '@/lib/config';

export default function manifest() {
  return {
    name: SITE.name, short_name: SITE.name, description: SITE.description,
    start_url: '/', display: 'standalone', background_color: '#1d0c11', theme_color: '#1d0c11',
    icons: [
      { src: '/pwa/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
