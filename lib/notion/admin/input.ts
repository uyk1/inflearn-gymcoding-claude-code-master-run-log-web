// 관리자 웹 입력의 검증 규칙입니다. 읽기(mapper)와 같은 함수(parseDurationToSeconds, normalizeNotionDate)를 써서
// "입력할 때 통과한 값은 목록에서 제외되지 않는다"는 것을 보장합니다. 읽기보다 엄격한 것은 괜찮고, 느슨하면 안 됩니다.
// 테스트(node --test)에서 바로 실행할 수 있도록 별칭(@/) 대신 확장자 있는 상대 경로로 import합니다.
import { z } from "zod";

import { normalizeNotionDate } from "../date.ts";
import { parseDurationToSeconds } from "../duration.ts";

// 강도 선택지(노션 select 옵션과 같은 이름)
export const INTENSITIES = ["EASY", "NORMAL", "HARD"] as const;

// 길이 상한. 노션 rich_text 한 덩어리의 한도(2000자)보다 충분히 작게 둡니다
const LIMIT = { title: 100, place: 200, memo: 1000, tag: 30, tags: 10, distanceKm: 1000 } as const;

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

// 오류 문구에는 입력값을 담지 않습니다(로그·응답에 입력값이 남지 않게 하기 위해)
export const runInputSchema = z.strictObject(
  {
    title: z
      .string({ error: "제목을 입력해 주세요." })
      .trim()
      .min(1, "제목을 입력해 주세요.")
      .max(LIMIT.title, `제목은 ${LIMIT.title}자 이하로 입력해 주세요.`),
    // 날짜만 받습니다(시간 포함 형식은 거부). 달력에 있는 날짜인지 읽기와 같은 함수로 확인합니다
    date: z
      .string({ error: "날짜를 입력해 주세요." })
      .refine((value) => dateOnly.test(value) && normalizeNotionDate(value) === value, "올바른 날짜(YYYY-MM-DD)를 입력해 주세요."),
    // 읽기는 0도 받지만, 웹 입력은 0보다 큰 값만 받습니다(더 엄격)
    distanceKm: z
      .number({ error: "거리를 숫자로 입력해 주세요." })
      .positive("거리는 0보다 커야 합니다.")
      .max(LIMIT.distanceKm, `거리는 ${LIMIT.distanceKm}km 이하로 입력해 주세요.`),
    // mm:ss 또는 h:mm:ss. 초와 h:mm:ss의 분은 두 자리(12:5 같은 입력은 거부). 앞뒤 공백만 지우고 입력 그대로 저장합니다
    duration: z
      .string({ error: "소요시간을 입력해 주세요." })
      .trim()
      .refine((value) => parseDurationToSeconds(value) !== null, "소요시간은 mm:ss 또는 h:mm:ss 형식(초와 분은 두 자리)으로 입력해 주세요."),
    place: z.string().trim().max(LIMIT.place, `장소는 ${LIMIT.place}자 이하로 입력해 주세요.`).default(""),
    memo: z.string().trim().max(LIMIT.memo, `메모는 ${LIMIT.memo}자 이하로 입력해 주세요.`).default(""),
    intensity: z
      .enum(INTENSITIES, { error: "강도는 EASY, NORMAL, HARD 중에서 고르세요." })
      .nullish()
      .transform((value) => value ?? null),
    // 노션 multi_select 이름에는 쉼표를 쓸 수 없습니다. 중복은 하나로 합칩니다
    tags: z
      .array(
        z
          .string()
          .trim()
          .min(1, "빈 태그는 쓸 수 없습니다.")
          .max(LIMIT.tag, `태그는 ${LIMIT.tag}자 이하로 입력해 주세요.`)
          .refine((value) => !value.includes(","), "태그에는 쉼표를 쓸 수 없습니다."),
        { error: "태그는 문자열 목록이어야 합니다." },
      )
      .max(LIMIT.tags, `태그는 ${LIMIT.tags}개 이하로 입력해 주세요.`)
      .default([])
      .transform((tags) => [...new Set(tags)]),
    // 폼이 제출마다 만드는 고유 키(UUID). 외부ID에 저장해 같은 제출이 두 번 만들어지지 않게 합니다
    clientKey: z.uuid({ error: "요청 식별값이 올바르지 않습니다." }),
  },
  { error: "입력 형식이 올바르지 않습니다." },
);

// 검증을 통과한 입력(기본값과 정리가 적용된 값)
export type RunInputDto = z.output<typeof runInputSchema>;

// 아직 검증되지 않은 입력의 형태(폼이 보내는 값)
export type RunInputRaw = z.input<typeof runInputSchema>;

export type RunInputResult =
  | { success: true; data: RunInputDto }
  // 필드 이름 → 첫 번째 오류 문구. 스키마에 없는 항목은 "_form" 키로 담습니다
  | { success: false; fieldErrors: Record<string, string> };

// 입력을 검증합니다. 실패하면 필드별 오류 문구만 돌려주고 입력값은 담지 않습니다
export function parseRunInput(raw: unknown): RunInputResult {
  const result = runInputSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.code === "unrecognized_keys" || issue.path.length === 0 ? "_form" : String(issue.path[0]);
    fieldErrors[key] ??= issue.code === "unrecognized_keys" ? "허용되지 않는 항목이 포함되어 있습니다." : issue.message;
  }
  return { success: false, fieldErrors };
}
