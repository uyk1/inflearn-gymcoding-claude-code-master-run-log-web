import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

// 서버 액션을 폼으로 호출하는 로그아웃 버튼입니다(클라이언트 상태가 필요 없어 서버 컴포넌트)
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline">
        로그아웃
      </Button>
    </form>
  );
}
