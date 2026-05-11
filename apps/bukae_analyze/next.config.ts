import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBase) return [];
    return [
      // /api/v1/* 는 app/api/v1/[...path]/route.ts BFF 프록시가 담당
      {
        source: "/oauth2/:path*",
        destination: `${apiBase}/oauth2/:path*`,
      },
    ];
  },
};

export default nextConfig;
