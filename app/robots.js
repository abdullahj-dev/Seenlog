import { SITE } from '@/lib/config';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/login', '/settings', '/reset-password', '/admin', '/feedback', '/following'] },
    sitemap: SITE.url + '/sitemap.xml',
  };
}
