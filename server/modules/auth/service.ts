import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import { config } from '../../config.js'
import { AppError } from '../../plugins/error-handler.js'
import type { JwtPayload } from '../../plugins/auth.js'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface LoginResult {
  accessToken: string
  refreshToken: string
  seller: {
    id: string
    email: string
    name: string
    plan: string
  }
}

export interface RefreshResult {
  accessToken: string
}

// ─────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function buildUnauthorizedError(): AppError {
  return new AppError(401, '이메일 또는 비밀번호가 올바르지 않습니다.', 'UNAUTHORIZED')
}

// ─────────────────────────────────────────────
// 서비스 함수 (DB 의존성 주입 방식)
// ─────────────────────────────────────────────

export async function registerSeller(
  db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  fastify: Pick<FastifyInstance, 'jwt'>,
  input: { name: string; email: string; password: string },
): Promise<LoginResult> {
  // 이메일 중복 체크
  const { rows: existing } = await db.query(
    'SELECT id FROM sellers WHERE email = $1',
    [input.email],
  )
  if (existing.length > 0) {
    throw new AppError(409, '이미 등록된 이메일입니다.', 'CONFLICT')
  }

  const passwordHash = crypto.createHash('sha256').update(input.password).digest('hex')

  const { rows } = await db.query(
    `INSERT INTO sellers (name, email, password_hash, plan, status)
     VALUES ($1, $2, $3, 'starter', 'active')
     RETURNING id, email, name, plan`,
    [input.name, input.email, passwordHash],
  )

  const seller = rows[0]

  const payload: JwtPayload = {
    sellerId: seller['id'] as string,
    plan: seller['plan'] as JwtPayload['plan'],
  }

  const accessToken = fastify.jwt.sign(payload)
  const rawRefreshToken = crypto.randomBytes(64).toString('hex')
  const tokenHash = hashToken(rawRefreshToken)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db.query(
    'INSERT INTO refresh_tokens (seller_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [seller['id'], tokenHash, expiresAt.toISOString()],
  )

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    seller: {
      id: seller['id'] as string,
      email: seller['email'] as string,
      name: seller['name'] as string,
      plan: seller['plan'] as string,
    },
  }
}

export async function loginSeller(
  db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  fastify: Pick<FastifyInstance, 'jwt'>,
  input: { email: string; password: string },
): Promise<LoginResult> {
  const { rows } = await db.query(
    'SELECT id, email, name, plan, password_hash FROM sellers WHERE email = $1 AND status = $2',
    [input.email, 'active'],
  )

  const seller = rows[0]
  if (!seller || !seller['password_hash']) {
    throw buildUnauthorizedError()
  }

  const inputHash = crypto
    .createHash('sha256')
    .update(input.password)
    .digest('hex')

  if (inputHash !== seller['password_hash']) {
    throw buildUnauthorizedError()
  }

  const payload: JwtPayload = {
    sellerId: seller['id'] as string,
    plan: seller['plan'] as JwtPayload['plan'],
  }

  const accessToken = fastify.jwt.sign(payload)
  const rawRefreshToken = crypto.randomBytes(64).toString('hex')
  const tokenHash = hashToken(rawRefreshToken)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await db.query(
    'INSERT INTO refresh_tokens (seller_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [seller['id'], tokenHash, expiresAt.toISOString()],
  )

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    seller: {
      id: seller['id'] as string,
      email: seller['email'] as string,
      name: seller['name'] as string,
      plan: seller['plan'] as string,
    },
  }
}

export async function refreshAccessToken(
  db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  fastify: Pick<FastifyInstance, 'jwt'>,
  input: { refreshToken: string },
): Promise<RefreshResult> {
  const tokenHash = hashToken(input.refreshToken)

  const { rows } = await db.query(
    `SELECT rt.id, rt.seller_id, s.plan
     FROM refresh_tokens rt
     JOIN sellers s ON s.id = rt.seller_id
     WHERE rt.token_hash = $1
       AND rt.revoked_at IS NULL
       AND rt.expires_at > NOW()
       AND s.status = 'active'`,
    [tokenHash],
  )

  const tokenRow = rows[0]
  if (!tokenRow) {
    throw new AppError(401, '유효하지 않거나 만료된 토큰입니다.', 'UNAUTHORIZED')
  }

  const payload: JwtPayload = {
    sellerId: tokenRow['seller_id'] as string,
    plan: tokenRow['plan'] as JwtPayload['plan'],
  }

  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  })

  return { accessToken }
}

export async function logoutSeller(
  db: { query: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  input: { refreshToken: string },
): Promise<void> {
  const tokenHash = hashToken(input.refreshToken)
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
    [tokenHash],
  )
}
