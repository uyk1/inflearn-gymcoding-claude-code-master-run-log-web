import { requireAdmin } from "@/lib/auth/require-admin";

// 로그인 화면(/admin/login)을 뺀 관리자 화면 전체의 서버 측 확인입니다.
// 라우트 그룹 (protected)라서 주소에는 나타나지 않습니다(/admin, /admin/runs/... 그대로)
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
