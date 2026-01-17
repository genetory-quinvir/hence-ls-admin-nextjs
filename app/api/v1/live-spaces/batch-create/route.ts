import { NextRequest, NextResponse } from 'next/server'

// API Base URL 가져오기 함수 (헤더에서 읽거나 기본값 사용)
function getApiBaseUrl(request: NextRequest): string {
  // 클라이언트에서 전달한 base URL 헤더 확인
  const customBaseUrl = request.headers.get('x-api-base-url')
  if (customBaseUrl) {
    return customBaseUrl
  }
  
  // 환경 변수 또는 기본값 사용
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ls-api-dev.hence.events'
}

const FIXED_PASSWORD = 'Quinvir2026!'

interface BatchCreateLiveSpaceRequest {
  spaces: Array<{
    title?: string
    placeName?: string
    address?: string
    longitude?: number
    latitude?: number
    startsAt?: string
    thumbnailImageId?: string
    thumbnailFile?: File
  }>
}

/**
 * 일괄 Live Space 생성 내부 API 라우트
 * 1. 자동으로 회원가입 (이메일 자동 생성) - 한 번만 수행
 * 2. 회원가입으로 받은 토큰으로:
 *    - 각 스페이스의 이미지가 있으면 먼저 이미지 업로드
 *    - 각 스페이스 생성 (thumbnailImageId 포함)
 */
export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = getApiBaseUrl(request)
    
    // FormData 요청 처리
    const formData = await request.formData()
    
    // JSON 데이터 추출
    const jsonData = formData.get('data') as string
    if (!jsonData) {
      return NextResponse.json(
        { success: false, error: '데이터가 없습니다.' },
        { status: 400 }
      )
    }
    
    let body: BatchCreateLiveSpaceRequest
    try {
      body = JSON.parse(jsonData)
    } catch (e) {
      console.error('❌ [Internal API] JSON 파싱 오류:', e)
      return NextResponse.json(
        { success: false, error: 'JSON 파싱 오류' },
        { status: 400 }
      )
    }
    
    if (!body.spaces || !Array.isArray(body.spaces) || body.spaces.length === 0) {
      return NextResponse.json(
        { success: false, error: '스페이스 데이터가 없습니다.' },
        { status: 400 }
      )
    }
    
    console.log('📥 [Internal API] 일괄 Live Space 생성 요청:', {
      spaceCount: body.spaces.length,
      timestamp: new Date().toISOString(),
    })

    // 날짜를 YYYY-MM-DDTHH:mm:ss 형식으로 변환하는 함수
    // 날짜를 YYYY-MM-DDTHH:mm:ss 형식으로 변환하는 함수 (UTC 시간 사용)
    const formatDateTime = (date: Date): string => {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      const hours = String(date.getUTCHours()).padStart(2, '0')
      const minutes = String(date.getUTCMinutes()).padStart(2, '0')
      const seconds = String(date.getUTCSeconds()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
    }

    // 1. 자동 회원가입 (한 번만 수행)
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '')
    const uniqueId = Math.random().toString(36).substring(2, 10)
    const autoEmail = `user${timestamp}${uniqueId}@quinvir.com`

    console.log('📤 [Internal API] 자동 회원가입 호출 (일괄 생성):', {
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

    console.log('✅ [Internal API] 회원가입 완료 (일괄 생성):', {
      email: autoEmail,
      tokenPrefix: accessToken.substring(0, 20) + '...',
      timestamp: new Date().toISOString(),
    })

    // 2. 각 스페이스 생성 (같은 토큰 사용)
    const createSpaceUrl = `${API_BASE_URL}/api/v1/space`
    const results: Array<{ success: boolean; error?: string; data?: any }> = []
    
    for (let i = 0; i < body.spaces.length; i++) {
      const space = body.spaces[i]
      
      try {
        // 필수 필드 확인
        if (!space.title || !space.placeName || !space.address || space.longitude === undefined || space.latitude === undefined) {
          results.push({
            success: false,
            error: `스페이스 ${i + 1}: 필수 필드가 누락되었습니다.`,
          })
          continue
        }

        // 시작 날짜 설정
        let startsAt = space.startsAt
        if (!startsAt) {
          const defaultStart = new Date()
          defaultStart.setUTCHours(defaultStart.getUTCHours() + 1)
          startsAt = defaultStart.toISOString()
        } else {
          // ISO 형식으로 변환 (타임존 정보 포함)
          const date = new Date(startsAt)
          if (!isNaN(date.getTime())) {
            startsAt = date.toISOString()
          }
        }

        // 이미지 파일이 있으면 먼저 업로드
        let thumbnailImageId: string | undefined = space.thumbnailImageId
        
        // _hasThumbnailFile 플래그가 있거나 thumbnailFile이 있으면 파일 업로드 시도
        const hasThumbnailFile = (space as any)._hasThumbnailFile || space.thumbnailFile
        const fileIndex = (space as any)._fileIndex !== undefined ? (space as any)._fileIndex : i
        
        if (hasThumbnailFile && !thumbnailImageId) {
          // FormData에서 해당 파일 가져오기
          const file = formData.get(`file_${fileIndex}`) as File | null
          
          if (file && file instanceof File && file.size > 0) {
            console.log(`📤 [Internal API] 썸네일 이미지 업로드 시작 (스페이스 ${i + 1}):`, {
              fileName: file.name,
              fileSize: file.size,
              timestamp: new Date().toISOString(),
            })
            
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
            
            const uploadUrl = `${API_BASE_URL}/api/v1/space/thumbnail-image`
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: uploadFormData,
            })
            
            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text().catch(() => '')
              let errorData: any = {}
              try {
                if (errorText) {
                  errorData = JSON.parse(errorText)
                }
              } catch (e) {
                errorData = { message: errorText || '알 수 없는 오류' }
              }
              
              console.error(`❌ [Internal API] 썸네일 이미지 업로드 실패 (스페이스 ${i + 1}):`, {
                status: uploadResponse.status,
                errorData,
                timestamp: new Date().toISOString(),
              })
              
              results.push({
                success: false,
                error: `스페이스 ${i + 1}: 썸네일 이미지 업로드 실패 - ${errorData.message || errorData.error || `(${uploadResponse.status})`}`,
              })
              continue
            }
            
            const uploadResponseData = await uploadResponse.json().catch(() => ({}))
            const uploadedFiles = uploadResponseData.data?.uploadedFiles || []
            thumbnailImageId = uploadedFiles[0]?.id
            
            if (!thumbnailImageId) {
              console.error(`❌ [Internal API] 썸네일 이미지 업로드 응답에 id가 없음 (스페이스 ${i + 1}):`, {
                uploadResponseData,
                uploadedFiles,
                timestamp: new Date().toISOString(),
              })
              results.push({
                success: false,
                error: `스페이스 ${i + 1}: 응답에서 이미지 id를 찾을 수 없습니다.`,
              })
              continue
            }
            
            console.log(`✅ [Internal API] 썸네일 이미지 업로드 성공 (스페이스 ${i + 1}):`, {
              thumbnailImageId,
              timestamp: new Date().toISOString(),
            })
          }
        }

        // 스페이스 생성
        const placeName = space.placeName || space.address?.split(' ')[1] || '장소'
        
        const createSpaceData = {
          title: space.title,
          placeName: placeName,
          address: space.address,
          longitude: space.longitude,
          latitude: space.latitude,
          startsAt: startsAt,
          ...(thumbnailImageId && { thumbnailImageId }),
        }

        console.log(`📤 [Internal API] Live Space 생성 API 호출 (스페이스 ${i + 1}):`, {
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
          
          console.error(`❌ [Internal API] Live Space 생성 실패 (스페이스 ${i + 1}):`, {
            status: spaceResponse.status,
            errorData,
            timestamp: new Date().toISOString(),
          })

          results.push({
            success: false,
            error: `스페이스 ${i + 1}: ${errorData.message || errorData.error || `Live Space 생성 실패 (${spaceResponse.status})`}`,
          })
          continue
        }

        const spaceResponseData = await spaceResponse.json().catch(() => ({}))
        
        console.log(`✅ [Internal API] Live Space 생성 성공 (스페이스 ${i + 1}):`, {
          data: spaceResponseData,
          timestamp: new Date().toISOString(),
        })

        results.push({
          success: true,
          data: spaceResponseData,
        })
      } catch (error) {
        console.error(`❌ [Internal API] 스페이스 ${i + 1} 생성 예외:`, {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        })
        
        results.push({
          success: false,
          error: `스페이스 ${i + 1}: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log('✅ [Internal API] 일괄 Live Space 생성 완료:', {
      total: body.spaces.length,
      successCount,
      failCount,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: body.spaces.length,
        successCount,
        failCount,
      },
    })
  } catch (error) {
    console.error('❌ [Internal API] 일괄 Live Space 생성 예외:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '일괄 Live Space 생성 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

