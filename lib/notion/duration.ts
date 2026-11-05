// 소요시간 문자열(mm:ss 또는 h:mm:ss)을 초 단위로 바꿉니다. 형식이 맞지 않으면 null을 반환합니다
// 첫 구간은 자릿수 자유, 이후 구간(초, 분)은 반드시 두 자리입니다 ("12:5" 같은 오타 방지)
export function parseDurationToSeconds(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((part, index) => (index === 0 ? /^\d+$/ : /^\d{2}$/).test(part))) return null;

  const numbers = parts.map(Number);
  const [hours, minutes, seconds] = parts.length === 3 ? numbers : [0, ...numbers];

  // h:mm:ss에서는 분이 0~59 사이여야 합니다. mm:ss의 분은 제한하지 않습니다
  if (parts.length === 3 && minutes > 59) return null;
  if (seconds > 59) return null;

  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

// 초 단위 값을 화면 표시용 문자열로 바꿉니다. 1시간 이상이면 h:mm:ss, 아니면 mm:ss입니다
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

// 평균 페이스를 km당 초 단위 숫자로 계산합니다. 거리가 0 이하이거나 유한한 숫자가 아니면 null을 반환합니다
export function calcPaceSecondsPerKm(totalSeconds: number, distanceKm: number): number | null {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;
  return Math.round(totalSeconds / distanceKm);
}

// 페이스(km당 초)를 화면 표시용 m:ss/km로 바꿉니다. 페이스가 없으면(null) "-"를 반환합니다. 분은 상한을 두지 않습니다
export function formatPaceLabel(paceSecondsPerKm: number | null): string {
  if (paceSecondsPerKm === null) return "-";

  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = paceSecondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

// 거리(km)를 화면 표시용으로 바꿉니다. 소수 둘째 자리까지만 보여 주고(불필요한 0은 붙이지 않음), 데이터는 바꾸지 않습니다
// 외부 앱에서 가져온 10.123456789 같은 긴 값이 카드 칸을 넘치지 않게 합니다
export function formatDistanceLabel(distanceKm: number): string {
  return `${Number(distanceKm.toFixed(2))} km`;
}
