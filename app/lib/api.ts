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
} from './authStorage'

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

