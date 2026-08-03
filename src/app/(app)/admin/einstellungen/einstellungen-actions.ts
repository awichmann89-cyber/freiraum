"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { setSetting, type SettingKey } from "@/lib/settings";
import type { ActionResult } from "@/lib/action-result";

const EDITABLE_KEYS: SettingKey[] = ["hausName", "contractTokenDays"];

export async function saveSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  for (const key of EDITABLE_KEYS) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim() !== "") {
      await setSetting(key, value.trim());
    }
  }

  revalidatePath("/admin/einstellungen");
  return { ok: true };
}
