export type ApiEnvironment = 'dev' | 'live'

export const API_ENV_STORAGE_KEY = 'apiEnvironment'

export const API_BASE_URLS: Record<ApiEnvironment, string> = {
  // dev: 'https://ls-api-dev.hence.events',
  dev: 'http://localhost:3000',
  live: 'https://ls-api.hence.events',
}

export function isApiEnvironment(value: string | null | undefined): value is ApiEnvironment {
  return value === 'dev' || value === 'live'
}
