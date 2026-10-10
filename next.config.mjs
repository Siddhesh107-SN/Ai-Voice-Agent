/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.aceternity.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/landing.html',
      },
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/login.html',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/signup.html',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
