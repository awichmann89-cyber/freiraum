import { z } from "zod";

export const createGroupSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  displayName: z.string().trim().min(2, "Bitte einen Namen angeben.").max(200),
  password: z.string().min(8, "Mindestens 8 Zeichen.").max(200),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "Mindestens 8 Zeichen.").max(200),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
