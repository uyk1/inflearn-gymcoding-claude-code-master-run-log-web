// 화면과 API가 쓰는 러닝 기록 데이터 형태입니다. 노션 원본 구조는 여기로 들어오지 않습니다
export interface RunRecordDto {
  id: string;
  title: string;
  date: string;
  distanceKm: number;
  durationText: string;
  durationSeconds: number;
  paceSecondsPerKm: number | null;
  place: string;
  intensity: string | null;
  memo: string;
  tags: string[];
  source: string | null;
  externalId: string;
  notionUrl: string;
}

// 목록에서 제외되는 사유입니다. 서버 로그와 화면 안내가 같은 문구를 씁니다
export type ExcludedReason =
  | "제목 없음"
  | "날짜 없음"
  | "날짜 형식 오류"
  | "거리 없음"
  | "소요시간 없음"
  | "소요시간 형식 오류";

// 필수 값이 없거나 형식이 틀려 목록에서 제외된 노션 행의 안내 정보입니다.
// 제목은 어떤 행인지 알아보도록 담고, 날짜·거리·소요시간 같은 나머지 입력값은 담지 않습니다
export interface ExcludedRunDto {
  pageId: string;
  title: string | null;
  reasons: ExcludedReason[];
  notionUrl: string;
}

// 목록 조회 결과입니다. 정상 기록과 제외된 행을 함께 돌려줍니다
export interface RunRecordListDto {
  records: RunRecordDto[];
  excluded: ExcludedRunDto[];
}
