import { z } from 'zod'

// OLD loginSchema — commented out
// export const loginSchema = z.object({
//   login: z.string().min(1, "Login is required"),
//   password: z.string().min(1, "Password is required")
// })

// NEW loginSchema — simplified, no length/regex checks
export const loginSchema = z.object({
  login: z.string().min(1, "Login is required"),
  password: z.string().min(1, "Password is required")
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  user_info: z.object({
    email: z.string().email("Invalid email address"),
    login: z.string().min(6, "Login must be at least 6 characters long"),
    password: z.string()
      .min(6, "Password must be at least 6 characters long")
      .regex(/[A-Z]/, "Password must have at least one capital letter")
      .regex(/[a-z]/, "Password must have at least one lowercase letter")
      .regex(/[0-9]/, "Password must have at least one number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must have at least one special character")
  })
})

export type RegisterFormValues = z.infer<typeof registerSchema>
