import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      '@/components/ui',
      '@/features/competitors',
      '@/features/ads',
      '@/features/dashboard',
      'lucide-react'
    ],
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  async rewrites() {
    const baseRaw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:8000';
    const base = baseRaw.includes('localhost') ? baseRaw.replace('localhost', '127.0.0.1') : baseRaw;
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
    ];
  },
  
  webpack: (config, { isServer, dev }) => {
    // FFmpeg.wasm configuration for Web Workers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // Ignore FFmpeg on server-side
    if (isServer) {
      config.externals = [...(config.externals || []), '@ffmpeg/ffmpeg', '@ffmpeg/util'];
    }

    // Bundle splitting optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separate chunk for UI components
            ui: {
              name: 'ui',
              test: /[\\/]components[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 20,
            },
            // Separate chunk for competitors feature
            competitors: {
              name: 'competitors',
              test: /[\\/]features[\\/]competitors[\\/]/,
              chunks: 'all',
              priority: 15,
            },
            // Separate chunk for other features
            features: {
              name: 'features',
              test: /[\\/]features[\\/]/,
              chunks: 'all',
              priority: 10,
            },
            // Separate chunk for large libraries
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Separate chunk for icons
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              chunks: 'all',
              priority: 25,
            },
          },
        },
      };
    }

    return config;
  },
};

export default nextConfig;
