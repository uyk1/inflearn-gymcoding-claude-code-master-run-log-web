import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

// 목록이 비어 있을 때 보여주는 안내 문구
export function EmptyState({ children, className }: EmptyStateProps) {
  return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>;
}
