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
  images: {
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
    ],
  },
  // better-sqlite3는 서버 사이드에서만 사용 (Turbopack 호환)
  serverExternalPackages: [
    'better-sqlite3',
    // Google Cloud SDKs는 서버 번들링 시 문제가 생길 수 있어 외부 패키지로 처리
    '@google-cloud/text-to-speech',
    'google-gax',
  ],
  // 배포 시 data 폴더의 demo.db 파일을 포함시킴
  // Vercel 등 서버리스 환경에서 파일 추적에 포함
  // Next.js 16에서는 experimental에서 최상위로 이동
  outputFileTracingIncludes: {
    '/api/**': [
      './data/**/*',
      '../data/**/*',
    ],
  },
};

export default nextConfig;
