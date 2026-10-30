// 서버 전용 모듈입니다. 클라이언트 컴포넌트에서 import하면 빌드가 실패합니다
import "server-only";
import { Client } from "@notionhq/client";
import { AppError } from "@/lib/errors";

// 노션 클라이언트는 서버에서만 만듭니다. 키는 NEXT_PUBLIC_ 접두사가 없어 브라우저로 나가지 않습니다
export function createNotionClient(): Client {
  const auth = process.env.NOTION_API_KEY;
  if (!auth) {
    throw new AppError("CONFIG_MISSING", "NOTION_API_KEY가 설정되지 않았습니다.", 500);
  }
  return new Client({ auth });
}
