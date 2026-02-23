'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { clearAuthData } from '../lib/authStorage'
import { API_BASE_URLS, API_ENV_STORAGE_KEY, type ApiEnvironment } from '../lib/api-base-url'

interface ApiBaseUrlContextType {
  environment: ApiEnvironment
  apiBaseUrl: string
  setEnvironment: (env: ApiEnvironment, skipLogout?: boolean) => void
}

const ApiBaseUrlContext = createContext<ApiBaseUrlContextType | undefined>(undefined)

export function ApiBaseUrlProvider({ children }: { children: ReactNode }) {
  // 초기 환경 설정 (localStorage에서 읽어오거나 기본값 'live' 사용)
  const [environment, setEnvironmentState] = useState<ApiEnvironment>(() => {
    if (typeof window === 'undefined') return 'live'
    const stored = localStorage.getItem(API_ENV_STORAGE_KEY)
    return stored === 'dev' ? 'dev' : 'live'
  })

  const apiBaseUrl = API_BASE_URLS[environment]

  // 환경 변경 시 localStorage에 저장하고, 로그아웃 처리 (skipLogout이 false일 때)
  const setEnvironment = (env: ApiEnvironment, skipLogout: boolean = false) => {
    // 환경이 실제로 변경된 경우에만 처리
    if (env === environment) return
    
    setEnvironmentState(env)
    if (typeof window !== 'undefined') {
      localStorage.setItem(API_ENV_STORAGE_KEY, env)
      
      // 로그아웃 처리 (로그인 화면에서는 skipLogout=true로 호출)
      if (!skipLogout) {
        clearAuthData()
        // 페이지 새로고침으로 로그인 화면으로 이동
        window.location.reload()
      }
    }
  }

  return (
    <ApiBaseUrlContext.Provider value={{ environment, apiBaseUrl, setEnvironment }}>
      {children}
    </ApiBaseUrlContext.Provider>
  )
}

export function useApiBaseUrl() {
  const context = useContext(ApiBaseUrlContext)
  if (context === undefined) {
    throw new Error('useApiBaseUrl must be used within an ApiBaseUrlProvider')
  }
  return context
}
