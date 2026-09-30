import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  productionBrowserSourceMaps: false,
  transpilePackages: ['motion'],
  allowedDevOrigins: ['.monkeycode-ai.live'],
  async headers() {
    return [
      {
        source: '/downloads/:path*',
        headers: [
          { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
          { key: 'Content-Disposition', value: 'attachment; filename="Flowexa.apk"' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    if (!dev) {
      config.devtool = false;
      config.parallelism = 1;
      if (config.optimization) {
        config.optimization.minimize = false;
      }
    }
    return config;
  },
};

export default nextConfig;
