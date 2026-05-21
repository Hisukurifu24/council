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
  minPlayers: z.number().int().min(0).max(50),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(4, "Use at least 4 characters").max(100),
  displayName: z.string().trim().min(1, "Enter your name").max(40),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(100),
});
export type LogInInput = z.infer<typeof logInSchema>;

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
