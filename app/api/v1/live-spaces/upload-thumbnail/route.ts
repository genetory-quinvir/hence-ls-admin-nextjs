import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URLS } from '@/app/lib/api-base-url'

// API Base URL 가져오기 함수 (헤더에서 읽거나 기본값 사용)
function getApiBaseUrl(request: NextRequest): string {
  // 클라이언트에서 전달한 base URL 헤더 확인
  const customBaseUrl = request.headers.get('x-api-base-url')
  if (customBaseUrl) {
    return customBaseUrl
  }
  
  // 환경 변수 또는 기본값 사용 (개발 환경은 로컬 API 사용)
  const defaultBaseUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : API_BASE_URLS.dev
  return process.env.NEXT_PUBLIC_API_BASE_URL || defaultBaseUrl
}

const FIXED_PASSWORD = 'AutoUser123!@#'

/**
 * 자동 회원가입된 사용자 토큰으로 썸네일 이미지 업로드
 * 1. 자동으로 회원가입 (이메일 자동 생성)
 * 2. 회원가입으로 받은 토큰으로 썸네일 이미지 업로드
 */
export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request)
    
    // FormData에서 파일 추출
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    console.log('📥 [Internal API] 썸네일 이미지 업로드 요청:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
    })

    // 1. 자동 회원가입 (이메일 자동 생성)
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '')
    const uniqueId = Math.random().toString(36).substring(2, 10)
    const autoEmail = `user${timestamp}${uniqueId}@quinvir.com`

    console.log('📤 [Internal API] 자동 회원가입 호출:', {
      email: autoEmail,
      timestamp: new Date().toISOString(),
    })

    const joinResponse = await fetch(`${API_BASE_URL}/api/v1/auth/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: autoEmail,
        name: `User${uniqueId}`,
        password: FIXED_PASSWORD,
        confirmPassword: FIXED_PASSWORD,
        provider: 'EMAIL',
        providerId: null,
        providerOrigin: null,
        joinPlatform: 'BOT',
      }),
    })

    if (!joinResponse.ok) {
      const errorText = await joinResponse.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText || '알 수 없는 오류' }
      }

      console.error('❌ [Internal API] 회원가입 실패:', {
        status: joinResponse.status,
        errorData,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: errorData.message || errorData.error || `회원가입 실패 (${joinResponse.status})`,
        },
        { status: joinResponse.status }
      )
    }

    const joinResult = await joinResponse.json().catch(() => ({}))
    const userData = joinResult.data || {}
    const accessToken = userData.accessToken

    if (!accessToken) {
      console.error('❌ [Internal API] accessToken을 받을 수 없음:', {
        joinResult,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json(
        {
          success: false,
          error: '회원가입은 성공했지만 accessToken을 받을 수 없습니다.',
        },
        { status: 500 }
      )
    }

    console.log('✅ [Internal API] 회원가입 완료:', {
      email: autoEmail,
      tokenPrefix: accessToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    })

    // 2. 썸네일 이미지 업로드 (자동 회원가입된 토큰 사용)
    const uploadUrl = `${API_BASE_URL}/api/v1/space/thumbnail-image`

    // 파일명이 안전하지 않으면 안전한 파일명으로 변경
    let safeFileName = file.name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      const ext = file.name.split('.').pop() || 'webp'
      const fileTimestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(2, 8)
      safeFileName = `thumbnail_${fileTimestamp}_${randomStr}.${ext}`
    }

    // 안전한 파일명으로 새 File 객체 생성
    const safeFile = new File([file], safeFileName, {
      type: file.type,
      lastModified: file.lastModified,
    })

    const uploadFormData = new FormData()
    uploadFormData.append('files', safeFile)

    console.log('📤 [Internal API] 썸네일 이미지 업로드 API 호출:', {
      url: uploadUrl,
      fileName: safeFileName,
      fileSize: safeFile.size,
      timestamp: new Date().toISOString(),
    })

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: uploadFormData,
    })

    const responseText = await uploadResponse.text().catch(() => '')
    
    console.log('📥 [Internal API] 썸네일 이미지 업로드 응답:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      ok: uploadResponse.ok,
      timestamp: new Date().toISOString(),
    })

    if (!uploadResponse.ok) {
      let errorData: any = {}
      try {
        if (responseText) {
          errorData = JSON.parse(responseText)
        }
      } catch (e) {
        errorData = { message: responseText || '알 수 없는 오류' }
      }

      console.error('❌ [Internal API] 썸네일 이미지 업로드 실패:', {
        status: uploadResponse.status,
        errorData,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: errorData.message || errorData.error || `썸네일 이미지 업로드 실패 (${uploadResponse.status})`,
        },
        { status: uploadResponse.status }
      )
    }

    // 성공 응답 파싱
    let responseData: any = {}
    try {
      if (responseText) {
        responseData = JSON.parse(responseText)
      }
    } catch (e) {
      console.error('❌ [Internal API] 썸네일 이미지 업로드 응답 파싱 오류:', {
        error: e,
        responseText,
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json(
        {
          success: false,
          error: '응답 파싱 오류',
        },
        { status: 500 }
      )
    }

    console.log('✅ [Internal API] 썸네일 이미지 업로드 성공:', {
      code: responseData.code,
      data: responseData.data,
      uploadedFiles: responseData.data?.uploadedFiles,
      timestamp: new Date().toISOString(),
    })

    // 응답에서 thumbnailImageId 추출 (id 사용)
    const uploadedFiles = responseData.data?.uploadedFiles || []
    const thumbnailImageId = uploadedFiles[0]?.id

    if (!thumbnailImageId) {
      console.error('❌ [Internal API] 썸네일 이미지 업로드 응답에 id가 없음:', {
        responseData,
        uploadedFiles,
        firstFile: uploadedFiles[0],
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json(
        {
          success: false,
          error: '응답에서 이미지 id를 찾을 수 없습니다.',
        },
        { status: 500 }
      )
    }

    console.log('✅ [Internal API] thumbnailImageId 추출 완료:', {
      thumbnailImageId,
      fileId: uploadedFiles[0]?.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      thumbnailImageId: thumbnailImageId,
    })
  } catch (error: any) {
    console.error('❌ [Internal API] 썸네일 이미지 업로드 예외:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '썸네일 이미지 업로드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}
