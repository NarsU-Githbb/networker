import * as z from "zod"

// 1. The structural definition of a valid username
export const UsernameRule = z
  .string()
  .min(3, "Username must be at least 3 characters.")
  .max(10, "Username must be at most 10 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed.")

// 2. Used by the Lead Player (Host) route
export const leadPlayerSchema = z.object({
  username: UsernameRule,
})

// 3. Used by the Invited Player route (checks uniqueness)
export const getInvitedPlayerSchema = (existingUsernames: string[]) =>
  z.object({
    username: UsernameRule.refine(
      (name) => !existingUsernames.map(u => u.toLowerCase()).includes(name.toLowerCase()),
      { message: "This username is already taken in this room!" }
    ),
  })