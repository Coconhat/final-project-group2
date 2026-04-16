import { z } from "zod";

export const adoptionRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{7,20}$/)
    .refine((value) => value.replace(/\D/g, "").length >= 7, {
      message: "Please enter a valid phone number",
    }),
  housingType: z.string().trim().min(1).max(100),
  otherHousingType: z.string().trim().max(100).optional(),
  ownOrRent: z.string().trim().min(1).max(100),
  hasYard: z.boolean(),
  otherPets: z.string().trim().max(200).optional(),
  adultCount: z.number().min(0),
  childCount: z.number().min(0),
});
