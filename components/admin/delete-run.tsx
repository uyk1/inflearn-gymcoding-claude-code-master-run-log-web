"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { ApiFailure, ApiSuccess } from "@/lib/api/response";

// 기록 삭제(노션 휴지통 이동)입니다. 버튼을 누르면 화면 안 확인 단계를 거치고, 확정해야 DELETE를 보냅니다.
// version은 이 화면이 마지막으로 노션과 맞춘 내용 버전이며(열 때 받은 값, 저장하면 새 값), 노션에서 먼저 바뀌었으면 삭제되지 않습니다
export function DeleteRun({ id, title, version }: { id: string; title: string; version: string }) {
  const router = useRouter();
  const inFlightRef = useRef(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 노션에서 먼저 바뀐 내용이 있어 삭제하지 않은 경우(최신 내용을 불러온 뒤 다시 확인해야 함)
  const [conflict, setConflict] = useState(false);

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
    setConflict(false);
  }

  async function remove() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      const response = await fetch(`/api/admin/runs/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const body = (await response.json().catch(() => null)) as ApiSuccess<{ id: string }> | ApiFailure | null;
      // 이미 삭제된 기록(404)도 목록에서는 사라진 상태이므로 목록으로 보냅니다
      if ((response.ok && body?.success) || response.status === 404) {
        router.push("/admin/runs");
        router.refresh();
        return;
      }
      if (response.status === 409) {
        setConflict(true);
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
      {conflict && (
        <FieldError>
          노션에서 먼저 바뀐 내용이 있어 삭제하지 않았습니다. 최신 내용을 불러와 확인한 뒤 다시 삭제해 주세요. 불러오면 지금 입력한 내용은 사라집니다.
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-3 w-full"
            onClick={() => {
              cancel();
              router.refresh();
            }}
          >
            최신 내용 불러오기
          </Button>
        </FieldError>
      )}
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
        {/* 충돌 안내가 떠 있으면 이 버전으로는 삭제되지 않으므로, 최신 내용을 불러올 때까지 막습니다 */}
        <Button type="button" variant="destructive" size="lg" disabled={busy || conflict} onClick={remove}>
          {busy ? "삭제 중..." : "삭제"}
        </Button>
      </div>
    </div>
  );
}
