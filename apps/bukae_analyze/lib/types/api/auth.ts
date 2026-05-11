import { z } from 'zod'

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresIn: z.number(),
  refreshToken: z.string().optional(),
  refreshExpiresIn: z.number().optional(),
  tokenType: z.string(),
})

export type ApiTokenResponse = z.infer<typeof TokenResponseSchema>
