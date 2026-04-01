import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import type { Pool } from 'pg'
import { AppError } from '../../plugins/error-handler.js'
import { findAdminByEmail } from './repository.js'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface AdminLoginResult {
  accessToken: string
  admin: {
    id: string
    email: string
    name: string
    role: string
  }
}

// ─────────────────────────────────────────────
// 관리자 로그인
// ─────────────────────────────────────────────

export async function loginAdmin(
  db: Pool,
  fastify: Pick<FastifyInstance, 'jwt'>,
  input: { email: string; password: string },
): Promise<AdminLoginResult> {
  const admin = await findAdminByEmail(db, input.email)

  if (!admin || admin.status !== 'active') {
    throw new AppError(401, '이메일 또는 비밀번호가 올바르지 않습니다.', 'UNAUTHORIZED')
  }

  const inputHash = crypto
    .createHash('sha256')
    .update(input.password)
    .digest('hex')

  if (inputHash !== admin.password_hash) {
    throw new AppError(401, '이메일 또는 비밀번호가 올바르지 않습니다.', 'UNAUTHORIZED')
  }

  const accessToken = fastify.jwt.sign(
    { adminId: admin.id, role: admin.role },
    { expiresIn: '2h' },
  )

  return {
    accessToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  }
}
