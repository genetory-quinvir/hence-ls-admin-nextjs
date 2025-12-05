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
 */
export interface UserListItem {
  id: string
  nickname: string
  profileImage?: string
  provider: 'naver' | 'kakao' | 'google' | 'apple'
  email: string
  role: string
  gender?: 'female' | 'male' | 'private'
  birthDate?: string
  bio?: string
  activityScore: number
  points: number
  createdAt: string
  reportedCount: number
  isSuspended: boolean
  suspensionReason?: string
  isWarned?: boolean
  warnedAt?: string
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
 * 전체 사용자 리스트 API 호출
 */
export async function getUsersAdmin(
  page: number = 1, 
  limit: number = 20,
  keyword?: string
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
  
  if (keyword && keyword.trim()) {
    params.append('keyword', keyword.trim())
  }
  
  const url = `${API_BASE_URL}/api/v1/users-admin?${params.toString()}`
  
  if (isDev) {
    console.log('[API] 사용자 리스트 요청:', {
      url,
      page,
      limit,
      keyword,
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
    
    // 프로필 이미지 추출 (providerOrigin에서)
    const getProfileImage = (user: any): string | undefined => {
      if (user.profileImage) return user.profileImage
      
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
        activityScore: 0, // API에서 제공되지 않음
        points: 0, // API에서 제공되지 않음
        createdAt: u.createdAt || new Date().toISOString(),
        reportedCount: 0, // API에서 제공되지 않음
        isSuspended: false, // API에서 제공되지 않음
        suspensionReason: undefined,
        isWarned: false, // API에서 제공되지 않음
        warnedAt: undefined,
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

