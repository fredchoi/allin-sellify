import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken을 입력하세요.'),
})

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken을 입력하세요.'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RefreshInput = z.infer<typeof refreshSchema>
export type LogoutInput = z.infer<typeof logoutSchema>
