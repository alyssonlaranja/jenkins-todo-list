import type { NextConfig } from 'next'

const getBaseApplicationPath = () => {
  if (!process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH) {
    return ''
  }
  return `/${process.env.NEXT_PUBLIC_CUSTOM_BASE_PATH}`
}

const nextConfig: NextConfig = {
  // External packages that should not be bundled on the server
  // pdf-parse has native dependencies that don't work well with bundling
  serverExternalPackages: ['pdf-parse'],

  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  /**
   * Webpack configuration to handle module resolution
   */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    // Fix for font files - ensure they are treated as assets, not modules
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
    })

    // YAML loader for module manifests
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: 'yaml-loader',
    })

    return config
  },

  /**
   * Environment Variable Exposure
   * Explicitly maps selected environment variables so that during build they are inlined.
   * NOTE: Variables prefixed with NEXT_PUBLIC_ are already exposed automatically; this block
   * documents and centralizes which public runtime configuration values we rely upon and allows
   * adding non-prefixed safe values if needed (never put secrets here).
   */

  /**
   * Shared Environment Variables
   * Defines custom environment variables accessible in the JavaScript bundle.
   * Reference: https://nextjs.org/docs/app/api-reference/config/next-config-js/env
   */
  env: {
    // Internal (server-only) URL example – only include if intentionally safe to expose.
    // COCKPIT_API_INTERNAL_URL is not defined in .env.local currently; add there if required.
  },

  basePath: getBaseApplicationPath(),

  /**
   * Build and Output Configuration
   * Settings for build identifiers, output type, and caching.
   */
  // Custom build ID for production, e.g., commit hash or timestamp
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${new Date().getTime()}`
  },

  // Enables standalone output mode, ideal for Docker deployments
  output: 'standalone',

  /**
   * Performance Optimization
   * Compression and caching settings to improve load times.
   */
  // Enables response compression for better performance
  compress: true,

  /**
   * Asset and Image Handling
   * Configuration for static assets like images and fonts.
   */
  images: {
    // Patterns for remote images (empty by default)
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4200',
        pathname: '/api/video-assets/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4200',
        pathname: '/api/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4200',
        pathname: '/uploads/**',
      },
    ],
    // Minimum cache time for images in seconds (1 minute recommended for production)
    minimumCacheTTL: 60,
    // Prioritizes modern image formats for better performance
    formats: ['image/webp', 'image/avif'],
  },

  /**
   * HTTP Headers
   * Custom headers for security, streaming, and caching.
   */
  async headers() {
    return [
      {
        source: '/:path*{/}?',
        headers: [
          { key: 'X-Accel-Buffering', value: 'no' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // FIX: Corrigido o formato do Permissions-Policy
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },

          // Content Security Policy - COM Azure Container Apps
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' 'unsafe-eval' 'unsafe-inline' *.avanade.ai *.azurecontainerapps.io",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.botframework.com *.jsdelivr.net blob:",
              "worker-src 'self' blob:",
              "img-src 'self' *.avanade.ai *.azurecontainerapps.io data: blob: *.blob.core.windows.net",
              "media-src 'self' *.avanade.ai *.azurecontainerapps.io data: blob: *.blob.core.windows.net",
              "connect-src 'self' *.avanade.ai *.azurecontainerapps.io wss://*.avanade.ai wss://*.azurecontainerapps.io ws://*.avanade.ai ws://*.azurecontainerapps.io https://*.avanade.ai https://*.azurecontainerapps.io wss://websocket-server-service *.microsoftonline.com *.microsoft.com *.blob.core.windows.net *.copilotkit.ai *.jsdelivr.net",
              "font-src 'self' data: *.avanade.ai *.gstatic.com fonts.gstatic.com",
              "style-src 'self' 'unsafe-inline' *.googleapis.com fonts.googleapis.com *.jsdelivr.net",
              'upgrade-insecure-requests',
              'block-all-mixed-content',
            ].join('; '),
          },
        ],
      },
    ]
  },

  /**
   * Redirects
   * URL redirects for legacy routes.
   */
  async redirects() {
    return [
      {
        source: '/sda',
        destination: '/sda2',
        permanent: true,
      },
    ]
  },

  /**
   * React Configuration
   * Settings specific to React behavior.
   */
  // Enables React Strict Mode for better error detection
  reactStrictMode: true,

  /**
   * Miscellaneous
   * Additional Next.js configurations.
   */
  // Removes "Powered by Next.js" from the HTML response
  poweredByHeader: false,

  // Configures logging for fetch requests
  logging: {
    fetches: {
      fullUrl: true, // Logs full URLs for debugging
    },
  },

  // Fixed TypeScript and ESLint configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  /**
   * Dependency Transpilation
   * Ensures compatibility for specific packages.
   */
  transpilePackages: ['@ai-sdk/react', 'ai'],

  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
}

export default nextConfig
