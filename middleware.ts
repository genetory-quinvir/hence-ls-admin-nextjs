import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Chrome DevTools가 자동으로 요청하는 파일에 대해 200 응답 반환
  if (request.nextUrl.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
    return NextResponse.json({}, { status: 200 })
  }

  return NextResponse.next()
}

// 미들웨어를 실행할 경로 설정
export const config = {
  matcher: [
    '/.well-known/appspecific/com.chrome.devtools.json',
  ],
}
