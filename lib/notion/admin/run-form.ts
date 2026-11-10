// 기록 입력 폼이 쓰는 순수 함수입니다(화면 코드와 분리해 단위 테스트합니다).
// 입력 규칙을 새로 만들지 않고 서버와 같은 parseRunInput과 읽기와 같은 소요시간 함수를 재사용합니다.
// 클라이언트 컴포넌트가 import하므로 서버 전용 모듈(client, repository, service, container)은 import하지 않습니다.
// 테스트(node --test)에서 바로 실행할 수 있도록 확장자 있는 상대 경로와 타입 import를 씁니다.
import type { ApiFailure } from "../../api/response.ts";
import { calcPaceSecondsPerKm, formatPaceLabel, parseDurationToSeconds } from "../duration.ts";
import { INTENSITIES, parseRunInput, type RunInputDto } from "./input.ts";

// 폼 입력칸의 값입니다. 숫자도 입력 중에는 문자열이라 거리는 문자열로 둡니다
export type RunFormValues = {
  title: string;
  date: string;
  distance: string;
  duration: string;
  place: string;
  memo: string;
  // 선택하지 않으면 빈 문자열
  intensity: (typeof INTENSITIES)[number] | "";
  // 쉼표로 구분한 한 칸("인터벌, 회복")
  tags: string;
};

// 오류를 표시할 수 있는 칸입니다. 특정 칸에 속하지 않는 오류는 "_form"입니다
export type RunFormField = keyof RunFormValues | "_form";
export type RunFormErrors = Partial<Record<RunFormField, string>>;

// 새 폼의 초기값입니다. 날짜는 오늘(호출하는 쪽이 한국 시간 기준으로 넘깁니다)
export function emptyRunFormValues(today: string): RunFormValues {
  return { title: "", date: today, distance: "", duration: "", place: "", memo: "", intensity: "", tags: "" };
}

// 거리 문자열을 숫자로 바꿉니다. 소수점은 마침표만 인정하고, 숫자가 아니면 NaN입니다(검증이 거부)
// 쉼표 소수점("5,2")은 태그 구분과 헷갈리고 오타일 가능성이 커서 받지 않습니다
const DISTANCE_PATTERN = /^(\d+(\.\d*)?|\.\d+)$/;
export function parseDistance(text: string): number {
  const trimmed = text.trim();
  return DISTANCE_PATTERN.test(trimmed) ? Number(trimmed) : NaN;
}

// 쉼표(전각 쉼표 포함)로 나눠 앞뒤 공백을 지우고 빈 항목을 뺍니다. 중복은 서버 스키마가 합칩니다
export function parseTags(text: string): string[] {
  return text
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

// 폼 값을 API 본문(POST /api/admin/runs)으로 바꿉니다. 검증은 하지 않으며, 검증은 서버와 같은 스키마가 합니다
export function toRunPayload(values: RunFormValues, clientKey: string) {
  return {
    title: values.title,
    date: values.date,
    distanceKm: parseDistance(values.distance),
    duration: values.duration,
    place: values.place,
    memo: values.memo,
    intensity: values.intensity === "" ? null : values.intensity,
    tags: parseTags(values.tags),
    clientKey,
  };
}

// API 본문의 항목 이름을 폼 칸 이름으로 바꿉니다(거리만 이름이 다릅니다). 모르는 이름은 "_form"입니다
const FIELD_BY_PAYLOAD_KEY: Record<string, RunFormField> = {
  title: "title",
  date: "date",
  distanceKm: "distance",
  duration: "duration",
  place: "place",
  memo: "memo",
  intensity: "intensity",
  tags: "tags",
};

function toFormErrors(details: Record<string, string>): RunFormErrors {
  const errors: RunFormErrors = {};
  for (const [key, message] of Object.entries(details)) {
    errors[FIELD_BY_PAYLOAD_KEY[key] ?? "_form"] ??= message;
  }
  return errors;
}

export type RunFormResult = { success: true; data: RunInputDto } | { success: false; errors: RunFormErrors };

// 폼 값을 서버와 같은 규칙으로 검증합니다. 통과한 값(data)은 서버에서도 같은 결과로 통과합니다
export function validateRunForm(values: RunFormValues, clientKey: string): RunFormResult {
  const result = parseRunInput(toRunPayload(values, clientKey));
  return result.success ? { success: true, data: result.data } : { success: false, errors: toFormErrors(result.fieldErrors) };
}

// 서버가 400으로 돌려준 필드별 오류(details)를 폼 칸 오류로 바꿉니다. details가 없으면 메시지를 폼 전체 오류로 씁니다
export function mapApiFailureToFieldErrors(failure: ApiFailure): RunFormErrors {
  const { details, message } = failure.error;
  return details && Object.keys(details).length > 0 ? toFormErrors(details) : { _form: message };
}

// 폼 내용의 서명입니다. 서버가 같은 기록으로 보는 입력(앞뒤 공백, 숫자 표기, 태그 중복)은 같은 서명이 되도록
// 정규화합니다. 같은 clientKey로 다시 저장했을 때 "처음 보낸 내용과 달라졌는지"를 알아보는 데 씁니다
export function payloadSignature(values: RunFormValues): string {
  return JSON.stringify({
    title: values.title.trim(),
    date: values.date,
    distanceKm: parseDistance(values.distance),
    duration: values.duration.trim(),
    place: values.place.trim(),
    memo: values.memo.trim(),
    intensity: values.intensity === "" ? null : values.intensity,
    tags: [...new Set(parseTags(values.tags))],
  });
}

// 이전 시도(서버에 닿았는지 알 수 없는 것들)의 서명 중 현재 내용과 다른 것이 하나라도 있으면 true입니다.
// 서버가 "이미 저장된 기록"이라고 답했을 때, 지금 입력한 내용이 저장된 내용과 다를 수 있음을 알리는 데 씁니다.
// 이전 시도가 없으면(다른 탭 등) 비교할 수 없으므로 false입니다
export function isContentChanged(currentSignature: string, earlierSignatures: readonly string[]): boolean {
  return earlierSignatures.some((signature) => signature !== currentSignature);
}

// 거리와 소요시간이 모두 유효할 때만 예상 페이스("5:00/km")를 돌려줍니다. 입력 오타를 눈으로 잡는 데 씁니다.
// 거리가 숫자가 아니거나 0 이하이면 calcPaceSecondsPerKm이 null을 돌려주므로 따로 검사하지 않습니다
export function previewPace(duration: string, distance: string): string | null {
  const seconds = parseDurationToSeconds(duration);
  if (seconds === null) return null;
  const pace = calcPaceSecondsPerKm(seconds, parseDistance(distance));
  return pace === null ? null : formatPaceLabel(pace);
}
