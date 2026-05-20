import { z } from "zod";

export const timeSlotSchema = z.enum(["morning", "afternoon", "evening"]);
export const availabilityStatusSchema = z.enum([
  "available",
  "maybe",
  "unavailable",
]);
export const memberRoleSchema = z.enum(["dm", "player"]);

export const scoringWeightsSchema = z.object({
  available: z.number(),
  maybe: z.number(),
  unavailable: z.number(),
  hostBonus: z.number(),
});

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Name your campaign").max(80),
  description: z.string().trim().max(300).optional(),
  hostName: z.string().trim().min(1, "Enter your name").max(40),
  dates: z.array(z.string()).min(1, "Pick at least one date"),
  timeSlots: z.array(timeSlotSchema).min(1),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const joinCampaignSchema = z.object({
  inviteCode: z.string().trim().min(1),
  guestName: z.string().trim().min(1, "Enter your name").max(40),
});
export type JoinCampaignInput = z.infer<typeof joinCampaignSchema>;

export const setAvailabilitySchema = z.object({
  roundId: z.string(),
  memberId: z.string(),
  date: z.string(),
  timeSlot: timeSlotSchema,
  status: availabilityStatusSchema,
});
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;

export const confirmSessionSchema = z.object({
  campaignId: z.string(),
  roundId: z.string().optional(),
  date: z.string(),
  timeSlot: timeSlotSchema,
  notes: z.string().trim().max(500).optional(),
});
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;
