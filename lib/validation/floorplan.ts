import { z } from "zod";

export const hotspotPointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

export const hotspotSchema = z.object({
  floorplanId: z.uuid(),
  roomId: z.uuid(),
  shape: z.enum(["rect", "polygon"]),
  coordinates: z.array(hotspotPointSchema).min(2),
  label: z.string().trim().max(200).optional().or(z.literal("")),
});

export type HotspotInput = z.infer<typeof hotspotSchema>;
