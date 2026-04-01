import { z } from "zod";

export const adoptionRequestSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/),
  housingType: z.string().max(100),
  otherHousingType: z.string().max(100).optional(),
  ownOrRent: z.string().max(100),
  hasYard: z.boolean(),
  otherPets: z.string().max(200).optional(),
  adultCount: z.number().min(0),
  childCount: z.number().min(0),
});
