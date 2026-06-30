/** @type {import('next').NextConfig} */

// The existing Expo / react-native-web SPA keeps serving the INTERACTIVE app
// (post, edit, auth, chat, favorites, profile) under /app/*. Next.js owns the
// indexable routes at the root. Point SPA_ORIGIN at wherever the SPA build is
// deployed (its own Vercel project, Firebase Hosting, Amplify, etc.).
//   SPA_ORIGIN=https://app-spa.sabalist.com   (recommended: dedicated host)
const SPA_ORIGIN = process.env.SPA_ORIGIN || '';

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '**.sabalist.com' },
    ],
  },
  async rewrites() {
    if (!SPA_ORIGIN) return [];
    // Proxy the SPA under /app/*. The SPA must build with its asset base set to
    // "/app/" (Expo webpack: publicPath '/app/') so its /static assets resolve.
    // Next.js serves its own assets from /_next, so there is no collision.
    return [
      { source: '/app', destination: `${SPA_ORIGIN}/` },
      { source: '/app/:path*', destination: `${SPA_ORIGIN}/:path*` },
    ];
  },
  async redirects() {
    // Canonical host: redirect the bare apex to www (defense-in-depth; also set
    // this at the Vercel domain level so it applies before the app even runs).
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'sabalist.com' }],
        destination: 'https://www.sabalist.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
