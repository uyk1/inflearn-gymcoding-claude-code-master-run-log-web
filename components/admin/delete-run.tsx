"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";

// 기록 삭제(노션 휴지통 이동)입니다. 버튼을 누르면 화면 안 확인 단계를 거치고, 확정해야 DELETE를 보냅니다
export function DeleteRun({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  async function remove() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/runs/${id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as ApiSuccess<{ id: string }> | ApiFailure | null;
      // 이미 삭제된 기록(404)도 목록에서는 사라진 상태이므로 목록으로 보냅니다
      if ((response.ok && body?.success) || response.status === 404) {
        router.push("/admin/runs");
        router.refresh();
        return;
      }
      setError(
        response.status === 401
          ? "로그인 시간이 지났습니다. 새 탭에서 로그인한 뒤 다시 시도해 주세요."
          : body && !body.success
            ? body.error.message
            : "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } catch {
      setError("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="lg" className="text-destructive w-full" onClick={() => setConfirming(true)}>
        이 기록 삭제
      </Button>
    );
  }

  return (
    <div
      ref={confirmRef}
      tabIndex={-1}
      role="alertdialog"
      aria-label="기록 삭제 확인"
      className="border-destructive/50 space-y-3 rounded-xl border p-4 outline-none"
    >
      <p className="text-sm break-keep">
        <strong className="font-semibold">{title}</strong> 기록을 삭제할까요? 노션 휴지통으로 이동하며 노션에서 복구할 수 있습니다.
      </p>
      {error && <FieldError>{error}</FieldError>}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          취소
        </Button>
        <Button type="button" variant="destructive" size="lg" disabled={busy} onClick={remove}>
          {busy ? "삭제 중..." : "삭제"}
        </Button>
      </div>
    </div>
  );
}
