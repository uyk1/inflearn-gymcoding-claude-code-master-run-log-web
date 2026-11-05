"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

// 표준 타입에 없는 beforeinstallprompt 이벤트입니다 (Chromium 계열: Chrome, Samsung Internet 등)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// 서버에서는 기기를 알 수 없으므로 마운트 후에만 판별합니다
function isIos(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // iPadOS는 Mac처럼 보이므로 터치 지원 여부로 구분합니다
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

// 이미 홈 화면 앱으로 실행 중이면 안내가 필요 없습니다 (iOS는 navigator.standalone)
function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallGuide() {
  const [mounted, setMounted] = useState(false);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setIos(isIos());
    setStandalone(isStandalone());
    setMounted(true);

    function handleBeforeInstallPrompt(event: Event) {
      // 브라우저 기본 배너를 막고, 버튼을 눌렀을 때 직접 띄웁니다
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    function handleAppInstalled() {
      setInstallEvent(null);
      setStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch (error) {
      // 설치 창을 띄우지 못해도 화면은 그대로 쓸 수 있으므로 기록만 남깁니다
      console.warn("앱 설치 창을 열지 못했습니다.", error);
    } finally {
      // 이벤트는 한 번만 쓸 수 있으므로 결과와 관계없이 비웁니다
      setInstallEvent(null);
    }
  }

  if (!mounted || standalone) return null;

  // 설치 프롬프트를 지원하는 브라우저(안드로이드 Chrome, Samsung Internet)에서는 버튼을 보여 줍니다
  if (installEvent) {
    return (
      <div className="container mx-auto px-4 pb-6">
        <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="break-keep text-muted-foreground">홈 화면에 추가하면 앱처럼 바로 실행할 수 있습니다.</p>
          <Button onClick={handleInstall} className="w-full sm:w-auto">
            <Download aria-hidden="true" />앱 설치
          </Button>
        </div>
      </div>
    );
  }

  // 아이폰은 설치 프롬프트가 없어 직접 안내합니다
  if (ios) {
    return (
      <div className="container mx-auto px-4 pb-6">
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Share className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-keep">
              Safari에서 <strong className="text-foreground">공유 → 홈 화면에 추가</strong>를 누르면 앱처럼 실행할 수 있습니다.
            </span>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
