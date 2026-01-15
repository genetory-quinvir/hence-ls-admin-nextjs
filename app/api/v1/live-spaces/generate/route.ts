import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

interface GenerateLiveSpaceRequest {
  count: number
  title?: string
  startsAt?: string
  customPrompt?: string
  characterPrompt?: string
  provider?: 'openai' | 'xai'
  batchMode?: boolean // 일괄 생성 모드 (한 회원으로 여러 스페이스 생성 시 true)
}

function getCurrentContext() {
  const now = new Date()
  const hour = now.getHours()
  const weekday = now.getDay() // 0: 일요일, 6: 토요일
  const month = now.getMonth() + 1

  // 시간대 분류
  let timePeriod: string
  let timeActivity: string
  if (6 <= hour && hour < 12) {
    timePeriod = '아침'
    timeActivity = '온라인 모임, 아침 대화, 화상 수다, 일상 공유'
  } else if (12 <= hour && hour < 17) {
    timePeriod = '오후'
    timeActivity = '온라인 채팅, 화상회의, 주제 토론, 취미 공유'
  } else if (17 <= hour && hour < 22) {
    timePeriod = '저녁'
    timeActivity = '온라인 게임, 대화방, 화상 수다, 취미 이야기'
  } else {
    timePeriod = '밤'
    timeActivity = '온라인 채팅, 심야 대화, 온라인 게임, 화상 모임'
  }

  // 계절 분류
  let season: string
  let seasonActivity: string
  if (month >= 12 || month <= 2) {
    season = '겨울'
    seasonActivity = '온라인 모임, 대화, 게임, 취미 공유'
  } else if (month >= 3 && month <= 5) {
    season = '봄'
    seasonActivity = '온라인 대화, 주제 토론, 일상 공유'
  } else if (month >= 6 && month <= 8) {
    season = '여름'
    seasonActivity = '온라인 게임, 화상 수다, 취미 이야기'
  } else {
    season = '가을'
    seasonActivity = '온라인 모임, 대화방, 화상회의'
  }

  // 요일별 특징
  const dayType = weekday === 0 || weekday === 6 ? '주말' : '평일'
  const dayActivity = dayType === '주말' 
    ? '온라인 모임, 화상회의, 온라인 게임, 대화방, 취미 공유'
    : '온라인 채팅, 대화방, 화상 수다, 일상 공유, 주제 토론'

  return {
    currentDate: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }),
    currentTime: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    hour,
    timePeriod,
    timeActivity,
    weekday,
    dayType,
    dayActivity,
    month,
    season,
    seasonActivity,
  }
}

// LLM 프로바이더 설정 (요청 본문의 provider 우선, 없으면 환경 변수 사용)
function getLlmConfig(provider?: 'openai' | 'xai') {
  const selectedProvider = provider || process.env.LLM_PROVIDER || 'openai'
  const apiKey = selectedProvider === 'xai' 
    ? (process.env.GROK_API_KEY || process.env.XAI_API_KEY || process.env.OPENAI_API_KEY || '')
    : (process.env.OPENAI_API_KEY || '')

  return {
    provider: selectedProvider,
    apiKey,
    baseURL: selectedProvider === 'xai' ? 'https://api.x.ai/v1' : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateLiveSpaceRequest = await request.json().catch(() => ({ count: 1 }))
    const count = body.count || 1

    // 프로바이더 설정 (요청 본문 우선, 없으면 환경 변수 사용)
    const llmConfig = getLlmConfig(body.provider)

    if (!llmConfig.apiKey) {
      const providerName = llmConfig.provider === 'xai' ? 'xAI' : 'OpenAI'
      return NextResponse.json(
        { success: false, error: `${providerName} API 키가 설정되지 않았습니다.` },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      apiKey: llmConfig.apiKey,
      ...(llmConfig.baseURL && { baseURL: llmConfig.baseURL }),
    })

    console.log('📤 [LLM API] Live Space 데이터 생성 요청:', {
      provider: llmConfig.provider,
      requestedProvider: body.provider,
      count,
      options: {
        title: body.title,
        startsAt: body.startsAt,
        customPrompt: body.customPrompt ? '사용자 프롬프트 제공됨' : undefined,
        characterPrompt: body.characterPrompt ? '캐릭터 프롬프트 제공됨' : undefined,
      },
      timestamp: new Date().toISOString(),
    })

    const context = getCurrentContext()

    // 캐릭터 프롬프트가 있으면 캐릭터 역할 부여, 없으면 기본 역할
    const systemPrompt = body.characterPrompt
      ? `당신은 ${body.characterPrompt}입니다.
이 캐릭터의 성격, 말투, 관심사, 스타일을 완전히 이해하고 그대로 행동해야 합니다.
현재 날짜, 시간대, 계절, 요일 등 상황을 고려하여 지금 바로 진행하기 좋은 활동을 이 캐릭터가 만들 것처럼 라이브 스페이스를 생성해야 합니다.
반드시 유효한 JSON 형식으로만 응답해야 합니다. 다른 텍스트나 설명은 절대 포함하지 마세요.`
      : `당신은 한국의 MZ 세대 문화와 트렌드를 잘 알고 있는 도우미입니다.
현재 날짜, 시간대, 계절, 요일 등 상황을 고려하여 지금 바로 진행하기 좋은 활동을 추천해야 합니다.
반드시 유효한 JSON 형식으로만 응답해야 합니다. 다른 텍스트나 설명은 절대 포함하지 마세요.`

    // batchMode일 때 시간을 먼저 생성하여 각 스페이스에 시간대 정보 제공
    let timeSlots: Array<{ hour: number; timePeriod: string; timeActivity: string }> = []
    
    if (body.batchMode) {
      const now = Date.now()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      
      // 하루 일상 시간대 (7시~23시)
      const firstHour = 7 + Math.random() * 3 // 7~10시 사이
      let currentHour = firstHour
      
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          // 1~4시간 랜덤 간격
          const intervalHours = 1 + Math.random() * 3
          currentHour += intervalHours
        }
        
        // 최대 23시까지 제한
        currentHour = Math.min(currentHour, 23)
        const hour = Math.floor(currentHour)
        const minute = Math.floor((currentHour - hour) * 60)
        
        // 시간대 분류
        let timePeriod: string
        let timeActivity: string
        if (6 <= hour && hour < 9) {
          timePeriod = '아침 (6-9시)'
          timeActivity = '아침 산책, 조깅, 카페에서 브런치, 아침 운동, 조용한 독서, 아침 일상 공유'
        } else if (9 <= hour && hour < 12) {
          timePeriod = '오전 (9-12시)'
          timeActivity = '카페에서 작업, 전시 관람, 쇼핑, 미술관/박물관, 조용한 카페 대화, 취미 활동'
        } else if (12 <= hour && hour < 14) {
          timePeriod = '점심 (12-14시)'
          timeActivity = '맛집 탐방, 점심 식사, 브런치, 카페에서 점심, 식당 모임, 맛집 리뷰'
        } else if (14 <= hour && hour < 17) {
          timePeriod = '오후 (14-17시)'
          timeActivity = '카페에서 작업, 전시/박물관, 쇼핑, 산책, 취미 활동, 친구 만나기, 오후 티타임'
        } else if (17 <= hour && hour < 20) {
          timePeriod = '저녁 (17-20시)'
          timeActivity = '저녁 식사, 맛집 탐방, 저녁 산책, 카페에서 저녁, 저녁 모임, 저녁 일상 공유'
        } else {
          timePeriod = '밤 (20-23시)'
          timeActivity = '야경 감상, 밤 산책, 술집/바, 밤 카페, 밤 모임, 야경 사진, 밤 일상 공유'
        }
        
        timeSlots.push({ hour, timePeriod, timeActivity })
      }
    }

    // 사용자 커스텀 프롬프트가 있으면 우선 사용, 없으면 기본 프롬프트 사용
    const basePrompt = `현재 상황에 맞는 MZ 세대 스타일의 라이브 스페이스를 ${count}개 생성해주세요.

⚠️ 매우 중요한 요구사항:
- 각 라이브 스페이스는 반드시 서로 다른 주제, 다른 제목 스타일, 다른 말투를 가져야 합니다
- "오늘 뭐해요?", "오늘 뭐하세요?" 같은 유사한 제목을 반복 사용하지 마세요
- 각 제목은 완전히 독립적이고 다양한 주제여야 합니다 (친구 찾기, 맛집 고민, 장소 추천, 일상 대화, 취미 공유, 모임, 이벤트 등)
- 제목의 길이도 다양하게 해주세요 (짧은 것, 긴 것, 물음표 있는 것, 없는 것 등)

현재 상황:
- 날짜: ${context.currentDate}
- 시간: ${context.currentTime} (${context.timePeriod})
- 요일: ${context.dayType}
- 계절: ${context.season}

${body.batchMode ? `\n🎯 일괄 생성 모드 - 각 스페이스는 지정된 시간대에 맞는 주제로 생성해야 합니다:
${timeSlots.map((slot, idx) => `  ${idx + 1}. 시간대: ${slot.timePeriod} (${slot.hour}시 경)
     → 이 시간대에 적합한 활동: ${slot.timeActivity}
     → 이 시간대에 맞는 주제로 라이브 스페이스를 생성해주세요 (예: ${slot.hour < 9 ? '아침 산책, 조깅, 브런치' : slot.hour < 12 ? '카페 작업, 전시 관람' : slot.hour < 14 ? '맛집 탐방, 점심 식사' : slot.hour < 17 ? '오후 티타임, 쇼핑' : slot.hour < 20 ? '저녁 식사, 저녁 산책' : '야경 감상, 밤 산책'} 등)`).join('\n')}
중요: 각 스페이스의 주제는 반드시 해당 시간대에 맞는 활동이어야 합니다. 예를 들어, 아침 시간대에는 "밤 산책" 같은 주제를 생성하지 마세요.` : `
현재 시간대(${context.timePeriod})에 적합한 활동: ${context.timeActivity}
계절(${context.season})에 적합한 활동: ${context.seasonActivity}
${context.dayType}에 적합한 활동: ${context.dayActivity}`}

${body.title ? `사용자가 요청한 제목 템플릿: "${body.title}" (이를 참고하되, 완전히 다른 주제와 스타일로 다양하게 변형하여 사용하세요)` : ''}

위 상황을 고려하여 ${body.batchMode ? '각 시간대에 맞는' : '지금 바로 친구들과 함께 할 수 있는'} 적절한 활동으로 라이브 스페이스를 ${count}개 만들어주세요.`

    // 캐릭터 프롬프트가 있으면 캐릭터 관점 추가
    const characterContext = body.characterPrompt
      ? `\n\n🎭 캐릭터 요구사항:
- 위에서 정의한 캐릭터의 성격과 말투를 그대로 반영해야 합니다
- 제목(title)은 이 캐릭터가 직접 작성한 것처럼 보여야 합니다 (캐릭터의 말투, 문체, 관심사 반영)
- 장소 선택도 이 캐릭터가 가고 싶어할 장소여야 합니다
- 각 라이브 스페이스는 이 캐릭터가 만든 것처럼 일관성 있게 생성하되, 주제는 다양하게 해주세요`
      : ''

    // 사용자 커스텀 프롬프트가 있으면 우선 사용, 없으면 기본 프롬프트 사용
    // startsAt은 서버에서 랜덤 생성하므로 프롬프트에서 제거
    const userPrompt = body.customPrompt 
      ? `${body.customPrompt}${characterContext}${body.batchMode && timeSlots.length > 0 ? `\n\n⚠️ 중요: 일괄 생성 모드입니다. 아래 순서대로 각 시간대에 맞는 주제를 생성해주세요:\n${timeSlots.map((slot, idx) => `  ${idx + 1}번째 스페이스: ${slot.timePeriod} (${slot.hour}시) → ${slot.timeActivity} 관련 주제`).join('\n')}` : ''}\n\n라이브 스페이스 ${count}개를 생성해주세요. 서로 다른 지역, 주제, 말투로 생성해주세요.\n\nJSON 형식:\n[{"title": "제목", "placeName": "장소명", "address": "서울특별시 구 동", "longitude": 127.0, "latitude": 37.5}, ... (총 ${count}개)]`
      : `${basePrompt}${characterContext}

다양한 지역, 주제, 말투로 생성해주세요.
${body.batchMode && timeSlots.length > 0 ? `\n⚠️ 매우 중요: 일괄 생성 모드입니다. 반드시 아래 순서대로 생성해주세요:
${timeSlots.map((slot, idx) => `  ${idx + 1}번째 스페이스: ${slot.timePeriod} (${slot.hour}시 경) → 반드시 "${slot.timeActivity}" 중 하나와 관련된 주제로 생성`).join('\n')}
각 스페이스의 주제는 해당 시간대에 맞는 활동이어야 합니다. 순서를 절대 바꾸지 마세요!` : ''}

JSON 형식으로 응답 (startsAt 필드는 제외):
[
  {"title": "제목", "placeName": "장소명", "address": "서울특별시 구 동", "longitude": 127.0, "latitude": 37.5},
  ... (총 ${count}개)
]

요구사항:
- title: ${body.characterPrompt ? '캐릭터의 성격과 말투를 반영한 제목' : 'MZ세대 스타일 제목, 다양한 말투/주제, 이모지 가끔 사용'}${body.batchMode && timeSlots.length > 0 ? ` (일괄 생성 모드: 각 스페이스는 위에서 지정한 시간대에 맞는 주제여야 합니다)` : ''}
- placeName: 서울시 다양한 지역${body.characterPrompt ? ' (캐릭터가 가고 싶어할 장소)' : ''}${body.batchMode ? ' (일괄 생성 모드: 서로 현실적인 이동 거리 내의 지역으로 생성, 예: 강남구 내 여러 장소, 홍대 근처 여러 장소 등)' : ''}
- address: 실제 주소 형식
- longitude/latitude: 서울 지역 좌표 (126-128, 37.4-37.7)${body.batchMode ? ' (일괄 생성 모드: 서로 가까운 위치, 현실적인 이동 거리 내에서 생성, 너무 멀리 떨어진 지역은 피하세요)' : ''}
- startsAt: 생성하지 마세요 (서버에서 자동 설정됩니다)`

    try {
      // 기본 모델 설정 (프로바이더별)
      // Grok을 사용할 때는 항상 Grok 모델명 사용 (환경 변수가 OpenAI 모델명이면 무시)
      let model: string
      if (llmConfig.provider === 'xai') {
        // Grok 모델명 확인 (grok-로 시작하는 모델만 사용)
        const envModel = process.env.LLM_MODEL
        if (envModel && envModel.startsWith('grok-')) {
          model = envModel
        } else {
          // 기본 Grok 모델 사용 (Grok 4.1 Fast: 빠르고 효율적)
          model = 'grok-3-mini'
        }
      } else {
        // OpenAI 사용 시
        model = process.env.LLM_MODEL || 'gpt-4o-mini'
      }
      const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.9')
      // 생성 개수에 따라 max_tokens 동적 조정 (1개당 약 200-250 토큰 필요, 여유있게 300으로 계산)
      const defaultMaxTokens = parseInt(process.env.LLM_MAX_TOKENS || '2000', 10)
      const estimatedMaxTokens = Math.max(defaultMaxTokens, count * 300)
      const maxTokens = Math.min(estimatedMaxTokens, 4000) // 최대 4000 토큰으로 제한

      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.0, // 최대 다양성을 위해 temperature를 1.0으로 설정
        max_tokens: maxTokens,
      })

      const generatedContent = response.choices[0].message.content?.trim() || ''

      console.log('📥 [LLM API] LLM 응답:', {
        model: response.model,
        usage: response.usage,
        contentLength: generatedContent.length,
        contentPreview: generatedContent.substring(0, 500),
        timestamp: new Date().toISOString(),
      })

      // JSON 코드 블록 제거 (```json ... ``` 형식)
      let jsonContent = generatedContent.trim()
      
      // 코드 블록 제거 시도
      if (jsonContent.includes('```json')) {
        const parts = jsonContent.split('```json')
        if (parts.length > 1) {
          jsonContent = parts[1].split('```')[0].trim()
        }
      } else if (jsonContent.includes('```')) {
        const parts = jsonContent.split('```')
        if (parts.length > 1) {
          // 첫 번째 코드 블록 내용 추출
          jsonContent = parts[1].split('```')[0].trim()
        }
      }
      
      // JSON 배열 시작 부분 찾기 (대괄호로 시작하는 부분)
      const jsonStart = jsonContent.indexOf('[')
      const jsonEnd = jsonContent.lastIndexOf(']')
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1)
      }

      console.log('📥 [LLM API] 추출된 JSON 내용:', {
        length: jsonContent.length,
        preview: jsonContent.substring(0, 500),
        firstChar: jsonContent.substring(0, 1),
        lastChar: jsonContent.substring(jsonContent.length - 1),
        timestamp: new Date().toISOString(),
      })

      let spacesList
      try {
        spacesList = JSON.parse(jsonContent)
        console.log('✅ [LLM API] JSON 파싱 성공:', {
          type: typeof spacesList,
          isArray: Array.isArray(spacesList),
          length: Array.isArray(spacesList) ? spacesList.length : 1,
          timestamp: new Date().toISOString(),
        })
      } catch (jsonError: any) {
        // JSON 파싱 실패 시 오류 반환
        console.error('❌ [LLM API] JSON 파싱 오류:', {
          error: jsonError.message,
          errorStack: jsonError.stack,
          originalContent: generatedContent.substring(0, 1000),
          extractedContent: jsonContent.substring(0, 1000),
          contentLength: jsonContent.length,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json(
          {
            success: false,
            error: 'LLM 응답을 파싱할 수 없습니다. 응답 형식을 확인해주세요.',
            details: jsonError.message,
          },
          { status: 500 }
        )
      }

      // 배열이 아닌 경우 배열로 변환
      const spacesArray = Array.isArray(spacesList) ? spacesList : [spacesList]

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

      // 각 라이브 스페이스 데이터 처리
      const now = Date.now()
      const oneHourInMs = 60 * 60 * 1000 // 1시간 (밀리초)

      const processedSpaces = spacesArray.slice(0, count).map((spaceData: any, index: number) => {
        let startDate: Date
        
        if (body.batchMode && timeSlots.length > index) {
          // 일괄 생성 모드: 미리 계산된 시간대 사용
          // KST 시간을 UTC로 변환하여 저장 (KST = UTC+9)
          const slot = timeSlots[index]
          const today = new Date(now)
          today.setUTCHours(0, 0, 0, 0) // 오늘 00:00:00 UTC
          
          // KST 시간을 UTC로 변환 (KST 시간 - 9시간 = UTC 시간)
          const kstHour = slot.hour
          const utcHour = kstHour - 9
          const randomMinute = Math.floor(Math.random() * 60)
          
          startDate = new Date(today)
          if (utcHour < 0) {
            // UTC 시간이 음수면 전날로 이동
            startDate.setUTCDate(startDate.getUTCDate() - 1)
            startDate.setUTCHours(24 + utcHour, randomMinute, 0, 0)
          } else {
            startDate.setUTCHours(utcHour, randomMinute, 0, 0)
          }
          
          // 만약 현재 시간보다 이전이면 다음 날로 설정 (미래 시간 보장)
          if (startDate.getTime() <= now) {
            startDate.setUTCDate(startDate.getUTCDate() + 1)
          }
        } else if (body.batchMode) {
          // timeSlots가 없는 경우 (fallback)
          const today = new Date(now)
          today.setUTCHours(0, 0, 0, 0)
          const firstHour = 7 + Math.random() * 3 // KST 시간
          let currentHour = firstHour
          for (let i = 0; i < index; i++) {
            const intervalHours = 1 + Math.random() * 3
            currentHour += intervalHours
          }
          currentHour = Math.min(currentHour, 23)
          const randomMinute = Math.floor(Math.random() * 60)
          
          // KST 시간을 UTC로 변환
          const utcHour = currentHour - 9
          startDate = new Date(today)
          if (utcHour < 0) {
            startDate.setUTCDate(startDate.getUTCDate() - 1)
            startDate.setUTCHours(24 + utcHour, randomMinute, 0, 0)
          } else {
            startDate.setUTCHours(utcHour, randomMinute, 0, 0)
          }
          if (startDate.getTime() <= now) {
            startDate.setUTCDate(startDate.getUTCDate() + 1)
          }
        } else {
          // 개별 생성 모드: 현재 시각 기준 1시간 전~현재 사이 랜덤
          const randomOffset = Math.random() * oneHourInMs // 0~1시간 사이 랜덤
          startDate = new Date(now - randomOffset) // 현재에서 1시간 전~현재 사이
        }
        
        // ISO 형식으로 반환하여 타임존 정보 포함
        const startTime = startDate.toISOString()

        return {
          title: spaceData.title || '라이브 스페이스',
          placeName: spaceData.placeName || '장소명',
          address: spaceData.address || '서울특별시',
          longitude: spaceData.longitude || 127.0276,
          latitude: spaceData.latitude || 37.4979,
          startsAt: startTime,
        }
      })

      console.log('✅ [LLM API] Live Space 데이터 생성 성공:', {
        count: processedSpaces.length,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        data: processedSpaces,
      })
    } catch (error: any) {
      console.error('❌ [LLM API] LLM 호출 오류:', {
        error: error.message,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          success: false,
          error: error.message || 'LLM 호출 중 오류가 발생했습니다.',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ [LLM API] Live Space 데이터 생성 예외:', {
      error: error.message,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Live Space 데이터 생성 중 오류가 발생했습니다.',
      },
      { status: 500 }
    )
  }
}


