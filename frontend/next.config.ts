import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
  webpack: (config, { isServer }) => {
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

    return config;
  },
};

export default nextConfig;
