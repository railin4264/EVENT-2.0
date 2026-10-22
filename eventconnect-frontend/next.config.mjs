import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false, // Disabled to prevent Leaflet map double initialization
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    cpus: 2,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.plugins.push(new webpack.DefinePlugin({ 'process.env.NEXT_PUBLIC_APP_BUILD_ID': JSON.stringify(buildId) }));

    // Handle Leaflet for SSR
    if (isServer) {
      config.externals = [...config.externals, 'leaflet'];
    } else {
      // For client-side, ensure leaflet is available
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        canvas: false,
        encoding: false,
      };
    }

    // Preserve Next's route-aware chunks instead of loading every dependency
    // (maps, charts, editors) in a shared vendor bundle on every page.

    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "img-src 'self' data: https: http://localhost:5000 blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
