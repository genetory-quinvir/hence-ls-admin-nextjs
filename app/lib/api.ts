const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ls-api-dev.hence.events'

// 개발 환경 여부 확인
const isDev = process.env.NODE_ENV === 'development'

export interface LoginResponse {
  success: boolean
  data?: {
    email: string
    nickname?: string
    role?: string
    token?: string
    accessToken?: string
    refreshToken?: string
  }
  error?: string
}

/**
 * Basic Auth 헤더 생성
 */
function createBasicAuthHeader(email: string, password: string): string {
  const credentials = `${email}:${password}`
  const encoded = btoa(credentials)
  return `Basic ${encoded}`
}

/**
 * 관리자 로그인 API 호출
 */
export async function loginAdmin(email: string, password: string): Promise<LoginResponse> {
  const url = `${API_BASE_URL}/api/v1/auth-admin/login`
  
  if (isDev) {
    console.log('[API] 로그인 요청:', {
      url,
      email,
      method: 'POST',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': createBasicAuthHeader(email, password),
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 로그인 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      let errorMessage = `로그인 실패 (${response.status})`
      try {
        const errorData = await response.json()
        
        if (isDev) {
          console.error('[API] 로그인 에러 응답:', {
            status: response.status,
            errorData,
            timestamp: new Date().toISOString(),
          })
        }
        
        errorMessage = errorData.message || errorData.error || errorMessage
        
        // 401 Unauthorized의 경우 더 명확한 메시지
        if (response.status === 401) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 기본 메시지 사용
        if (isDev) {
          console.error('[API] 에러 응답 파싱 실패:', parseError)
        }
        if (response.status === 401) {
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    const data = await response.json()
    
    if (isDev) {
      console.log('[API] 로그인 성공 응답 데이터 (전체):', {
        data,
        dataKeys: Object.keys(data),
        dataStringified: JSON.stringify(data, null, 2),
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조에 따라 다양한 형태 지원
    // 다양한 가능한 경로에서 토큰 추출 시도
    const accessToken = 
      data.accessToken || 
      data.token || 
      data.access_token ||
      data.user?.accessToken || 
      data.user?.token ||
      data.user?.access_token ||
      data.data?.accessToken ||
      data.data?.token ||
      data.data?.access_token ||
      data.result?.accessToken ||
      data.result?.token ||
      data.result?.access_token ||
      null
    
    const refreshToken = 
      data.refreshToken || 
      data.refresh_token ||
      data.user?.refreshToken || 
      data.user?.refresh_token ||
      data.data?.refreshToken ||
      data.data?.refresh_token ||
      data.result?.refreshToken ||
      data.result?.refresh_token ||
      null
    
    if (isDev) {
      console.log('[API] 토큰 추출 시도 결과:', {
        accessTokenPaths: {
          'data.accessToken': data.accessToken,
          'data.token': data.token,
          'data.access_token': data.access_token,
          'data.user?.accessToken': data.user?.accessToken,
          'data.user?.token': data.user?.token,
          'data.data?.accessToken': data.data?.accessToken,
          'data.result?.accessToken': data.result?.accessToken,
        },
        refreshTokenPaths: {
          'data.refreshToken': data.refreshToken,
          'data.refresh_token': data.refresh_token,
          'data.user?.refreshToken': data.user?.refreshToken,
          'data.data?.refreshToken': data.data?.refreshToken,
          'data.result?.refreshToken': data.result?.refreshToken,
        },
        extractedAccessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
        extractedRefreshToken: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString(),
      })
    }
    
    if (isDev) {
      console.log('[API] 토큰 추출:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: true,
      data: {
        email: data.email || data.user?.email || email,
        nickname: data.nickname || data.user?.nickname || email.split('@')[0],
        role: data.role || data.user?.role || 'MEMBER',
        accessToken,
        refreshToken,
        // 하위 호환성을 위해 token 필드도 유지
        token: accessToken,
      },
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 로그인 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 토큰 갱신 API 호출
 */
export async function refreshAccessToken(refreshToken: string): Promise<LoginResponse> {
  const url = `${API_BASE_URL}/api/v1/auth/refresh`
  
  if (isDev) {
    console.log('[API] 토큰 갱신 요청:', {
      url,
      method: 'POST',
      hasRefreshToken: !!refreshToken,
      refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 20)}...` : null,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 토큰 갱신 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 토큰 갱신 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `토큰 갱신 실패 (${response.status})`,
      }
    }

    const data = await response.json()
    
    if (isDev) {
      console.log('[API] 토큰 갱신 응답 데이터:', {
        data,
        timestamp: new Date().toISOString(),
      })
    }
    
    const accessToken = data.accessToken || data.token || data.user?.accessToken
    const newRefreshToken = data.refreshToken || data.user?.refreshToken || refreshToken
    
    if (isDev) {
      console.log('[API] 토큰 갱신 성공:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!newRefreshToken,
        accessTokenLength: accessToken?.length,
        refreshTokenLength: newRefreshToken?.length,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: true,
      data: {
        email: data.email || data.user?.email || '',
        nickname: data.nickname || data.user?.nickname || '',
        role: data.role || data.user?.role || 'MEMBER',
        accessToken,
        refreshToken: newRefreshToken,
        token: accessToken,
      },
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 토큰 갱신 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '토큰 갱신 중 오류가 발생했습니다.',
    }
  }
}

// 보안 강화된 저장소 사용 (sessionStorage 기반)
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setUserRole,
  getUserRole,
  setUserEmail,
  getUserEmail,
  setUserNickname,
  getUserNickname,
  setAuthState,
  getAuthState,
  setAuthData,
  clearAuthData,
  getStoredUser,
} from './authStorage'

export {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setUserRole,
  getUserRole,
  setUserEmail,
  getUserEmail,
  setUserNickname,
  getUserNickname,
  setAuthState,
  getAuthState,
  setAuthData,
  clearAuthData,
  getStoredUser,
}

/**
 * @deprecated clearTokens는 clearAuthData를 사용하세요
 */
export function clearTokens(): void {
  // 보안 저장소의 clearAuthData 사용
  const { clearAuthData } = require('./authStorage')
  clearAuthData()
}

/**
 * 사용자 검색 인터페이스
 */
export interface UserSearchResult {
  id: string
  email: string
  nickname: string
  role?: string
}

export interface UserSearchResponse {
  success: boolean
  data?: UserSearchResult[]
  total?: number
  error?: string
}

/**
 * 사용자 검색 API 호출
 */
export async function searchUsers(query: string, limit: number = 20): Promise<UserSearchResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/admin/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
  
  if (isDev) {
    console.log('[API] 사용자 검색 요청:', {
      url,
      query,
      limit,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 사용자 검색 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 사용자 검색 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `검색 실패 (${response.status})`,
      }
    }

    const data = await response.json()
    
    if (isDev) {
      console.log('[API] 사용자 검색 성공:', {
        resultCount: data.users?.length || data.data?.length || 0,
        total: data.total,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조에 따라 다양한 형태 지원
    const users = data.users || data.data || []
    
    return {
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        nickname: u.nickname,
        role: u.role,
      })),
      total: data.total || users.length,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 사용자 검색 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 사용자 리스트 인터페이스
 * API 응답 구조에 맞게 정의됨
 */
export interface UserListItem {
  id: string
  nickname: string
  profileImage?: string // cdnUrl 또는 thumbnailUrl이 문자열로 변환됨
  provider: 'naver' | 'kakao' | 'google' | 'apple' // EMAIL은 naver로 매핑됨
  email: string
  role: string
  gender?: 'female' | 'male' | 'private' // 'secret'은 'private'로 변환됨
  birthDate?: string // API의 dateOfBirth 필드
  bio?: string // API의 introduction 필드
  activityScore: number // API에서 제공됨
  points: number // API에서 제공되지 않음 (기본값 0)
  createdAt: string
  reportedCount: number // API에서 제공되지 않음 (기본값 0)
  isSuspended: boolean // displayStatus 기반으로 판단
  suspensionReason?: string
  isWarned?: boolean // API에서 제공되지 않음
  warnedAt?: string
  marketingConsentDate?: string | null
}

export interface UserListMeta {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface UserListResponse {
  success: boolean
  data?: UserListItem[]
  meta?: UserListMeta
  total?: number
  error?: string
}

/**
 * 사용자 리스트 검색 필터 옵션
 */
export interface UserListFilterOptions {
  keyword?: string // 검색 키워드
  onlyWithdrawal?: boolean // 탈퇴 유저 포함 여부
  role?: 'ALL' | 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'TESTER' // 역할 필터
  marketContent?: boolean // 마케팅 동의 여부 (true: 동의, false: 미동의)
  joinStartDate?: string // 가입 시작 날짜 (YYYY-MM-DD 형식)
  joinEndDate?: string // 가입 종료 날짜 (YYYY-MM-DD 형식)
  status?: 'ALL' | 'NORMAL' | 'SUSPEND' | 'WARNING' // 상태 필터
  orderBy?: 'createdAt' | 'nickname' | 'email' | 'provider' | 'activityScore' // 정렬 기준
  direction?: 'ASC' | 'DESC' // 정렬 방향
}

/**
 * 전체 사용자 리스트 API 호출
 */
export async function getUsersAdmin(
  page: number = 1, 
  limit: number = 20,
  options?: UserListFilterOptions
): Promise<UserListResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  
  // 필터 옵션 추가
  if (options) {
    if (options.keyword && options.keyword.trim()) {
      params.append('keyword', options.keyword.trim())
    }
    
    if (options.onlyWithdrawal !== undefined) {
      params.append('onlyWithdrawal', options.onlyWithdrawal.toString())
    }
    
    if (options.role && options.role !== 'ALL') {
      params.append('role', options.role)
    }
    
    if (options.marketContent !== undefined) {
      params.append('marketContent', options.marketContent.toString())
    }
    
    if (options.joinStartDate) {
      params.append('joinStartDate', options.joinStartDate)
    }
    
    if (options.joinEndDate) {
      params.append('joinEndDate', options.joinEndDate)
    }
    
    if (options.status && options.status !== 'ALL') {
      params.append('status', options.status)
    }
    
    if (options.orderBy) {
      params.append('orderBy', options.orderBy)
    }
    
    if (options.direction) {
      params.append('direction', options.direction)
    }
  }
  
  const url = `${API_BASE_URL}/api/v1/users-admin?${params.toString()}`
  
  if (isDev) {
    console.log('[API] 사용자 리스트 요청:', {
      url,
      page,
      limit,
      options,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 사용자 리스트 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 사용자 리스트 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `사용자 리스트 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] 사용자 리스트 성공:', {
        responseData,
        resultCount: responseData.data?.users?.length || 0,
        total: responseData.data?.meta?.totalItems,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조: { data: { users: [...], meta: {...} }, code, message }
    const users = responseData.data?.users || []
    const meta = responseData.data?.meta
    
    // provider를 소문자로 변환하는 헬퍼 함수
    const normalizeProvider = (provider: string): 'naver' | 'kakao' | 'google' | 'apple' => {
      const normalized = provider?.toLowerCase() || 'naver'
      if (normalized === 'email') return 'naver' // EMAIL은 기본값으로 naver 사용
      if (['naver', 'kakao', 'google', 'apple'].includes(normalized)) {
        return normalized as 'naver' | 'kakao' | 'google' | 'apple'
      }
      return 'naver'
    }
    
    // gender를 변환하는 헬퍼 함수
    const normalizeGender = (gender: string): 'female' | 'male' | 'private' | undefined => {
      if (!gender) return undefined
      if (gender === 'secret') return 'private'
      if (['female', 'male', 'private'].includes(gender)) {
        return gender as 'female' | 'male' | 'private'
      }
      return 'private'
    }
    
    // 프로필 이미지 추출 (우선순위: profileImage 객체 > providerOrigin)
    const getProfileImage = (user: any): string | undefined => {
      // profileImage 객체가 있는 경우 (cdnUrl 또는 thumbnailUrl 사용)
      if (user.profileImage) {
        if (typeof user.profileImage === 'string') {
          return user.profileImage
        }
        if (user.profileImage.cdnUrl) return user.profileImage.cdnUrl
        if (user.profileImage.thumbnailUrl) return user.profileImage.thumbnailUrl
        if (user.profileImage.fileUrl) return user.profileImage.fileUrl
      }
      
      // providerOrigin에서 이미지 추출
      if (user.providerOrigin?.providerOrigin) {
        const origin = user.providerOrigin.providerOrigin
        if (origin.profile_image_url) return origin.profile_image_url
        if (origin.picture) return origin.picture
        if (origin.profile?.profile_image_url) return origin.profile.profile_image_url
      }
      
      return undefined
    }
    
    return {
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        nickname: u.nickname || '',
        profileImage: getProfileImage(u),
        provider: normalizeProvider(u.provider),
        email: u.email || '',
        role: (u.role || 'MEMBER') as UserListItem['role'],
        gender: normalizeGender(u.gender),
        birthDate: u.dateOfBirth || undefined,
        bio: u.introduction || undefined,
        activityScore: u.activityScore ?? 0, // API에서 제공되는 실제 값 사용
        points: 0, // API에서 제공되지 않음 (기본값 0)
        createdAt: u.createdAt || new Date().toISOString(),
        reportedCount: 0, // API에서 제공되지 않음
        isSuspended: u.displayStatus === 'SUSPENDED' || false, // displayStatus 기반으로 판단
        suspensionReason: undefined,
        isWarned: false, // API에서 제공되지 않음
        warnedAt: undefined,
        marketingConsentDate: u.marketingConsentDate || null,
      })),
      meta: meta ? {
        currentPage: meta.currentPage || page,
        itemsPerPage: meta.itemsPerPage || limit,
        totalItems: meta.totalItems || users.length,
        totalPages: meta.totalPages || Math.ceil((meta.totalItems || users.length) / (meta.itemsPerPage || limit)),
        hasNext: meta.hasNext || false,
        hasPrevious: meta.hasPrevious || false,
      } : undefined,
      total: meta?.totalItems || users.length,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 사용자 리스트 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 리스트 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 신고 접수된 사용자 리스트 API 호출
 */
export async function getReportedUsersAdmin(): Promise<UserListResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/users-admin/reported`
  
  if (isDev) {
    console.log('[API] 신고 접수된 사용자 리스트 요청:', {
      url,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 신고 접수된 사용자 리스트 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 신고 접수된 사용자 리스트 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `신고 접수된 사용자 리스트 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] 신고 접수된 사용자 리스트 성공:', {
        responseData,
        resultCount: responseData.data?.users?.length || 0,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조: { data: { users: [...], meta: {...} }, code, message }
    const users = responseData.data?.users || []
    
    // provider를 소문자로 변환하는 헬퍼 함수
    const normalizeProvider = (provider: string): 'naver' | 'kakao' | 'google' | 'apple' => {
      const normalized = provider?.toLowerCase() || 'naver'
      if (normalized === 'email') return 'naver'
      if (['naver', 'kakao', 'google', 'apple'].includes(normalized)) {
        return normalized as 'naver' | 'kakao' | 'google' | 'apple'
      }
      return 'naver'
    }
    
    // gender를 변환하는 헬퍼 함수
    const normalizeGender = (gender: string): 'female' | 'male' | 'private' | undefined => {
      if (!gender) return undefined
      if (gender === 'secret') return 'private'
      if (['female', 'male', 'private'].includes(gender)) {
        return gender as 'female' | 'male' | 'private'
      }
      return 'private'
    }
    
    // 프로필 이미지 추출 (우선순위: profileImage 객체 > providerOrigin)
    const getProfileImage = (user: any): string | undefined => {
      if (user.profileImage) {
        if (typeof user.profileImage === 'string') {
          return user.profileImage
        }
        if (user.profileImage.cdnUrl) return user.profileImage.cdnUrl
        if (user.profileImage.thumbnailUrl) return user.profileImage.thumbnailUrl
        if (user.profileImage.fileUrl) return user.profileImage.fileUrl
      }
      
      if (user.providerOrigin?.providerOrigin) {
        const origin = user.providerOrigin.providerOrigin
        if (origin.profile_image_url) return origin.profile_image_url
        if (origin.picture) return origin.picture
        if (origin.profile?.profile_image_url) return origin.profile.profile_image_url
      }
      
      return undefined
    }
    
    return {
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        nickname: u.nickname || '',
        profileImage: getProfileImage(u),
        provider: normalizeProvider(u.provider),
        email: u.email || '',
        role: (u.role || 'MEMBER') as UserListItem['role'],
        gender: normalizeGender(u.gender),
        birthDate: u.dateOfBirth || undefined,
        bio: u.introduction || undefined,
        activityScore: u.activityScore ?? 0,
        points: 0,
        createdAt: u.createdAt || new Date().toISOString(),
        reportedCount: 0,
        isSuspended: u.displayStatus === 'SUSPENDED' || false,
        suspensionReason: undefined,
        isWarned: false,
        warnedAt: undefined,
        marketingConsentDate: u.marketingConsentDate || null,
      })),
      meta: undefined,
      total: users.length,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 신고 접수된 사용자 리스트 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '신고 접수된 사용자 리스트 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 제재/정지 관리 사용자 리스트 API 호출
 */
export async function getPenaltyUsersAdmin(): Promise<UserListResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/users-admin/penalty`
  
  if (isDev) {
    console.log('[API] 제재/정지 관리 사용자 리스트 요청:', {
      url,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 제재/정지 관리 사용자 리스트 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 제재/정지 관리 사용자 리스트 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `제재/정지 관리 사용자 리스트 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] 제재/정지 관리 사용자 리스트 성공:', {
        responseData,
        resultCount: responseData.data?.users?.length || 0,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조: { data: { users: [...], meta: {...} }, code, message }
    const users = responseData.data?.users || []
    
    // provider를 소문자로 변환하는 헬퍼 함수
    const normalizeProvider = (provider: string): 'naver' | 'kakao' | 'google' | 'apple' => {
      const normalized = provider?.toLowerCase() || 'naver'
      if (normalized === 'email') return 'naver'
      if (['naver', 'kakao', 'google', 'apple'].includes(normalized)) {
        return normalized as 'naver' | 'kakao' | 'google' | 'apple'
      }
      return 'naver'
    }
    
    // gender를 변환하는 헬퍼 함수
    const normalizeGender = (gender: string): 'female' | 'male' | 'private' | undefined => {
      if (!gender) return undefined
      if (gender === 'secret') return 'private'
      if (['female', 'male', 'private'].includes(gender)) {
        return gender as 'female' | 'male' | 'private'
      }
      return 'private'
    }
    
    // 프로필 이미지 추출 (우선순위: profileImage 객체 > providerOrigin)
    const getProfileImage = (user: any): string | undefined => {
      if (user.profileImage) {
        if (typeof user.profileImage === 'string') {
          return user.profileImage
        }
        if (user.profileImage.cdnUrl) return user.profileImage.cdnUrl
        if (user.profileImage.thumbnailUrl) return user.profileImage.thumbnailUrl
        if (user.profileImage.fileUrl) return user.profileImage.fileUrl
      }
      
      if (user.providerOrigin?.providerOrigin) {
        const origin = user.providerOrigin.providerOrigin
        if (origin.profile_image_url) return origin.profile_image_url
        if (origin.picture) return origin.picture
        if (origin.profile?.profile_image_url) return origin.profile.profile_image_url
      }
      
      return undefined
    }
    
    return {
      success: true,
      data: users.map((u: any) => ({
        id: u.id,
        nickname: u.nickname || '',
        profileImage: getProfileImage(u),
        provider: normalizeProvider(u.provider),
        email: u.email || '',
        role: (u.role || 'MEMBER') as UserListItem['role'],
        gender: normalizeGender(u.gender),
        birthDate: u.dateOfBirth || undefined,
        bio: u.introduction || undefined,
        activityScore: u.activityScore ?? 0,
        points: 0,
        createdAt: u.createdAt || new Date().toISOString(),
        reportedCount: 0,
        isSuspended: u.displayStatus === 'SUSPENDED' || false,
        suspensionReason: undefined,
        isWarned: false,
        warnedAt: undefined,
        marketingConsentDate: u.marketingConsentDate || null,
      })),
      meta: undefined,
      total: users.length,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 제재/정지 관리 사용자 리스트 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '제재/정지 관리 사용자 리스트 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * Live Space 리스트 인터페이스
 */
export interface LiveSpaceListItem {
  id: string
  title: string
  hostId: string
  hostNickname: string
  categoryName?: string
  placeName?: string
  address?: string
  location: {
    lat: number
    lng: number
  }
  description?: string
  startsAt?: string
  endsAt?: string
  feedCount: number
  participantCount: number
  thumbnail?: string
  createdAt: string
  updatedAt?: string
  checkIn?: boolean
  displayStatus?: boolean
  deletedAt?: string | null
}

export interface LiveSpaceListMeta {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface LiveSpaceListResponse {
  success: boolean
  data?: LiveSpaceListItem[]
  meta?: LiveSpaceListMeta
  total?: number
  error?: string
}

/**
 * Live Space 리스트 API 호출
 */
export async function getLiveSpacesAdmin(
  page: number = 1,
  limit: number = 20
): Promise<LiveSpaceListResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })
  
  const url = `${API_BASE_URL}/api/v1/space-admin?${params.toString()}`
  
  if (isDev) {
    console.log('[API] Live Space 리스트 요청:', {
      url,
      page,
      limit,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] Live Space 리스트 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] Live Space 리스트 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `Live Space 리스트 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] Live Space 리스트 성공:', {
        responseData,
        resultCount: responseData.data?.spaces?.length || 0,
        total: responseData.data?.meta?.totalItems,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조: { data: { spaces: [...], meta: {...} }, code, message }
    const spaces = responseData.data?.spaces || []
    const meta = responseData.data?.meta
    
    return {
      success: true,
      data: spaces.map((s: any) => {
        // location.coordinates는 [lng, lat] 형식
        const coordinates = s.location?.coordinates || []
        const lat = coordinates[1] || 0
        const lng = coordinates[0] || 0
        
        // 이미지 URL 추출 (thumbnailUrl 우선, 없으면 cdnUrl)
        const thumbnail = s.images?.thumbnailUrl || s.images?.cdnUrl || s.images?.fileUrl
        
        // hostNickname 처리 (빈 객체일 수 있으므로 string으로 변환)
        const hostNickname = typeof s.hostNickname === 'string' 
          ? s.hostNickname 
          : s.hostNickname?.nickname || s.hostNickname?.name || '알 수 없음'
        
        // address에서 district 추출 (간단한 파싱, 실제로는 API에서 제공될 수도 있음)
        const district = s.address 
          ? (s.address.match(/(\S+구|\S+시|\S+군)/)?.[0] || '')
          : ''
        
        return {
          id: s.id,
          title: s.title || '',
          hostId: s.hostId || '',
          hostNickname: hostNickname,
          categoryName: s.categoryName,
          placeName: s.placeName,
          address: s.address || s.placeName || '',
          location: {
            lat,
            lng,
          },
          description: s.description,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          feedCount: s.feedCount || 0,
          participantCount: s.participantCount || 0,
          thumbnail,
          createdAt: s.createdAt || new Date().toISOString(),
          updatedAt: s.updatedAt,
          checkIn: s.checkIn,
          // displayStatus는 문자열로 옴 ("TERMINATED" 등), boolean으로 변환하지 않음
          displayStatus: s.displayStatus,
          deletedAt: s.deletedAt || null,
        }
      }),
      meta: meta ? {
        currentPage: meta.currentPage || page,
        itemsPerPage: meta.itemsPerPage || limit,
        totalItems: meta.totalItems || spaces.length,
        totalPages: meta.totalPages || Math.ceil((meta.totalItems || spaces.length) / (meta.itemsPerPage || limit)),
        hasNext: meta.hasNext || false,
        hasPrevious: meta.hasPrevious || false,
      } : undefined,
      total: meta?.totalItems || spaces.length,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] Live Space 리스트 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Live Space 리스트 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * Live Space 생성 요청 인터페이스
 */
export interface CreateLiveSpaceRequest {
  title: string
  placeName: string
  address: string
  longitude: number
  latitude: number
  description?: string
  startsAt: string
  endsAt: string
  thumbnailImageId?: string
  categoryId: string
}

/**
 * Live Space 생성
 */
export async function createLiveSpaceAdmin(
  data: CreateLiveSpaceRequest
): Promise<{ success: boolean; error?: string; data?: any }> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/space-admin`
  
  if (isDev) {
    console.log('[API] Live Space 생성 요청:', {
      url,
      method: 'POST',
      data,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (isDev) {
      console.log('[API] Live Space 생성 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] Live Space 생성 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `Live Space 생성 실패 (${response.status})`,
      }
    }

    const responseData = await response.json().catch(() => ({}))
    
    if (isDev) {
      console.log('[API] Live Space 생성 성공:', {
        data: responseData,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      success: true,
      data: responseData,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] Live Space 생성 예외:', {
        error,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Live Space 생성 중 오류가 발생했습니다.',
    }
  }
}

/**
 * Live Space 썸네일 이미지 업로드
 */
export async function uploadLiveSpaceThumbnail(
  file: File
): Promise<{ success: boolean; error?: string; thumbnailImageId?: string }> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/space-admin/thumbnail-image`
  
  // FormData 생성 (API DTO: files, description, displayOrder)
  const formData = new FormData()
  formData.append('files', file)
  // description과 displayOrder는 선택사항이므로 생략 가능
  // 필요하면 추가: formData.append('description', '')
  // 필요하면 추가: formData.append('displayOrder', '0')
  
  if (isDev) {
    console.log('[API] Live Space 썸네일 이미지 업로드 요청:', {
      url,
      method: 'POST',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    })
    
    // FormData 내용 확인 (디버깅용)
    for (const [key, value] of formData.entries()) {
      console.log('[API] FormData 항목:', key, value instanceof File ? `File: ${value.name}` : value)
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // FormData를 사용할 때는 Content-Type을 설정하지 않음 (브라우저가 자동으로 설정)
      },
      body: formData,
    })

    if (isDev) {
      console.log('[API] Live Space 썸네일 이미지 업로드 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText || '알 수 없는 오류' }
      }
      
      if (isDev) {
        console.error('[API] Live Space 썸네일 이미지 업로드 에러:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          errorText,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || errorData.error || errorText || `썸네일 이미지 업로드 실패 (${response.status})`,
      }
    }

    const responseData = await response.json().catch(() => ({}))
    
    if (isDev) {
      console.log('[API] Live Space 썸네일 이미지 업로드 성공:', {
        data: responseData,
        timestamp: new Date().toISOString(),
      })
    }

    // 응답에서 thumbnailImageId 추출 (응답 구조에 따라 수정 필요할 수 있음)
    const thumbnailImageId = responseData.id || responseData.thumbnailImageId || responseData.data?.id || responseData.data?.thumbnailImageId

    return {
      success: true,
      thumbnailImageId: thumbnailImageId,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] Live Space 썸네일 이미지 업로드 예외:', {
        error,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '썸네일 이미지 업로드 중 오류가 발생했습니다.',
    }
  }
}

/**
 * Live Space 강제 종료 (삭제)
 */
export async function deleteLiveSpaceAdmin(spaceId: string): Promise<{ success: boolean; error?: string }> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/space-admin/${spaceId}`
  
  if (isDev) {
    console.log('[API] Live Space 강제 종료 요청:', {
      url,
      spaceId,
      method: 'DELETE',
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] Live Space 강제 종료 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] Live Space 강제 종료 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `Live Space 강제 종료 실패 (${response.status})`,
      }
    }

    if (isDev) {
      console.log('[API] Live Space 강제 종료 성공:', {
        spaceId,
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: true,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] Live Space 강제 종료 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Live Space 강제 종료 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 대시보드 Summary 응답 인터페이스
 */
export interface PopularFeed {
  rank: number
  id: string
  title: string // 라이브 스페이스 제목
  nickname: string // 작성자 닉네임
  commentCount: number
  likeCount: number
  score: number
}

export interface PopularSpace {
  rank: number
  id: string
  title: string
  nickname: string // 호스트 닉네임
  feedCount: number
  participantCount: number
  feedCommentCount: number
  feedLikeCount: number
  score: number
}

export interface TrendPoint {
  label: string
  count: number
}

export interface TrendData {
  range: string
  points: TrendPoint[]
  total: number
  today: number
}

export interface DashboardSummary {
  users?: {
    freshmen?: number
    withdrawalUsers?: number
    cumulativeUsers?: number
    trend?: TrendData
    [key: string]: any
  }
  spaces?: {
    memberCount?: number
    newSpace?: number
    liveSpace?: number
    cumulativeSpace?: number
    trend?: TrendData
    popularSpace?: PopularSpace[] // 인기 라이브 스페이스 리스트 (popularSpaces가 아님)
    [key: string]: any
  }
  feeds?: {
    newFeeds?: number
    cumulativeFeeds?: number
    popularFeeds?: PopularFeed[] // 인기 피드 리스트
    [key: string]: any
  }
  [key: string]: any // API 응답 구조에 맞게 확장 가능
}

export interface DashboardSummaryResponse {
  success: boolean
  data?: DashboardSummary
  error?: string
}

/**
 * 대시보드 Summary API 호출
 * @param periodFrom - 기간 시작일 (ISO 형식: '2025-11-10T00:00:00')
 * @param periodTo - 기간 종료일 (ISO 형식: '2025-12-10T23:59:59.599')
 * @param range - 범위 (예: '1d', '1w', '1m', '6m' 등)
 */
export async function getDashboardSummary(
  periodFrom: string,
  periodTo: string,
  range: string
): Promise<DashboardSummaryResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const params = new URLSearchParams()
  params.append('period[from]', periodFrom)
  params.append('period[to]', periodTo)
  params.append('range', range)
  
  const url = `${API_BASE_URL}/api/v1/dashboard/summary?${params.toString()}`
  
  if (isDev) {
    console.log('[API] 대시보드 Summary 요청:', {
      url,
      method: 'GET',
      periodFrom,
      periodTo,
      range,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 대시보드 Summary 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 대시보드 Summary 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `대시보드 Summary 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] 대시보드 Summary 성공:', {
        responseData,
        timestamp: new Date().toISOString(),
      })
    }
    
    // API 응답 구조에 맞게 변환 (실제 응답 구조에 맞게 수정 필요)
    return {
      success: true,
      data: responseData.data || responseData,
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 대시보드 Summary 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '대시보드 Summary 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 사용자 상세 정보 인터페이스
 */
export interface UserDetail {
  id: string
  email: string
  provider: string
  providerId: string | null
  providerOrigin: any | null
  providerVerifiedAt: string | null
  contact: string | null
  name: string | null
  nickname: string
  introduction: string | null
  gender: string
  dateOfBirth: string | null
  marketingConsentDate: string | null
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  withdrawalReason: string | null
  deletedAt: string | null
}

export interface UserDetailResponse {
  success: boolean
  data?: UserDetail
  error?: string
}

/**
 * 사용자 상세 정보 API 호출
 */
export async function getUserDetail(userId: string): Promise<UserDetailResponse> {
  const accessToken = getAccessToken()
  
  if (!accessToken) {
    return {
      success: false,
      error: '인증이 필요합니다.',
    }
  }

  const url = `${API_BASE_URL}/api/v1/users-admin/${userId}`
  
  if (isDev) {
    console.log('[API] 사용자 상세 정보 요청:', {
      url,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (isDev) {
      console.log('[API] 사용자 상세 정보 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (isDev) {
        console.error('[API] 사용자 상세 정보 에러:', {
          status: response.status,
          errorData,
          timestamp: new Date().toISOString(),
        })
      }
      
      return {
        success: false,
        error: errorData.message || `사용자 상세 정보 조회 실패 (${response.status})`,
      }
    }

    const responseData = await response.json()
    
    if (isDev) {
      console.log('[API] 사용자 상세 정보 성공:', {
        data: responseData.data,
        timestamp: new Date().toISOString(),
      })
    }
    
    const userData = responseData.data
    
    if (!userData) {
      return {
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.',
      }
    }
    
    return {
      success: true,
      data: {
        id: userData.id,
        email: userData.email || '',
        provider: userData.provider || 'EMAIL',
        providerId: userData.providerId || null,
        providerOrigin: userData.providerOrigin || null,
        providerVerifiedAt: userData.providerVerifiedAt || null,
        contact: userData.contact || null,
        name: userData.name || null,
        nickname: userData.nickname || '',
        introduction: userData.introduction || null,
        gender: userData.gender || 'secret',
        dateOfBirth: userData.dateOfBirth || null,
        marketingConsentDate: userData.marketingConsentDate || null,
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: userData.updatedAt || new Date().toISOString(),
        lastLoginAt: userData.lastLoginAt || null,
        withdrawalReason: userData.withdrawalReason || null,
        deletedAt: userData.deletedAt || null,
      },
    }
  } catch (error) {
    if (isDev) {
      console.error('[API] 사용자 상세 정보 네트워크 에러:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '사용자 상세 정보 조회 중 오류가 발생했습니다.',
    }
  }
}

