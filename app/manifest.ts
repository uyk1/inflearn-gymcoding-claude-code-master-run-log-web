import type { MetadataRoute } from "next";

// 아이콘 배경이 순검정이라 스플래시와 상태 표시줄 색도 검정으로 맞춥니다
const THEME_COLOR = "#000000";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Run Log",
    short_name: "Run Log",
    description: "러닝 기록을 노션에 쌓고 살펴보는 웹 앱",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // 안드로이드 원형·둥근 마스크에 잘리지 않도록 여백을 둔 버전입니다
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
