import { z } from "zod";

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(1, "Enter your name").max(120, "Name is too long"),
    email: z.email("Enter a valid email address"),
    password,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

export const forgotPasswordSchema = z.object({ email: z.email("Enter a valid email address") });

export const resetPasswordSchema = z
  .object({ new_password: password, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

export const changePasswordSchema = z
  .object({ current_password: z.string().min(1, "Enter your current password"), new_password: password, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Only allow same-site relative redirects after login (prevents open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}
