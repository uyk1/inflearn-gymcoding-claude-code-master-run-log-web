// 세션 토큰의 서명과 검증만 담당하는 순수 모듈입니다.
// Web Crypto(globalThis.crypto.subtle)만 쓰므로 Node, 미들웨어(Edge) 어디서나 같은 코드로 동작하고,
// 단위 테스트(node --test)에서 쓸 수 있도록 어떤 모듈도 import하지 않습니다.
// 형식: base64url(payload).base64url(HMAC-SHA256 서명), payload는 만료 시각(epoch ms) 문자열입니다.

const encoder = new TextEncoder();

// 문자열 → base64url
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// base64url → 바이트 (형식이 틀리면 null)
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

// 비밀값으로 HMAC 키를 만듭니다
function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

// 만료 시각(epoch ms)을 담아 서명한 토큰을 만듭니다
export async function createSessionToken(secret: string, expiresAtMs: number): Promise<string> {
  const payload = encoder.encode(String(Math.floor(expiresAtMs)));
  const key = await importKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, payload));
  return `${toBase64Url(payload)}.${toBase64Url(signature)}`;
}

// 서명과 만료를 모두 확인합니다. 형식이 틀리거나 변조·만료된 토큰은 false입니다
export async function verifySessionToken(secret: string, token: string | undefined, nowMs: number): Promise<boolean> {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const payload = fromBase64Url(parts[0]);
  const signature = fromBase64Url(parts[1]);
  if (!payload || !signature) return false;

  // crypto.subtle.verify는 서명 비교를 상수 시간으로 처리합니다
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, signature, payload);
  if (!valid) return false;

  const expiresAtMs = Number(new TextDecoder().decode(payload));
  return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
}
