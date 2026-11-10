// 수정 화면의 "내용 버전"입니다. 수정 화면을 열 때의 내용과 저장할 때 노션의 현재 내용이 같은지 비교하는 데 씁니다.
//
// 노션의 last_edited_time은 분 단위 정밀도(초와 밀리초가 항상 0)라 같은 분 안의 수정을 놓치므로, 시각 대신 내용으로 비교합니다.
// 버전은 우리가 쓰는 입력 필드 8개만 반영합니다. 출처·외부ID나 last_edited_time이 바뀌어도 버전은 그대로여서
// 노션에서 그런 항목을 바꿔도 충돌로 보지 않습니다. 같은 내용이면 항상 같은 값이 나옵니다(payloadSignature의 정규화를 따름).
//
// 서버에서만 씁니다(node:crypto). 클라이언트 컴포넌트는 이 모듈을 import하지 않고, 서버가 준 버전 문자열을 그대로 돌려보냅니다.
import { createHash } from "node:crypto";

import { payloadSignature, type RunFormValues } from "./run-form.ts";

export function computeVersion(values: RunFormValues): string {
  return createHash("sha256").update(payloadSignature(values)).digest("hex").slice(0, 32);
}
