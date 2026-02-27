export type ApiEnvironment = 'dev' | 'live'

export const API_ENV_STORAGE_KEY = 'apiEnvironment'

export const API_BASE_URLS: Record<ApiEnvironment, string> = {
  dev: 'https://ls-api-dev.hence.events',
  // dev: 'http://localhost:3000',
  live: 'https://ls-api.hence.events',
}

export function isApiEnvironment(value: string | null | undefined): value is ApiEnvironment {
  return value === 'dev' || value === 'live'
}

type HeaderGetter = { get: (name: string) => string | null }

export function getServerApiBaseUrl(headers?: HeaderGetter | null): string {
  const customBaseUrl = headers?.get('x-api-base-url')
  if (customBaseUrl) return customBaseUrl

  const defaultBaseUrl =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : API_BASE_URLS.dev
  return process.env.NEXT_PUBLIC_API_BASE_URL || defaultBaseUrl
}
