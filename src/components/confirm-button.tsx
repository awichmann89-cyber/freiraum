"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={isPending}
        onClick={() => setOpen(true)}
      >
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        description={confirmText}
        isPending={isPending}
        onConfirm={() => {
          startTransition(async () => {
            const result = await action();
            setOpen(false);
            if (result && "error" in result) {
              toast.error(result.error);
            } else if (successText) {
              toast.success(successText);
            }
          });
        }}
      />
    </>
  );
}
