'use client'

import { useState } from 'react'
import { generateAndCreateLiveSpace, GenerateAndCreateLiveSpaceRequest, uploadLiveSpaceThumbnail, generateLiveSpacePreview, GeneratedLiveSpace } from '../lib/api'
import { LiveSpace, LiveSpaceCategory } from '../data/mockData'
import styles from './LiveSpaceCreate.module.css'

interface PreviewLiveSpace extends Omit<LiveSpace, 'id'> {
  id: string
  isPreview: true
  thumbnailImageId?: string
  description?: string
}

export default function LiveSpaceAutomation() {
  const [generationCount, setGenerationCount] = useState<number>(1)
  const [llmProvider, setLlmProvider] = useState<'openai' | 'xai'>('xai')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewSpaces, setPreviewSpaces] = useState<PreviewLiveSpace[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishedCount, setPublishedCount] = useState(0)
  
  // 폼 상태
  const [formData, setFormData] = useState({
    customPrompt: '',
    characterPrompt: '',
  })
  
  // 각 미리보기 카드별 이미지 파일 관리
  const [cardThumbnailFiles, setCardThumbnailFiles] = useState<Map<string, File>>(new Map())
  const [cardThumbnailPreviews, setCardThumbnailPreviews] = useState<Map<string, string>>(new Map())
  
  // 수정 모달 상태
  const [editingSpace, setEditingSpace] = useState<PreviewLiveSpace | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    startsAt: '',
    address: '',
    latitude: '',
    longitude: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }



  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsGenerating(true)

    try {
      // 생성할 개수 확인
      const count = generationCount > 0 ? generationCount : 1
      
      if (count < 1 || count > 50) {
        alert('생성 개수는 1개 이상 50개 이하여야 합니다.')
        setIsGenerating(false)
        return
      }
      
      // LLM을 사용하여 미리보기 데이터 생성
      const generateResult = await generateLiveSpacePreview({
        count,
        customPrompt: formData.customPrompt.trim() || undefined,
        characterPrompt: formData.characterPrompt.trim() || undefined,
        provider: llmProvider,
      })
      
      if (!generateResult.success || !generateResult.data) {
        alert(generateResult.error || '미리보기 생성 중 오류가 발생했습니다.')
        setIsGenerating(false)
        return
      }
      
      // GeneratedLiveSpace를 PreviewLiveSpace로 변환
      const previews: PreviewLiveSpace[] = generateResult.data.map((space: GeneratedLiveSpace, index: number) => {
        const previewId = `preview-${Date.now()}-${index}`
        
        return {
          id: previewId,
          title: space.title,
          hostNickname: '시스템',
          hostId: 'system',
          thumbnail: undefined,
          category: 'HENCE' as LiveSpaceCategory, // 기본값 사용
          status: 'live' as const,
          createdAt: space.startsAt,
          startedAt: space.startsAt,
          endedAt: new Date(new Date(space.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 시작 시간 + 2시간
          scheduledStartTime: space.startsAt,
          scheduledEndTime: new Date(new Date(space.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          location: {
            lat: space.latitude,
            lng: space.longitude,
            address: space.address,
            district: space.address.split(' ')[1] || '', // 주소에서 구 추출
          },
          checkInCount: 0,
          feedCount: 0,
          reportedCount: 0,
          isPreview: true,
          thumbnailImageId: undefined,
        }
      })
      
      // 기존 미리보기 목록에 새로 생성된 미리보기 추가
      setPreviewSpaces(prev => [...prev, ...previews])
      
      // 폼 초기화 (프롬프트는 유지하지 않음)
      setFormData(prev => ({
        ...prev,
        customPrompt: '',
        characterPrompt: '',
      }))
    } catch (error) {
      console.error('미리보기 생성 오류:', error)
      alert('미리보기 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublish = async (space: PreviewLiveSpace) => {
    if (!confirm(`"${space.title}"를 실제 서버에 발행하시겠습니까?`)) {
      return
    }
    
    setIsPublishing(true)
    
    try {
      // 카드에 추가된 이미지 파일 가져오기
      const cardImageFile = cardThumbnailFiles.get(space.id)
      
      // API 요청 데이터 준비 (이미지 파일을 직접 전달 - 같은 토큰으로 처리됨)
      const requestData: GenerateAndCreateLiveSpaceRequest = {
        title: space.title,
        placeName: space.location?.district || space.location?.address?.split(' ')[1] || '',
        address: space.location?.address || '',
        longitude: space.location?.lng || 0,
        latitude: space.location?.lat || 0,
        startsAt: space.startedAt || space.scheduledStartTime || '',
        // 이미지 파일이 있으면 파일을 직접 전달 (이미지 ID는 제거)
        ...(cardImageFile && !space.thumbnailImageId ? { thumbnailFile: cardImageFile } : {}),
        // 이미지 파일이 없고 ID만 있으면 ID 사용
        ...(!cardImageFile && space.thumbnailImageId ? { thumbnailImageId: space.thumbnailImageId } : {}),
      }
      
      // generateAndCreateLiveSpace가 자동으로:
      // 1. 자동 회원가입 (한 번만)
      // 2. 같은 토큰으로 이미지 업로드 (파일이 있는 경우)
      // 3. 같은 토큰으로 스페이스 생성
      const result = await generateAndCreateLiveSpace(requestData)
      
      if (!result.success) {
        alert(result.error || 'Live Space 발행 중 오류가 발생했습니다.')
        setIsPublishing(false)
        return
      }
      
      // 발행 성공 - 미리보기 목록에서 제거
      setPreviewSpaces(prev => prev.filter(s => s.id !== space.id))
      setPublishedCount(prev => prev + 1)
      
      alert('Live Space가 성공적으로 발행되었습니다.')
    } catch (error) {
      console.error('Live Space 발행 오류:', error)
      alert('Live Space 발행 중 오류가 발생했습니다.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handlePublishAll = async () => {
    if (previewSpaces.length === 0) {
      alert('발행할 Live Space가 없습니다.')
      return
    }
    
    if (!confirm(`총 ${previewSpaces.length}개의 Live Space를 모두 발행하시겠습니까?`)) {
      return
    }
    
    setIsPublishing(true)
    
    try {
      let successCount = 0
      let failCount = 0
      
      for (const space of previewSpaces) {
        try {
          // 카드에 추가된 이미지 파일 가져오기
          const cardImageFile = cardThumbnailFiles.get(space.id)
          
          // API 요청 데이터 준비 (이미지 파일을 직접 전달 - 같은 토큰으로 처리됨)
          const requestData: GenerateAndCreateLiveSpaceRequest = {
            title: space.title,
            placeName: space.location?.district || space.location?.address?.split(' ')[1] || '',
            address: space.location?.address || '',
            longitude: space.location?.lng || 0,
            latitude: space.location?.lat || 0,
            startsAt: space.startedAt || space.scheduledStartTime || '',
            // 이미지 파일이 있으면 파일을 직접 전달 (이미지 ID는 제거)
            ...(cardImageFile && !space.thumbnailImageId ? { thumbnailFile: cardImageFile } : {}),
            // 이미지 파일이 없고 ID만 있으면 ID 사용
            ...(!cardImageFile && space.thumbnailImageId ? { thumbnailImageId: space.thumbnailImageId } : {}),
          }
          
          // generateAndCreateLiveSpace가 자동으로:
          // 1. 자동 회원가입 (각 스페이스마다 한 번씩)
          // 2. 같은 토큰으로 이미지 업로드 (파일이 있는 경우)
          // 3. 같은 토큰으로 스페이스 생성
          const result = await generateAndCreateLiveSpace(requestData)
          
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
          console.error(`Live Space 발행 오류 (${space.title}):`, error)
        }
      }
      
      // 발행 완료 - 미리보기 목록 초기화
      setPreviewSpaces([])
      setPublishedCount(prev => prev + successCount)
      
      if (failCount > 0) {
        alert(`발행 완료: ${successCount}개 성공, ${failCount}개 실패`)
      } else {
        alert(`모든 Live Space가 성공적으로 발행되었습니다. (${successCount}개)`)
      }
    } catch (error) {
      console.error('일괄 발행 오류:', error)
      alert('일괄 발행 중 오류가 발생했습니다.')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleRemovePreview = (spaceId: string) => {
    setPreviewSpaces(prev => prev.filter(s => s.id !== spaceId))
    // 해당 카드의 이미지도 제거
    handleCardImageRemove(spaceId)
  }

  const handleClearAllPreviews = () => {
    if (previewSpaces.length === 0) {
      return
    }
    
    if (confirm(`모든 미리보기 (${previewSpaces.length}개)를 삭제하시겠습니까?`)) {
      setPreviewSpaces([])
    }
  }

  const handleEditPreview = (space: PreviewLiveSpace) => {
    setEditingSpace(space)
    // startsAt을 datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
    const startsAtDate = space.startedAt || space.createdAt || ''
    const formattedDate = startsAtDate ? new Date(startsAtDate).toISOString().slice(0, 16) : ''
    
    setEditFormData({
      title: space.title || '',
      startsAt: formattedDate,
      address: space.location.address || '',
      latitude: space.location.lat?.toString() || '',
      longitude: space.location.lng?.toString() || '',
    })
  }

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveEdit = () => {
    if (!editingSpace) return

    // 유효성 검사
    if (!editFormData.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    if (!editFormData.startsAt) {
      alert('시작 시간을 입력해주세요.')
      return
    }
    if (!editFormData.address.trim()) {
      alert('주소를 입력해주세요.')
      return
    }
    if (!editFormData.latitude || !editFormData.longitude) {
      alert('위도와 경도를 입력해주세요.')
      return
    }

    const lat = parseFloat(editFormData.latitude)
    const lng = parseFloat(editFormData.longitude)
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('위도와 경도는 숫자여야 합니다.')
      return
    }

    // 수정된 내용으로 미리보기 업데이트
    const startsAtISO = new Date(editFormData.startsAt).toISOString()
    const endsAtISO = new Date(new Date(editFormData.startsAt).getTime() + 2 * 60 * 60 * 1000).toISOString()

    setPreviewSpaces(prev => prev.map(space => {
      if (space.id === editingSpace.id) {
        return {
          ...space,
          title: editFormData.title.trim(),
          startedAt: startsAtISO,
          endedAt: endsAtISO,
          scheduledStartTime: startsAtISO,
          scheduledEndTime: endsAtISO,
          createdAt: startsAtISO,
          location: {
            ...space.location,
            address: editFormData.address.trim(),
            lat,
            lng,
            district: editFormData.address.trim().split(' ')[1] || '',
          },
        }
      }
      return space
    }))

    // 모달 닫기
    setEditingSpace(null)
    setEditFormData({
      title: '',
      startsAt: '',
      address: '',
      latitude: '',
      longitude: '',
    })
  }

  const handleCancelEdit = () => {
    setEditingSpace(null)
    setEditFormData({
      title: '',
      startsAt: '',
      address: '',
      latitude: '',
      longitude: '',
    })
  }

  // 이미지 압축 함수 (공통 함수로 추출)
  const compressImageFile = (file: File, maxSizeMB: number = 5): Promise<File> => {
    return new Promise((resolve, reject) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024
      
      // 이미 파일이 작으면 압축하지 않음
      if (file.size <= maxSizeBytes) {
        resolve(file)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          // 원본 비율 유지하면서 최대 크기 조정
          const maxDimension = 1920 // 최대 너비/높이
          let width = img.width
          let height = img.height

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }

          // Canvas를 사용하여 이미지 리사이즈
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Canvas context를 생성할 수 없습니다.'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          // WebP로 변환하며 품질 조정
          let quality = 0.9
          let compressedBlob: Blob | null = null

          // 목표 크기(5MB) 이하가 될 때까지 품질 조정
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('이미지 압축에 실패했습니다.'))
                  return
                }

                // 목표 크기보다 작거나 품질이 너무 낮으면 종료
                if (blob.size <= maxSizeBytes || quality <= 0.3) {
                  // 안전한 파일명 생성 (한글 및 특수문자 제거, 타임스탬프 사용)
                  // 영문, 숫자, 하이픈, 언더스코어만 사용
                  const timestamp = Date.now()
                  const randomStr = Math.random().toString(36).substring(2, 8)
                  const safeFileName = `thumbnail_${timestamp}_${randomStr}.webp`
                  const compressedFile = new File([blob], safeFileName, {
                    type: 'image/webp',
                    lastModified: Date.now(),
                  })
                  resolve(compressedFile)
                } else {
                  // 품질을 낮춰서 다시 시도
                  quality -= 0.1
                  tryCompress()
                }
              },
              'image/webp',
              quality
            )
          }

          tryCompress()
        }
        img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다.'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'))
      reader.readAsDataURL(file)
    })
  }

  // 카드에 이미지 추가 (드래그 앤 드롭 또는 파일 선택)
  const handleCardImageAdd = async (spaceId: string, file: File) => {
    // 파일 타입 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    try {
      // 이미지가 5MB보다 크면 자동으로 압축
      let processedFile = file
      if (file.size > 5 * 1024 * 1024) {
        processedFile = await compressImageFile(file, 5)
        const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2)
        const compressedSizeMB = (processedFile.size / (1024 * 1024)).toFixed(2)
        console.log(`이미지 압축 완료: ${originalSizeMB}MB → ${compressedSizeMB}MB`)
      }

      // 파일 저장
      setCardThumbnailFiles(prev => {
        const newMap = new Map(prev)
        newMap.set(spaceId, processedFile)
        return newMap
      })

      // 미리보기 생성
      const reader = new FileReader()
      reader.onloadend = () => {
        setCardThumbnailPreviews(prev => {
          const newMap = new Map(prev)
          newMap.set(spaceId, reader.result as string)
          return newMap
        })

        // PreviewLiveSpace의 thumbnail도 업데이트
        setPreviewSpaces(prev => prev.map(space => {
          if (space.id === spaceId) {
            return {
              ...space,
              thumbnail: reader.result as string,
            }
          }
          return space
        }))
      }
      reader.readAsDataURL(processedFile)
    } catch (error) {
      console.error('이미지 처리 오류:', error)
      alert('이미지 처리 중 오류가 발생했습니다.')
    }
  }

  // 카드 이미지 제거
  const handleCardImageRemove = (spaceId: string) => {
    setCardThumbnailFiles(prev => {
      const newMap = new Map(prev)
      newMap.delete(spaceId)
      return newMap
    })

    setCardThumbnailPreviews(prev => {
      const newMap = new Map(prev)
      newMap.delete(spaceId)
      return newMap
    })

    // PreviewLiveSpace의 thumbnail도 제거
    setPreviewSpaces(prev => prev.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          thumbnail: undefined,
        }
      }
      return space
    }))
  }

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent, spaceId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleCardImageAdd(spaceId, file)
    }
  }

  // 파일 선택 핸들러
  const handleCardImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>, spaceId: string) => {
    const file = e.target.files?.[0]
    if (file) {
      handleCardImageAdd(spaceId, file)
    }
    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = ''
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 예상 비용 계산 (LLM Provider에 따라 다름)
  const calculateEstimatedCost = (count: number): { usd: number; krw: number } => {
    // 입력 토큰: 약 400 토큰 (간소화된 프롬프트 기준)
    const inputTokens = 400
    // 출력 토큰: 생성 개수 × 약 220 토큰 (JSON 형식, 1개당)
    const outputTokens = count * 220

    let inputPricePerMillion: number
    let outputPricePerMillion: number

    if (llmProvider === 'xai') {
      // Grok 3 Mini 가격
      // 입력: $0.30 / 1M tokens
      // 출력: $0.50 / 1M tokens
      inputPricePerMillion = 0.30
      outputPricePerMillion = 0.50
    } else {
      // GPT-4o-mini 가격 (2024년 기준)
      // 입력: $0.15 / 1M tokens
      // 출력: $0.60 / 1M tokens
      inputPricePerMillion = 0.15
      outputPricePerMillion = 0.60
    }

    const inputCost = (inputTokens / 1_000_000) * inputPricePerMillion
    const outputCost = (outputTokens / 1_000_000) * outputPricePerMillion
    const totalUsd = inputCost + outputCost

    // 원화 환율 (약 1,350원 기준)
    const krwPerUsd = 1350
    const totalKrw = totalUsd * krwPerUsd

    return {
      usd: totalUsd,
      krw: totalKrw,
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>라이브 스페이스 자동화</h1>
        <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
          미리보기로 생성 후 검수하여 발행할 수 있습니다. 모든 항목은 선택사항입니다.
        </p>
      </div>

      <div className={styles.content}>
        {/* AI 프로바이더 선택 */}
        <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
          <label className={styles.label}>
            AI 프로바이더
          </label>
          <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="radio"
                name="llmProvider"
                value="xai"
                checked={llmProvider === 'xai'}
                onChange={(e) => setLlmProvider(e.target.value as 'openai' | 'xai')}
                disabled={isGenerating}
                style={{ cursor: 'pointer' }}
              />
              {/* xAI 로고 */}
              <img 
                src="/images/icon_grok.webp" 
                alt="xAI"
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              />
              <span>xAI (Grok 3 Mini)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="radio"
                name="llmProvider"
                value="openai"
                checked={llmProvider === 'openai'}
                onChange={(e) => setLlmProvider(e.target.value as 'openai' | 'xai')}
                disabled={isGenerating}
                style={{ cursor: 'pointer' }}
              />
              {/* OpenAI 로고 */}
              <img 
                src="/images/icon_openai.webp" 
                alt="OpenAI"
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              />
              <span>OpenAI (GPT-4o-mini)</span>
            </label>
          </div>
        </div>

        {/* 생성 개수 입력 */}
        <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
          <label htmlFor="generationCount-automation" className={styles.label}>
            생성 개수
          </label>
          <input
            id="generationCount-automation"
            type="number"
            min="1"
            max="50"
            value={generationCount}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!isNaN(value) && value >= 1 && value <= 50) {
                setGenerationCount(value)
              } else if (e.target.value === '') {
                setGenerationCount(1)
              }
            }}
            className={styles.input}
            style={{ maxWidth: '150px' }}
            disabled={isGenerating}
          />
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
              1개 이상 50개 이하로 입력할 수 있습니다.
            </p>
            {generationCount > 0 && (
              <div style={{
                padding: '8px 12px',
                background: '#f0f7ff',
                border: '1px solid #d0e7ff',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#333',
              }}>
                <strong>예상 비용:</strong> 약 ₩{calculateEstimatedCost(generationCount).krw.toFixed(1)}원 
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '6px' }}>
                  (${calculateEstimatedCost(generationCount).usd.toFixed(4)})
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleGenerate} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="characterPrompt-automation" className={styles.label}>
              캐릭터 프롬프트 (선택)
            </label>
            <textarea
              id="characterPrompt-automation"
              name="characterPrompt"
              value={formData.characterPrompt}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="예: '20대 초반 여대생 지니, 밝고 활발한 성격, 맛집 탐방을 좋아하고 귀여운 말투 사용 (예: ~해요, ~거든요)', '30대 남성 개발자 민수, 조용하지만 친근한 성격, IT와 게임에 관심 많음, 정중한 말투' 등"
              rows={4}
              disabled={isGenerating}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              캐릭터의 성격, 말투, 관심사를 설명하면 라이브 스페이스가 이 캐릭터가 만든 것처럼 생성됩니다.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="customPrompt-automation" className={styles.label}>
              LLM 프롬프트 (선택)
            </label>
            <textarea
              id="customPrompt-automation"
              name="customPrompt"
              value={formData.customPrompt}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="LLM에 직접 지시사항을 입력하세요. 예: '카페에서 만날 사람을 찾는 스페이스로 만들어줘', '운동 관련 주제로 만들어줘' 등 (입력하지 않으면 기본 프롬프트 사용)"
              rows={4}
              disabled={isGenerating}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              프롬프트를 입력하면 기본 프롬프트 대신 이 내용을 LLM에 전달합니다.
            </p>
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isGenerating}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isGenerating && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              )}
              {isGenerating ? '생성 중...' : '미리보기 생성'}
            </button>
          </div>
        </form>

        {/* 미리보기 목록 */}
        {previewSpaces.length > 0 && (
          <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
                미리보기 목록 ({previewSpaces.length}개)
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleClearAllPreviews}
                  disabled={isPublishing}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                    opacity: isPublishing ? 0.6 : 1,
                  }}
                >
                  전체 삭제
                </button>
                <button
                  onClick={handlePublishAll}
                  disabled={isPublishing}
                  style={{
                    padding: '10px 20px',
                    background: '#4a9eff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isPublishing ? 'not-allowed' : 'pointer',
                    opacity: isPublishing ? 0.6 : 1,
                  }}
                >
                  {isPublishing ? '발행 중...' : '전체 발행'}
                </button>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {previewSpaces.map((space) => (
                <div
                  key={space.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* 이미지 영역 - 드래그 앤 드롭 지원 */}
                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDrop={(e) => handleDrop(e, space.id)}
                    style={{
                      width: '100%',
                      aspectRatio: '16/9',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      background: '#f5f5f5',
                      position: 'relative',
                      border: '2px dashed transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!cardThumbnailPreviews.get(space.id) && !space.thumbnail) {
                        e.currentTarget.style.borderColor = '#4a9eff'
                        e.currentTarget.style.background = '#f0f7ff'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.background = '#f5f5f5'
                    }}
                    onClick={() => {
                      if (!cardThumbnailPreviews.get(space.id) && !space.thumbnail) {
                        const input = document.getElementById(`card-image-input-${space.id}`) as HTMLInputElement
                        input?.click()
                      }
                    }}
                  >
                    {cardThumbnailPreviews.get(space.id) || space.thumbnail ? (
                      <>
                        <img 
                          src={cardThumbnailPreviews.get(space.id) || space.thumbnail} 
                          alt={space.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCardImageRemove(space.id)
                          }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(0, 0, 0, 0.6)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            lineHeight: 1,
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
                          }}
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999',
                        fontSize: '13px',
                        gap: '8px',
                      }}>
                        <div style={{ fontSize: '32px' }}>📷</div>
                        <div>이미지를 끌어 놓거나<br />클릭하여 선택</div>
                      </div>
                    )}
                    <input
                      id={`card-image-input-${space.id}`}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleCardImageFileSelect(e, space.id)}
                    />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>{space.title}</h3>
                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>{space.location.address}</p>
                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0' }}>
                      시작: {formatDate(space.startedAt || '')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <button
                      onClick={() => handleEditPreview(space)}
                      disabled={isPublishing}
                      style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#4a9eff',
                        border: '1px solid #4a9eff',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        opacity: isPublishing ? 0.6 : 1,
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handlePublish(space)}
                      disabled={isPublishing}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        background: '#4a9eff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        opacity: isPublishing ? 0.6 : 1,
                      }}
                    >
                      발행
                    </button>
                    <button
                      onClick={() => handleRemovePreview(space.id)}
                      disabled={isPublishing}
                      style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: isPublishing ? 'not-allowed' : 'pointer',
                        opacity: isPublishing ? 0.6 : 1,
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 발행 완료 메시지 */}
        {publishedCount > 0 && (
          <div style={{
            marginTop: '24px',
            padding: '12px 16px',
            background: '#d4edda',
            color: '#155724',
            borderRadius: '6px',
            border: '1px solid #c3e6cb',
          }}>
            총 {publishedCount}개의 Live Space가 발행되었습니다.
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editingSpace && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }} onClick={handleCancelEdit}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          }} onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#1a1a1a',
                margin: 0,
              }}>
                미리보기 수정
              </h2>
              <button
                onClick={handleCancelEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  color: '#999',
                  cursor: 'pointer',
                  padding: 0,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                  e.currentTarget.style.color = '#333'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                  e.currentTarget.style.color = '#999'
                }}
              >
                ×
              </button>
            </div>

            {/* 모달 바디 */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 제목 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>제목 *</label>
                  <input
                    type="text"
                    name="title"
                    value={editFormData.title}
                    onChange={handleEditFormChange}
                    className={styles.input}
                    placeholder="라이브 스페이스 제목을 입력하세요"
                  />
                </div>

                {/* 시작 시간 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>시작 시간 *</label>
                  <input
                    type="datetime-local"
                    name="startsAt"
                    value={editFormData.startsAt}
                    onChange={handleEditFormChange}
                    className={styles.input}
                  />
                </div>

                {/* 주소 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>주소 *</label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditFormChange}
                    className={styles.input}
                    placeholder="주소를 입력하세요"
                  />
                </div>

                {/* 위도/경도 */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>위도 *</label>
                    <input
                      type="number"
                      name="latitude"
                      value={editFormData.latitude}
                      onChange={handleEditFormChange}
                      className={styles.input}
                      placeholder="위도를 입력하세요"
                      step="any"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>경도 *</label>
                    <input
                      type="number"
                      name="longitude"
                      value={editFormData.longitude}
                      onChange={handleEditFormChange}
                      className={styles.input}
                      placeholder="경도를 입력하세요"
                      step="any"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '10px 20px',
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 20px',
                  background: '#4a9eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3a8eef'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#4a9eff'
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
