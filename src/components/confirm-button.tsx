"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

export function ConfirmButton({
  action,
  confirmText,
  children,
  variant = "ghost",
  size = "sm",
  successText,
}: {
  action: () => Promise<ActionResult>;
  confirmText: string;
  children: React.ReactNode;
  variant?: "ghost" | "destructive" | "outline" | "default" | "secondary";
  size?: "sm" | "default" | "icon";
  successText?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        startTransition(async () => {
          const result = await action();
          if (result && "error" in result) {
            toast.error(result.error);
          } else if (successText) {
            toast.success(successText);
          }
        });
      }}
    >
      {children}
    </Button>
  );
}
