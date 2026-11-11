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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 확인 단계가 열리면 그 영역으로, 취소로 닫히면 삭제 버튼으로 포커스를 옮깁니다
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  function cancel() {
    restoreFocusRef.current = true;
    setConfirming(false);
    setError(null);
  }

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
      <Button ref={triggerRef} type="button" variant="outline" size="lg" className="text-destructive w-full" onClick={() => setConfirming(true)}>
        이 기록 삭제
      </Button>
    );
  }

  return (
    <div
      ref={confirmRef}
      tabIndex={-1}
      // 화면을 막지 않는 인라인 확인이라 모달(alertdialog)이 아니라 그룹으로 표시하고, Esc로 취소할 수 있게 합니다
      role="group"
      aria-labelledby="delete-run-message"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) cancel();
      }}
      className="border-destructive/50 space-y-3 rounded-xl border p-4 outline-none"
    >
      <p id="delete-run-message" className="text-sm break-keep">
        <strong className="font-semibold">{title}</strong> 기록을 삭제할까요? 노션 휴지통으로 이동하며 노션에서 복구할 수 있습니다.
      </p>
      {error && <FieldError>{error}</FieldError>}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={busy}
          onClick={cancel}
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
