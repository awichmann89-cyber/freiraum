import { z } from "zod";

export const settingsSchema = z.object({
  adminNotificationEmail: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  senderEmail: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  senderName: z.string().trim().min(1, "Bitte einen Absendernamen angeben.").max(200),
  orgName: z.string().trim().min(1, "Bitte einen Namen angeben.").max(200),
  orgAddress: z.string().trim().max(500).optional().or(z.literal("")),
  contractFooterText: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
