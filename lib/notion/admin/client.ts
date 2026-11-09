// 관리자 쓰기 전용 노션 클라이언트입니다. 서버 전용이며, 클라이언트 컴포넌트에서 import하면 빌드가 실패합니다.
// 공개 화면이 쓰는 lib/notion/client.ts(NOTION_API_KEY, 읽기 전용 권장)와 키와 코드 경로를 분리합니다.
// 이 폴더(lib/notion/admin)는 관리자 영역(app/admin, app/api/admin, components/admin)에서만 import할 수 있고,
// 그 밖에서 import하면 ESLint(no-restricted-imports)가 막습니다.
import "server-only";
import { Client } from "@notionhq/client";
import { AppError } from "@/lib/errors";

// 키는 NEXT_PUBLIC_ 접두사가 없어 브라우저로 나가지 않으며, 값은 로그에 남기지 않습니다
export function createAdminNotionClient(): Client {
  const auth = process.env.NOTION_ADMIN_API_KEY;
  if (!auth) {
    throw new AppError("CONFIG_MISSING", "NOTION_ADMIN_API_KEY가 설정되지 않았습니다.", 500);
  }
  return new Client({ auth });
}
