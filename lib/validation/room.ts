import { z } from "zod";

export const roomSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  capacity: z.number().int().min(1).max(10000).optional().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
});

export type RoomInput = z.infer<typeof roomSchema>;
