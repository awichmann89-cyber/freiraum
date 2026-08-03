import { prisma } from "@/lib/prisma";

export const SETTING_DEFAULTS = {
  hausName: "Freiraum",
  contractTokenDays: "30",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting(key: SettingKey): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key];
}

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    if (map[key] !== undefined) result[key] = map[key];
  }
  return result;
}

export async function setSetting(key: SettingKey, value: string) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Atomar hochgezählte Vermietungsnummer, z.B. "V-2026-003" (Zähler pro Jahr). */
export async function nextVermietungsNummer(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `vermietungCounter:${year}`;
  const rows = await prisma.$queryRaw<{ value: string }[]>`
    INSERT INTO "Setting" ("key", "value", "updatedAt")
    VALUES (${key}, '1', now())
    ON CONFLICT ("key")
    DO UPDATE SET "value" = ((CAST("Setting"."value" AS INTEGER)) + 1)::text, "updatedAt" = now()
    RETURNING "value"`;
  const n = parseInt(rows[0].value, 10);
  return `V-${year}-${String(n).padStart(3, "0")}`;
}
