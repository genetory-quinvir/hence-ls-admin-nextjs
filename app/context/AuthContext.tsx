'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loginAdmin, LoginResponse } from '../lib/api'
import {
  getAccessToken,
  getRefreshToken,
  getUserRole,
  getUserEmail,
  getUserNickname,
  getAuthState,
  setAuthState,
  setAuthData,
  clearAuthData,
  getStoredUser,
} from '../lib/authStorage'

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'TESTER'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  user: { email: string; nickname: string; role: UserRole; token?: string } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 초기 인증 상태를 sessionStorage에서 읽어오는 함수
function getInitialAuthState(): {
  isAuthenticated: boolean
  user: { email: string; nickname: string; role: UserRole; token?: string } | null
} {
  // 서버 사이드에서는 항상 false 반환
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, user: null }
  }

  try {
    const storedUser = getStoredUser()
    
    // AccessToken 또는 RefreshToken이 있으면 인증 상태로 간주
    if (storedUser.accessToken || storedUser.refreshToken) {
      // email과 role이 있으면 완전한 사용자 정보로 복원
      if (storedUser.email && storedUser.role) {
        return {
          isAuthenticated: true,
          user: {
            email: storedUser.email,
            nickname: storedUser.nickname || storedUser.email.split('@')[0] || 'Admin',
            role: storedUser.role as UserRole,
            token: storedUser.accessToken || undefined,
          }
        }
      } else if (storedUser.accessToken) {
        // 토큰은 있지만 사용자 정보가 불완전한 경우
        return {
          isAuthenticated: true,
          user: {
            email: storedUser.email || 'admin@quinvir.com',
            nickname: storedUser.nickname || 'Admin',
            role: (storedUser.role as UserRole) || 'MEMBER',
            token: storedUser.accessToken,
          }
        }
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[AuthContext] 초기 인증 상태 읽기 실패:', error)
    }
  }

  return { isAuthenticated: false, user: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // 초기 상태를 sessionStorage에서 읽어서 설정
  const initialAuth = getInitialAuthState()
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated)
  const [user, setUser] = useState<{ email: string; nickname: string; role: UserRole; token?: string } | null>(initialAuth.user)
  const [isLoading, setIsLoading] = useState(true)

  // 페이지 로드 시 저장소에서 인증 상태 확인 및 동기화
  useEffect(() => {
    const storedUser = getStoredUser()
    const isAuth = getAuthState()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthContext] 인증 상태 복원 시도:', {
        isAuth,
        hasAccessToken: !!storedUser.accessToken,
        hasRefreshToken: !!storedUser.refreshToken,
        hasEmail: !!storedUser.email,
        hasRole: !!storedUser.role,
        storedUser,
        currentState: { isAuthenticated, userEmail: user?.email },
        timestamp: new Date().toISOString(),
      })
    }
    
    // 저장된 인증 정보가 있으면 복원
    // email과 role이 있으면 인증 상태로 간주 (토큰이 없어도 일단 복원)
    if (storedUser.email && storedUser.role) {
      setIsAuthenticated(true)
      setUser({
        email: storedUser.email,
        nickname: storedUser.nickname || storedUser.email.split('@')[0] || 'Admin',
        role: storedUser.role as UserRole,
        token: storedUser.accessToken || undefined,
      })
      
      // 인증 상태도 저장소에 다시 저장 (확실하게)
      setAuthState(true)
      
      // 토큰이 없으면 경고
      if (!storedUser.accessToken && !storedUser.refreshToken) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthContext] 토큰 없이 인증 상태 복원 (email/role 기반):', {
            email: storedUser.email,
            role: storedUser.role,
            timestamp: new Date().toISOString(),
          })
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthContext] 인증 상태 복원 성공:', {
            email: storedUser.email,
            role: storedUser.role,
            hasAccessToken: !!storedUser.accessToken,
            hasRefreshToken: !!storedUser.refreshToken,
            timestamp: new Date().toISOString(),
          })
        }
      }
    } else if (storedUser.accessToken || storedUser.refreshToken) {
      // 토큰은 있지만 사용자 정보가 불완전한 경우
      setIsAuthenticated(true)
      setUser({
        email: storedUser.email || 'admin@quinvir.com',
        nickname: storedUser.nickname || 'Admin',
        role: (storedUser.role as UserRole) || 'MEMBER',
        token: storedUser.accessToken,
      })
      setAuthState(true)
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('[AuthContext] 불완전한 인증 정보로 복원 (토큰 기반):', {
          hasAccessToken: !!storedUser.accessToken,
          hasEmail: !!storedUser.email,
          hasRole: !!storedUser.role,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      // 인증 정보가 전혀 없으면 인증 상태 해제
      setIsAuthenticated(false)
      setUser(null)
      setAuthState(false)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] 저장된 인증 정보 없음, 로그인 필요')
      }
    }
    
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Quinvir 직원 이메일(@quinvir.com)만 허용
    if (!email.endsWith('@quinvir.com')) {
      return { success: false, error: 'Quinvir 직원 이메일(@quinvir.com)만 로그인 가능합니다.' }
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] 로그인 시작:', { email, timestamp: new Date().toISOString() })
      }

      // API 호출
      const response: LoginResponse = await loginAdmin(email, password)
      
      if (!response.success || !response.data) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[AuthContext] 로그인 실패:', { 
            error: response.error,
            timestamp: new Date().toISOString() 
          })
        }
        return { 
          success: false, 
          error: response.error || '로그인에 실패했습니다.' 
        }
      }

      // API 응답에서 Role 매핑
      let role: UserRole = 'MEMBER'
      const apiRole = response.data.role?.toUpperCase()
      
      if (apiRole === 'SUPER_ADMIN' || apiRole === 'SUPERADMIN') {
        role = 'SUPER_ADMIN'
      } else if (apiRole === 'ADMIN') {
        role = 'ADMIN'
      } else if (apiRole === 'TESTER' || apiRole === 'TEST') {
        role = 'TESTER'
      } else {
        role = 'MEMBER'
      }

      // AccessToken과 RefreshToken 분리 저장
      const accessToken = response.data.accessToken || response.data.token
      const refreshToken = response.data.refreshToken
      const userEmail = response.data.email || email
      const userNickname = response.data.nickname || email.split('@')[0] || 'Admin'
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] 로그인 응답 데이터:', {
          responseData: response.data,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length,
          refreshTokenLength: refreshToken?.length,
          accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
          email: userEmail,
          role,
          timestamp: new Date().toISOString(),
        })
      }
      
      // 토큰이 없으면 경고
      if (!accessToken && !refreshToken) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[AuthContext] ⚠️ 토큰이 없습니다! API 응답을 확인하세요:', {
            responseData: response.data,
            timestamp: new Date().toISOString(),
          })
        }
      }
      
      // 보안 저장소에 모든 인증 정보 저장 (sessionStorage 사용)
      // accessToken과 refreshToken을 명시적으로 저장
      if (accessToken || refreshToken || userEmail) {
        setAuthData({
          accessToken: accessToken || undefined,
          refreshToken: refreshToken || undefined,
          role,
          email: userEmail,
          nickname: userNickname,
        })
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.error('[AuthContext] 저장할 데이터가 없습니다!')
        }
      }
      
      // 저장 후 확인
      if (process.env.NODE_ENV === 'development') {
        // 약간의 지연 후 확인 (비동기 저장 완료 대기)
        setTimeout(() => {
          const verifyStored = getStoredUser()
          console.log('[AuthContext] 저장 후 확인:', {
            hasAccessToken: !!verifyStored.accessToken,
            hasRefreshToken: !!verifyStored.refreshToken,
            hasEmail: !!verifyStored.email,
            hasRole: !!verifyStored.role,
            accessTokenPreview: verifyStored.accessToken ? `${verifyStored.accessToken.substring(0, 20)}...` : null,
            timestamp: new Date().toISOString(),
          })
        }, 100)
      }
      
      const userData = {
        email: userEmail,
        nickname: userNickname,
        role,
        token: accessToken,
      }
      
      setIsAuthenticated(true)
      setUser(userData)
      
      // 인증 상태를 명시적으로 저장
      setAuthState(true)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthContext] 로그인 성공:', {
          email: userData.email,
          role: userData.role,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          storageType: 'sessionStorage',
          timestamp: new Date().toISOString(),
        })
      }
      
      return { success: true }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[AuthContext] 로그인 예외 발생:', {
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

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    
    // 모든 인증 정보 제거 (sessionStorage 포함)
    clearAuthData()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[AuthContext] 로그아웃:', {
        timestamp: new Date().toISOString(),
      })
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

