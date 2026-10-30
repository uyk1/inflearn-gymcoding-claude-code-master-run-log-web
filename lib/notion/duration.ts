// 소요시간 문자열(mm:ss 또는 h:mm:ss)을 초 단위로 바꿉니다. 형식이 맞지 않으면 null을 반환합니다
export function parseDurationToSeconds(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((part) => /^\d+$/.test(part))) return null;

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

// 평균 페이스(km당 시간)를 m:ss 형식으로 만듭니다. 거리가 0 이하이면 "-"를 반환합니다
export function formatPace(totalSeconds: number, distanceKm: number): string {
  if (distanceKm <= 0) return "-";

  const secondsPerKm = Math.round(totalSeconds / distanceKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
