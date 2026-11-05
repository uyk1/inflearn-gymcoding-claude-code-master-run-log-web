import type { NextConfig } from "next";

// 모든 응답에 붙이는 보안 헤더입니다. CSP는 차트의 인라인 스타일 때문에 nonce 설정이 필요해 아직 넣지 않았습니다
const securityHeaders = [
  // 브라우저가 응답의 Content-Type을 멋대로 추측하지 않게 합니다
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 다른 사이트로 이동할 때 주소 전체 대신 출처만 보냅니다
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 다른 사이트가 이 앱을 iframe으로 감싸는 것(클릭재킹)을 막습니다
  { key: "X-Frame-Options", value: "DENY" },
  // 쓰지 않는 브라우저 기능을 끕니다
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // X-Powered-By: Next.js 헤더를 숨깁니다
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
