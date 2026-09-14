import * as z from "zod"

export const UsernameRule = z
  .string()
  .min(3, "Username must be at least 3 characters.")
  .max(10, "Username must be at most 10 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed.")

export const leadPlayerSchema = z.object({
  username: UsernameRule,
})

export const getInvitedPlayerSchema = z.object({
  username: UsernameRule,
})