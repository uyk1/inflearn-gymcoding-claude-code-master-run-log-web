// 화면과 API가 쓰는 러닝 기록 데이터 형태입니다. 노션 원본 구조는 여기로 들어오지 않습니다
export interface RunRecordDto {
  id: string;
  title: string;
  date: string;
  distanceKm: number;
  durationText: string;
  durationSeconds: number;
  paceText: string;
  place: string;
  intensity: string | null;
  memo: string;
  tags: string[];
  source: string | null;
  externalId: string;
  notionUrl: string;
}
