import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const paths = [
    '/',
    '/openapi-generator',
    '/pricing',
    '/login',
    '/register',
    '/dashboard',
    '/projects',
    '/settings',
    '/swagger-to-typescript',
    '/openapi-to-typescript',
    '/openapi-to-react-native',
    '/openapi-to-flutter',
    '/openapi-to-kotlin',
    '/openapi-to-swift',
  ];
  return paths.map((path, index) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: index === 0 ? 1 : 0.8,
  }));
}
