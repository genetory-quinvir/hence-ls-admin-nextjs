import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ls-api-dev.hence.events'
const FIXED_PASSWORD = 'Quinvir2026!'

interface GenerateAndCreateLiveSpaceRequest {
  title?: string
  placeName?: string
  address?: string
  longitude?: number
  latitude?: number
  startsAt?: string
  thumbnailImageId?: string
}

/**
 * 자동 Live Space 생성 내부 API 라우트
 * 1. 자동으로 회원가입 (이메일 자동 생성)
 * 2. 회원가입으로 받은 토큰으로 Live Space 생성
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body: GenerateAndCreateLiveSpaceRequest = await request.json().catch(() => ({}))
    
    console.log('📥 [Internal API] 자동 Live Space 생성 요청:', {
      body,
      timestamp: new Date().toISOString(),
    })

    // 필수 필드 확인
    if (!body.title || !body.placeName || !body.address || body.longitude === undefined || body.latitude === undefined) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다. (title, placeName, address, longitude, latitude)' },
        { status: 400 }
      )
    }

    // 날짜를 YYYY-MM-DDTHH:mm:ss 형식으로 변환하는 함수
    const formatDateTime = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }

    // 시작 날짜 설정
    let startsAt = body.startsAt
    if (!startsAt) {
      const defaultStart = new Date()
      defaultStart.setHours(defaultStart.getHours() + 1)
      startsAt = formatDateTime(defaultStart)
    } else {
      // 이미 ISO 형식이면 그대로 사용, 아니면 변환
      const date = new Date(startsAt)
      if (!isNaN(date.getTime())) {
        startsAt = formatDateTime(date)
      }
    }

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

    // 2. Live Space 생성
    const createSpaceUrl = `${API_BASE_URL}/api/v1/space`
    
    // placeName은 실제 장소명이 아니라 지역명이므로, address에서 추출하거나 기본값 사용
    const placeName = body.placeName || body.address?.split(' ')[1] || '장소'

    const createSpaceData = {
      title: body.title,
      placeName: placeName,
      address: body.address,
      longitude: body.longitude,
      latitude: body.latitude,
      startsAt: startsAt,
      ...(body.thumbnailImageId && { thumbnailImageId: body.thumbnailImageId }),
    }

    console.log('📤 [Internal API] Live Space 생성 API 호출:', {
      url: createSpaceUrl,
      data: createSpaceData,
      timestamp: new Date().toISOString(),
    })

    const spaceResponse = await fetch(createSpaceUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createSpaceData),
    })

    if (!spaceResponse.ok) {
      const errorText = await spaceResponse.text().catch(() => '')
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { message: errorText || '알 수 없는 오류' }
      }
      
      console.error('❌ [Internal API] Live Space 생성 실패:', {
        status: spaceResponse.status,
        errorData,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        { 
          success: false, 
          error: errorData.message || errorData.error || `Live Space 생성 실패 (${spaceResponse.status})` 
        },
        { status: spaceResponse.status }
      )
    }

    const spaceResponseData = await spaceResponse.json().catch(() => ({}))
    
    console.log('✅ [Internal API] 자동 Live Space 생성 성공:', {
      data: spaceResponseData,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: spaceResponseData,
    })
  } catch (error) {
    console.error('❌ [Internal API] 자동 Live Space 생성 예외:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '자동 Live Space 생성 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

