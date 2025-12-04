/**
 * 보안 강화된 인증 정보 저장소
 * sessionStorage 사용 (탭 종료 시 자동 삭제로 더 안전)
 */

// 토큰 저장 키
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_ROLE: 'auth_user_role',
  USER_EMAIL: 'auth_user_email',
  USER_NICKNAME: 'auth_user_nickname',
  AUTH_STATE: 'auth_state',
} as const

// 저장소 타입 ('sessionStorage' | 'localStorage')
const STORAGE_TYPE = 'sessionStorage' as const

/**
 * 안전한 저장소 접근 헬퍼
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  
  try {
    return window[STORAGE_TYPE] || window.sessionStorage
  } catch {
    return null
  }
}

/**
 * AccessToken 저장
 */
export function setAccessToken(token: string): void {
  const storage = getStorage()
  if (!storage) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] 저장소를 사용할 수 없습니다 (SSR 환경일 수 있음)')
    }
    return
  }
  
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthStorage] AccessToken이 비어있어서 저장하지 않습니다')
    }
    return
  }
  
  try {
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStorage] AccessToken 저장 성공:', {
        key: STORAGE_KEYS.ACCESS_TOKEN,
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
      })
    }
  } catch (error) {
    console.error('[AuthStorage] AccessToken 저장 실패:', error)
  }
}

/**
 * RefreshToken 저장
 */
export function setRefreshToken(token: string): void {
  const storage = getStorage()
  if (!storage) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthStorage] 저장소를 사용할 수 없습니다 (SSR 환경일 수 있음)')
    }
    return
  }
  
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AuthStorage] RefreshToken이 비어있어서 저장하지 않습니다')
    }
    return
  }
  
  try {
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthStorage] RefreshToken 저장 성공:', {
        key: STORAGE_KEYS.REFRESH_TOKEN,
        tokenLength: token.length,
        tokenPreview: `${token.substring(0, 20)}...`,
      })
    }
  } catch (error) {
    console.error('[AuthStorage] RefreshToken 저장 실패:', error)
  }
}

/**
 * User Role 저장
 */
export function setUserRole(role: string): void {
  const storage = getStorage()
  if (!storage) return
  
  try {
    storage.setItem(STORAGE_KEYS.USER_ROLE, role)
  } catch (error) {
    console.error('[AuthStorage] UserRole 저장 실패:', error)
  }
}

/**
 * User Email 저장
 */
export function setUserEmail(email: string): void {
  const storage = getStorage()
  if (!storage) return
  
  try {
    storage.setItem(STORAGE_KEYS.USER_EMAIL, email)
  } catch (error) {
    console.error('[AuthStorage] UserEmail 저장 실패:', error)
  }
}

/**
 * User Nickname 저장
 */
export function setUserNickname(nickname: string): void {
  const storage = getStorage()
  if (!storage) return
  
  try {
    storage.setItem(STORAGE_KEYS.USER_NICKNAME, nickname)
  } catch (error) {
    console.error('[AuthStorage] UserNickname 저장 실패:', error)
  }
}

/**
 * AccessToken 가져오기
 */
export function getAccessToken(): string | null {
  const storage = getStorage()
  if (!storage) return null
  
  try {
    return storage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  } catch (error) {
    console.error('[AuthStorage] AccessToken 조회 실패:', error)
    return null
  }
}

/**
 * RefreshToken 가져오기
 */
export function getRefreshToken(): string | null {
  const storage = getStorage()
  if (!storage) return null
  
  try {
    return storage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  } catch (error) {
    console.error('[AuthStorage] RefreshToken 조회 실패:', error)
    return null
  }
}

/**
 * User Role 가져오기
 */
export function getUserRole(): string | null {
  const storage = getStorage()
  if (!storage) return null
  
  try {
    return storage.getItem(STORAGE_KEYS.USER_ROLE)
  } catch (error) {
    console.error('[AuthStorage] UserRole 조회 실패:', error)
    return null
  }
}

/**
 * User Email 가져오기
 */
export function getUserEmail(): string | null {
  const storage = getStorage()
  if (!storage) return null
  
  try {
    return storage.getItem(STORAGE_KEYS.USER_EMAIL)
  } catch (error) {
    console.error('[AuthStorage] UserEmail 조회 실패:', error)
    return null
  }
}

/**
 * User Nickname 가져오기
 */
export function getUserNickname(): string | null {
  const storage = getStorage()
  if (!storage) return null
  
  try {
    return storage.getItem(STORAGE_KEYS.USER_NICKNAME)
  } catch (error) {
    console.error('[AuthStorage] UserNickname 조회 실패:', error)
    return null
  }
}

/**
 * 인증 상태 저장
 */
export function setAuthState(isAuthenticated: boolean): void {
  const storage = getStorage()
  if (!storage) return
  
  try {
    storage.setItem(STORAGE_KEYS.AUTH_STATE, String(isAuthenticated))
  } catch (error) {
    console.error('[AuthStorage] AuthState 저장 실패:', error)
  }
}

/**
 * 인증 상태 가져오기
 */
export function getAuthState(): boolean {
  const storage = getStorage()
  if (!storage) return false
  
  try {
    return storage.getItem(STORAGE_KEYS.AUTH_STATE) === 'true'
  } catch (error) {
    console.error('[AuthStorage] AuthState 조회 실패:', error)
    return false
  }
}

/**
 * 모든 인증 정보 저장
 */
export function setAuthData(data: {
  accessToken?: string
  refreshToken?: string
  role?: string
  email?: string
  nickname?: string
}): void {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    console.log('[AuthStorage] setAuthData 호출:', {
      hasAccessToken: !!data.accessToken,
      hasRefreshToken: !!data.refreshToken,
      hasRole: !!data.role,
      hasEmail: !!data.email,
      hasNickname: !!data.nickname,
      timestamp: new Date().toISOString(),
    })
  }
  
  // 각 필드가 있으면 저장 (undefined나 null이 아닌 경우만)
  if (data.accessToken) {
    setAccessToken(data.accessToken)
    if (isDev) console.log('[AuthStorage] AccessToken 저장 완료')
  } else if (isDev) {
    console.warn('[AuthStorage] AccessToken이 없어서 저장하지 않음')
  }
  
  if (data.refreshToken) {
    setRefreshToken(data.refreshToken)
    if (isDev) console.log('[AuthStorage] RefreshToken 저장 완료')
  } else if (isDev) {
    console.warn('[AuthStorage] RefreshToken이 없어서 저장하지 않음')
  }
  
  if (data.role) {
    setUserRole(data.role)
    if (isDev) console.log('[AuthStorage] UserRole 저장 완료:', data.role)
  }
  
  if (data.email) {
    setUserEmail(data.email)
    if (isDev) console.log('[AuthStorage] UserEmail 저장 완료:', data.email)
  }
  
  if (data.nickname) {
    setUserNickname(data.nickname)
    if (isDev) console.log('[AuthStorage] UserNickname 저장 완료:', data.nickname)
  }
  
  setAuthState(true)
  
  if (isDev) {
    // 저장 후 확인
    const verify = getStoredUser()
    console.log('[AuthStorage] 저장 후 확인:', {
      hasAccessToken: !!verify.accessToken,
      hasRefreshToken: !!verify.refreshToken,
      hasEmail: !!verify.email,
      hasRole: !!verify.role,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * 모든 인증 정보 제거
 */
export function clearAuthData(): void {
  const storage = getStorage()
  if (!storage) return
  
  try {
    storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    storage.removeItem(STORAGE_KEYS.USER_ROLE)
    storage.removeItem(STORAGE_KEYS.USER_EMAIL)
    storage.removeItem(STORAGE_KEYS.USER_NICKNAME)
    storage.removeItem(STORAGE_KEYS.AUTH_STATE)
    
    // 하위 호환성을 위해 localStorage도 정리
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('user')
      localStorage.removeItem('authToken')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  } catch (error) {
    console.error('[AuthStorage] 인증 정보 제거 실패:', error)
  }
}

/**
 * 저장된 사용자 정보 가져오기
 */
export function getStoredUser(): {
  email: string | null
  nickname: string | null
  role: string | null
  accessToken: string | null
  refreshToken: string | null
} {
  return {
    email: getUserEmail(),
    nickname: getUserNickname(),
    role: getUserRole(),
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
  }
}

