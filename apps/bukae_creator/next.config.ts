import type { NextConfig } from "next";

// Supabase Storage 도메인 추출
const getSupabaseHostname = (): string | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  
  try {
    const url = new URL(supabaseUrl);
    return url.hostname;
  } catch {
    return null;
  }
};

const supabaseHostname = getSupabaseHostname();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 기존 video/create step URL 리다이렉트 (step1은 공용, fast/step1은 공용 step1으로)
  async redirects() {
    return [
      { source: '/video/create/fast/step1', destination: '/video/create/step1?track=fast', permanent: true },
      { source: '/video/create/pro/step1', destination: '/video/create/step1?track=pro', permanent: true },
      { source: '/video/create/step2', destination: '/video/create/fast/step2', permanent: true },
      { source: '/video/create/step3', destination: '/video/create/fast/step3', permanent: true },
      { source: '/video/create/step4', destination: '/video/create/fast/step4', permanent: true },
      { source: '/video/create/script-method', destination: '/video/create/fast/script-method', permanent: true },
    ];
  },
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      // YouTube 썸네일
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      // Google profile 이미지
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Supabase Storage 도메인 추가
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
            },
          ]
        : []),
      // 알리익스프레스 이미지 도메인
      {
        protocol: 'https',
        hostname: '*.aliexpress-media.com',
      },
      {
        protocol: 'https',
        hostname: '*.alicdn.com',
      },
      // 쿠팡 이미지 도메인
      {
        protocol: 'https',
        hostname: '*.coupangcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'ads-partners.coupang.com',
      },
      // 아마존 이미지 도메인 (향후 사용)
      {
        protocol: 'https',
        hostname: '*.ssl-images-amazon.com',
      },
    ],
  },
  // better-sqlite3는 서버 사이드에서만 사용 (Turbopack 호환)
  serverExternalPackages: [
    'better-sqlite3',
    // Google Cloud SDKs는 서버 번들링 시 문제가 생길 수 있어 외부 패키지로 처리
    '@google-cloud/text-to-speech',
    'google-gax',
  ],
  // 보안 헤더 추가
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Turbopack 설정 (개발 환경에서 사용)
  // Next.js 16에서는 Turbopack이 기본이므로 빈 설정 추가하여 webpack과의 충돌 방지
  turbopack: {},
  // 프로덕션 빌드에서 console.log 제거
  // SWC를 사용하여 클라이언트와 서버 모두에서 console 제거
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // error와 warn은 유지
    } : false,
  },
  // webpack 설정 (SWC가 작동하지 않는 경우를 위한 fallback)
  webpack: (config, { dev, isServer }) => {
    // 프로덕션 빌드에서만 webpack 설정 적용
    if (!dev && !isServer) {
      // 클라이언트 사이드 프로덕션 빌드에서만 console 제거
      try {
        const TerserPlugin = require('terser-webpack-plugin');
        const existingMinimizer = config.optimization?.minimizer || [];
        
        // 기존 minimizer가 배열인지 확인
        const minimizerArray = Array.isArray(existingMinimizer) 
          ? existingMinimizer 
          : [];
        
        config.optimization = {
          ...config.optimization,
          minimize: true,
          minimizer: [
            ...minimizerArray,
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true, // console.log, console.debug, console.info 제거
                  drop_debugger: true, // debugger 제거
                },
              },
            }),
          ],
        };
      } catch (error) {
        // TerserPlugin을 사용할 수 없는 경우 무시 (Next.js 기본 최적화 사용)
      }
    }
    return config;
  },
};

export default nextConfig;
