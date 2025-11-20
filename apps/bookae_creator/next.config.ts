import type { NextConfig } from "next";

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
    ],
  },
  // better-sqlite3는 서버 사이드에서만 사용 (Turbopack 호환)
  serverExternalPackages: ['better-sqlite3'],
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
