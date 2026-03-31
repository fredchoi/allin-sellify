import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

vi.mock('../../../config.js', () => ({
  config: {
    JWT_ACCESS_EXPIRES_IN: '15m',
  },
}))

import { loginSeller, refreshAccessToken, logoutSeller } from '../service.js'

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// ─────────────────────────────────────────────
// loginSeller 테스트
// ─────────────────────────────────────────────

describe('loginSeller', () => {
  const mockFastify = {
    jwt: {
      sign: vi.fn().mockReturnValue('access-token-abc'),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('올바른 이메일/비밀번호로 로그인하면 토큰과 셀러 정보를 반환한다', async () => {
    const passwordHash = hashPassword('correct-password')
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'seller-uuid-001',
            email: 'seller@example.com',
            name: '홍길동',
            plan: 'basic',
            password_hash: passwordHash,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }), // INSERT refresh_tokens
    }

    const result = await loginSeller(mockDb, mockFastify, {
      email: 'seller@example.com',
      password: 'correct-password',
    })

    expect(result.accessToken).toBe('access-token-abc')
    expect(result.refreshToken).toBeDefined()
    expect(result.refreshToken.length).toBeGreaterThan(0)
    expect(result.seller).toEqual({
      id: 'seller-uuid-001',
      email: 'seller@example.com',
      name: '홍길동',
      plan: 'basic',
    })
    expect(mockFastify.jwt.sign).toHaveBeenCalledWith({
      sellerId: 'seller-uuid-001',
      plan: 'basic',
    })
  })

  it('잘못된 비밀번호이면 401 에러를 던진다', async () => {
    const passwordHash = hashPassword('correct-password')
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{
          id: 'seller-uuid-001',
          email: 'seller@example.com',
          name: '홍길동',
          plan: 'basic',
          password_hash: passwordHash,
        }],
      }),
    }

    await expect(
      loginSeller(mockDb, mockFastify, {
        email: 'seller@example.com',
        password: 'wrong-password',
      })
    ).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('존재하지 않는 이메일이면 401 에러를 던진다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await expect(
      loginSeller(mockDb, mockFastify, {
        email: 'nonexistent@example.com',
        password: 'any-password',
      })
    ).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.')
  })

  it('비활성 셀러는 조회되지 않는다 (쿼리에 status=active 조건)', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }), // active 조건으로 조회 안됨
    }

    await expect(
      loginSeller(mockDb, mockFastify, {
        email: 'inactive@example.com',
        password: 'any-password',
      })
    ).rejects.toThrow('이메일 또는 비밀번호가 올바르지 않습니다.')

    // 쿼리에 active 조건이 포함되어야 함
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('status'),
      ['inactive@example.com', 'active']
    )
  })

  it('로그인 성공 시 refresh token 해시를 DB에 저장한다', async () => {
    const passwordHash = hashPassword('password123')
    const mockDb = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'seller-uuid-002',
            email: 'test@example.com',
            name: '김철수',
            plan: 'pro',
            password_hash: passwordHash,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }),
    }

    const result = await loginSeller(mockDb, mockFastify, {
      email: 'test@example.com',
      password: 'password123',
    })

    const insertCall = mockDb.query.mock.calls[1]
    expect(insertCall[0]).toContain('INSERT INTO refresh_tokens')
    // 저장된 해시가 실제 토큰의 SHA-256 해시와 일치하는지 확인
    const storedHash = insertCall[1][1]
    const expectedHash = hashToken(result.refreshToken)
    expect(storedHash).toBe(expectedHash)
  })
})

// ─────────────────────────────────────────────
// refreshAccessToken 테스트
// ─────────────────────────────────────────────

describe('refreshAccessToken', () => {
  const mockFastify = {
    jwt: {
      sign: vi.fn().mockReturnValue('new-access-token-xyz'),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('유효한 refresh token으로 새 access token을 발급한다', async () => {
    const rawToken = 'valid-refresh-token-abc'
    const tokenHash = hashToken(rawToken)

    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({
        rows: [{
          id: 'rt-uuid-001',
          seller_id: 'seller-uuid-001',
          plan: 'basic',
        }],
      }),
    }

    const result = await refreshAccessToken(mockDb, mockFastify, {
      refreshToken: rawToken,
    })

    expect(result.accessToken).toBe('new-access-token-xyz')
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('refresh_tokens'),
      [tokenHash]
    )
    expect(mockFastify.jwt.sign).toHaveBeenCalledWith(
      { sellerId: 'seller-uuid-001', plan: 'basic' },
      expect.objectContaining({ expiresIn: '15m' })
    )
  })

  it('만료되거나 폐기된 토큰이면 401 에러를 던진다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }), // 토큰 없음 (만료/폐기)
    }

    await expect(
      refreshAccessToken(mockDb, mockFastify, {
        refreshToken: 'expired-or-revoked-token',
      })
    ).rejects.toThrow('유효하지 않거나 만료된 토큰입니다.')
  })

  it('존재하지 않는 토큰이면 401 에러를 던진다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await expect(
      refreshAccessToken(mockDb, mockFastify, {
        refreshToken: 'completely-invalid-token',
      })
    ).rejects.toThrow('유효하지 않거나 만료된 토큰입니다.')
  })
})

// ─────────────────────────────────────────────
// logoutSeller 테스트
// ─────────────────────────────────────────────

describe('logoutSeller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refresh token을 폐기(revoke) 처리한다', async () => {
    const rawToken = 'logout-refresh-token'
    const tokenHash = hashToken(rawToken)

    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await logoutSeller(mockDb, { refreshToken: rawToken })

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE refresh_tokens'),
      [tokenHash]
    )
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('revoked_at'),
      expect.anything()
    )
  })

  it('이미 폐기된 토큰이어도 에러 없이 처리된다', async () => {
    const mockDb = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    }

    await expect(
      logoutSeller(mockDb, { refreshToken: 'already-revoked-token' })
    ).resolves.toBeUndefined()
  })
})
