'use client'

import { useState, useEffect, useRef } from 'react'
import { useMockData } from '../context/MockDataContext'
import { LiveSpaceCategory } from '../data/mockData'
import { createLiveSpaceAdmin, CreateLiveSpaceRequest, uploadLiveSpaceThumbnail, getTagsAdmin, Tag } from '../lib/api'
import Modal from './Modal'
import styles from './LiveSpaceCreate.module.css'

declare global {
  interface Window {
    naver: any
    navermap_authFailure?: () => void
  }
}

export default function LiveSpaceCreate() {
  const { liveSpaces, updateLiveSpaces } = useMockData()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const pinOverlayRef = useRef<HTMLDivElement>(null)
  
  // 카테고리 매핑 (이름 -> ID)
  const categoryMap: Record<string, string> = {
    '팝업': '59c76d5f-df90-49e3-91be-fb074d6d2635',
    '전시': '07841371-a660-47f0-b72e-99a188b428e9',
    '이벤트': '564388d8-b577-4897-b53d-51c5391b8e88',
    '세일/혜택': 'b6ded660-6911-42c6-a869-348146ba6623',
    '맛집': '13119e08-caab-498d-a92d-af3ccbfc8bbf',
    '핀': '15d7417c-ab1f-4c9a-a1ee-718e9357698b',
    'HENCE': '15d7417c-ab1f-4c9a-a1ee-718e9357698b', // HENCE는 핀과 동일하게 처리
  }

  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    placeName: '',
    description: '',
    category: '' as LiveSpaceCategory | '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    lat: '',
    lng: '',
    thumbnail: '',
    selectedTags: [] as string[],
  })
  
  // 태그 목록 상태
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)

  // 태그 목록 로드
  useEffect(() => {
    const loadTags = async () => {
      setIsLoadingTags(true)
      try {
        const result = await getTagsAdmin()
        console.log('[LiveSpaceCreate] 태그 목록 API 응답:', result)
        
        if (result.success) {
          // result.data가 배열인지 확인
          let tagsData: Tag[] = []
          const resultData = result.data as any
          
          if (Array.isArray(resultData)) {
            tagsData = resultData
          } else if (resultData && typeof resultData === 'object') {
            // 객체인 경우, 배열 필드를 찾아봄
            if (Array.isArray(resultData.tags)) {
              tagsData = resultData.tags
            } else if (Array.isArray(resultData.items)) {
              tagsData = resultData.items
            } else if (Array.isArray(resultData.list)) {
              tagsData = resultData.list
            } else if (Array.isArray(resultData.data)) {
              tagsData = resultData.data
            } else {
              console.warn('[LiveSpaceCreate] 예상치 못한 응답 구조:', resultData)
            }
          }
          
          // 활성화된 태그만 필터링
          const activeTags = tagsData.filter(tag => tag.isActive)
          console.log('[LiveSpaceCreate] 추출된 활성 태그:', activeTags)
          setTags(activeTags)
        } else {
          console.error('[LiveSpaceCreate] 태그 목록 로드 실패:', result.error)
          setTags([])
        }
      } catch (error) {
        console.error('[LiveSpaceCreate] 태그 목록 로드 중 오류:', error)
        setTags([])
      } finally {
        setIsLoadingTags(false)
      }
    }
    
    loadTags()
  }, [])

  // 네이버 맵 API 동적 로드 및 초기화
  useEffect(() => {
    if (!mapRef.current) return

    // 인증 실패 핸들러 설정 (신규 Maps API)
    // 참고: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
    window.navermap_authFailure = function () {
      console.error('네이버 맵 API 인증 실패')
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 12px;">
            <div style="font-size: 16px; font-weight: 600; color: #e74c3c;">네이버 맵 API 인증 실패</div>
            <div style="font-size: 13px; margin-bottom: 8px;">
              클라이언트 아이디와 웹 서비스 URL을 확인해주세요.
            </div>
            <div style="font-size: 12px; color: #999; margin-top: 8px; text-align: left; max-width: 500px;">
              <div style="margin-bottom: 8px;">
                <strong>신규 Maps API 설정 필요:</strong>
              </div>
              <div style="margin-bottom: 4px; padding-left: 8px;">
                1. 네이버 클라우드 플랫폼 콘솔에서 신규 Client ID 발급 (ncpKeyId)
              </div>
              <div style="margin-bottom: 4px; padding-left: 8px;">
                2. 웹 서비스 URL 등록: <strong>http://localhost:3000/</strong>
              </div>
              <div style="margin-bottom: 4px; padding-left: 8px;">
                3. 발급받은 신규 Client ID를 .env.local에 설정
              </div>
              <div style="margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 11px;">
                <strong>현재 Client ID:</strong> ${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'}<br/>
                <strong>참고:</strong> 신규 Maps API는 ncpKeyId를 사용합니다.
              </div>
              <div style="margin-top: 8px; font-size: 11px;">
                <a href="https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html" target="_blank" rel="noopener noreferrer" style="color: #4a9eff; text-decoration: underline;">
                  신규 Maps API 가이드 보기 →
                </a>
              </div>
            </div>
          </div>
        `
      }
    }

    let checkIntervalId: NodeJS.Timeout | null = null
    let scriptElement: HTMLScriptElement | null = null

    const loadNaverMapScript = () => {
      return new Promise<void>((resolve, reject) => {
        // 이미 로드되어 있으면 바로 resolve
        if (window.naver && window.naver.maps) {
          resolve()
          return
        }

        // 스크립트가 이미 추가되어 있는지 확인
        const existingScript = document.querySelector('script[src*="map.naver.com"]')
        if (existingScript) {
          // 스크립트가 있으면 로드 대기
          checkIntervalId = setInterval(() => {
            if (window.naver && window.naver.maps) {
              if (checkIntervalId) {
                clearInterval(checkIntervalId)
                checkIntervalId = null
              }
              resolve()
            }
          }, 100)
          return
        }

        // 스크립트 동적 추가 (신규 Maps API - NCP)
        // 참고: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
        // 변경사항: ncpClientId → ncpKeyId로 변경
        scriptElement = document.createElement('script')
        scriptElement.type = 'text/javascript'
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'
        // 신규 Maps API는 ncpKeyId를 사용합니다
        scriptElement.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`
        scriptElement.async = true
        scriptElement.defer = true
        
        scriptElement.onload = () => {
          // 스크립트 로드 후 약간의 지연을 두고 확인
          checkIntervalId = setInterval(() => {
            if (window.naver && window.naver.maps) {
              if (checkIntervalId) {
                clearInterval(checkIntervalId)
                checkIntervalId = null
              }
              resolve()
            }
          }, 100)
        }
        
        scriptElement.onerror = (error) => {
          console.error('네이버 맵 스크립트 로드 실패:', error)
          if (checkIntervalId) {
            clearInterval(checkIntervalId)
            checkIntervalId = null
          }
          reject(new Error('네이버 맵 API 스크립트 로드 실패. 네이버 클라우드 플랫폼 콘솔에서 웹 서비스 URL(http://localhost:3000/)을 등록했는지 확인해주세요.'))
        }
        
        document.head.appendChild(scriptElement)
      })
    }

    const initMap = (): (() => void) | undefined => {
      if (!window.naver || !window.naver.maps) {
        console.error('네이버 맵 API가 로드되지 않았습니다.')
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 12px;">
              <div style="font-size: 16px; font-weight: 600; color: #e74c3c;">네이버 맵 API 로드 실패</div>
              <div style="font-size: 13px;">window.naver 또는 window.naver.maps가 정의되지 않았습니다.</div>
            </div>
          `
        }
        return undefined
      }

      try {
        // 기본 위치: 서울시청
        const defaultPosition = new window.naver.maps.LatLng(37.5665, 126.9780)

        const mapOptions = {
          center: defaultPosition,
          zoom: 15,
        }

        const map = new window.naver.maps.Map(mapRef.current, mapOptions)
        mapInstanceRef.current = map
        
        console.log('네이버 맵 초기화 성공')

        // 지도 중심 좌표 업데이트 함수
        const updateCenterLocation = () => {
          if (!mapRef.current) return
          
          const center = map.getCenter()
          const lat = center.lat()
          const lng = center.lng()

          // 위치 정보 업데이트
          setSelectedLocation({ lat, lng })
          setFormData(prev => ({
            ...prev,
            lat: lat.toString(),
            lng: lng.toString(),
          }))

          // 역지오코딩으로 주소 가져오기 (신규 API)
          if (window.naver.maps && window.naver.maps.Service) {
            window.naver.maps.Service.reverseGeocode(
              {
                coords: new window.naver.maps.LatLng(lat, lng),
                orders: ['roadaddr', 'addr', 'admcode'].join(','),
              },
              (status: any, response: any) => {
                if (status === window.naver.maps.Service.Status.OK) {
                  const result = response.v2
                  const address = result.address
                  const roadAddress = result.roadAddress
                  const fullAddress = roadAddress?.roadAddress || address?.roadAddress || address?.jibunAddress || ''
                  if (fullAddress) {
                    setSelectedLocation(prev => prev ? { ...prev, address: fullAddress } : null)
                  }
                }
              }
            )
          }
        }

        // 초기 중심 좌표 설정
        updateCenterLocation()

        // 지도 이벤트 리스너 저장
        const eventListeners: any[] = []
        
        // 지도 이동/드래그/줌 시 중심 좌표 업데이트
        const dragendListener = window.naver.maps.Event.addListener(map, 'dragend', updateCenterLocation)
        const zoomListener = window.naver.maps.Event.addListener(map, 'zoom_changed', updateCenterLocation)
        const idleListener = window.naver.maps.Event.addListener(map, 'idle', updateCenterLocation)
        const dragListener = window.naver.maps.Event.addListener(map, 'drag', updateCenterLocation)
        
        eventListeners.push(dragendListener, zoomListener, idleListener, dragListener)
        
        // cleanup 함수에서 이벤트 리스너 제거를 위해 저장
        return () => {
          eventListeners.forEach(listener => {
            if (listener && window.naver?.maps?.Event) {
              window.naver.maps.Event.removeListener(listener)
            }
          })
        }
      } catch (error) {
        console.error('네이버 맵 초기화 중 오류:', error)
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 12px;">
              <div style="font-size: 16px; font-weight: 600; color: #e74c3c;">네이버 맵 초기화 실패</div>
              <div style="font-size: 13px;">${error instanceof Error ? error.message : '알 수 없는 오류'}</div>
            </div>
          `
        }
        return undefined
      }
    }

    let cleanupMap: (() => void) | undefined

    // 스크립트 로드 후 맵 초기화
    loadNaverMapScript()
      .then(() => {
        console.log('네이버 맵 스크립트 로드 성공, 맵 초기화 시작')
        cleanupMap = initMap()
      })
      .catch((error) => {
        console.error('네이버 맵 초기화 실패:', error)
        console.error('에러 상세:', {
          message: error.message,
          stack: error.stack,
          clientId: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr',
        })
        // 사용자에게 안내 메시지 표시
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 12px;">
              <div style="font-size: 16px; font-weight: 600; color: #e74c3c;">네이버 맵 로드 실패</div>
              <div style="font-size: 13px; margin-bottom: 8px;">
                ${error.message || '네이버 맵 API를 로드할 수 없습니다.'}
              </div>
              <div style="font-size: 12px; color: #999; margin-top: 8px; text-align: left; max-width: 500px;">
                <div style="margin-bottom: 8px;">
                  <strong>신규 Maps API 전환이 필요합니다:</strong>
                </div>
                <div style="margin-bottom: 4px; padding-left: 8px;">
                  1. 네이버 클라우드 플랫폼 콘솔에서 신규 Client ID 발급<br/>
                     (기존 AI NAVER API Client ID는 사용 불가)
                </div>
                <div style="margin-bottom: 4px; padding-left: 8px;">
                  2. 웹 서비스 URL 등록: <strong>http://localhost:3000/</strong>
                </div>
                <div style="margin-bottom: 4px; padding-left: 8px;">
                  3. 발급받은 신규 Client ID를 .env.local에 설정
                </div>
                <div style="margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 11px;">
                  <strong>현재 Client ID:</strong> ${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'}<br/>
                  <strong>참고:</strong> 브라우저 콘솔에서 더 자세한 에러 정보를 확인할 수 있습니다.
                </div>
                <div style="margin-top: 8px; font-size: 11px;">
                  <a href="https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html" target="_blank" rel="noopener noreferrer" style="color: #4a9eff; text-decoration: underline;">
                    신규 Maps API 가이드 보기 →
                  </a>
                </div>
              </div>
            </div>
          `
        }
      })

    // Cleanup 함수
    return () => {
      // interval 정리
      if (checkIntervalId) {
        clearInterval(checkIntervalId)
        checkIntervalId = null
      }
      
      // 맵 이벤트 리스너 정리
      if (cleanupMap) {
        cleanupMap()
      }
      
      // 맵 인스턴스 정리
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
      
      // 스크립트는 전역적으로 사용되므로 제거하지 않음
      // (다른 컴포넌트에서도 사용할 수 있음)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 파일 크기 검증 (예: 5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.')
        return
      }
      
      // 이미지 파일인지 확인
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.')
        return
      }

      setThumbnailFile(file)
      
      // 미리보기 생성
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
        setFormData(prev => ({
          ...prev,
          thumbnail: reader.result as string, // base64로 저장
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    setFormData(prev => ({
      ...prev,
      thumbnail: '',
    }))
    // input 파일 선택 초기화
    const fileInput = document.getElementById('thumbnail') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    
    if (!formData.placeName.trim()) {
      alert('장소명을 입력해주세요.')
      return
    }
    
    if (!formData.lat || !formData.lng) {
      alert('지도에서 위치를 선택해주세요.')
      return
    }
    
    if (!formData.scheduledStartTime) {
      alert('예정 시작 시간을 입력해주세요.')
      return
    }
    
    if (!formData.scheduledEndTime) {
      alert('예정 종료 시간을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const lat = parseFloat(formData.lat)
      const lng = parseFloat(formData.lng)
      const address = selectedLocation?.address || ''
      
      // 날짜를 YYYY-MM-DDTHH:mm:ss 형식으로 변환 (밀리초와 타임존 제거)
      const formatDateTime = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }
      
      const startsAt = formatDateTime(new Date(formData.scheduledStartTime))
      const endsAt = formatDateTime(new Date(formData.scheduledEndTime))
      
      // 썸네일 이미지가 있으면 먼저 업로드 (Admin용: /api/v1/space-admin/thumbnail-image 사용)
      let thumbnailImageId: string | undefined = undefined
      if (thumbnailFile) {
        const uploadResult = await uploadLiveSpaceThumbnail(thumbnailFile) // useAutoRegistration=false (기본값) = admin용
        if (!uploadResult.success) {
          alert(uploadResult.error || '썸네일 이미지 업로드 중 오류가 발생했습니다.')
          setIsSubmitting(false)
          return
        }
        thumbnailImageId = uploadResult.thumbnailImageId
      }
      
      // 카테고리 이름을 ID로 변환 (선택사항)
      const categoryId = formData.category ? categoryMap[formData.category] : undefined

      // API 요청 데이터 준비
      const requestData: CreateLiveSpaceRequest = {
        title: formData.title,
        placeName: formData.placeName,
        address: address,
        longitude: lng,
        latitude: lat,
        description: formData.description || undefined,
        startsAt: startsAt,
        endsAt: endsAt,
        ...(categoryId && { categoryId: categoryId }), // 카테고리가 있으면 ID로 매핑하여 전송
        thumbnailImageId: thumbnailImageId,
        ...(formData.selectedTags.length > 0 && { tagNames: formData.selectedTags }),
      }
      
      // Admin용 API 사용: /api/v1/space-admin
      const result = await createLiveSpaceAdmin(requestData)
      
      if (!result.success) {
        alert(result.error || '라이브 스페이스 생성 중 오류가 발생했습니다.')
        return
      }
      
      setShowSuccess(true)
      
      // 폼 초기화
      setFormData({
        title: '',
        placeName: '',
        description: '',
        category: '' as LiveSpaceCategory | '',
        scheduledStartTime: '',
        scheduledEndTime: '',
        lat: '',
        lng: '',
        thumbnail: '',
        selectedTags: [],
      })
      setSelectedLocation(null)
      setThumbnailFile(null)
      setThumbnailPreview(null)
      // input 파일 선택 초기화
      const fileInput = document.getElementById('thumbnail') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      console.error('라이브 스페이스 생성 오류:', error)
      alert('라이브 스페이스 생성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>라이브 스페이스 생성</h1>
        <p style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
          여기서 만드는 라이브 스페이스는 official@quinvir.com 계정으로 생성됩니다.
        </p>
      </div>

      <div className={styles.content}>
        {showSuccess && (
          <div className={styles.successMessage}>
            라이브 스페이스가 성공적으로 생성되었습니다.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              제목 <span className={styles.required}>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="라이브 스페이스 제목을 입력하세요"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="placeName" className={styles.label}>
              장소명 <span className={styles.required}>*</span>
            </label>
            <input
              id="placeName"
              name="placeName"
              type="text"
              value={formData.placeName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="장소명을 입력하세요"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              카테고리 (선택)
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={styles.select}
              disabled={isSubmitting}
            >
              <option value="">카테고리를 선택하세요</option>
              <option value="팝업">팝업</option>
              <option value="전시">전시</option>
              <option value="이벤트">이벤트</option>
              <option value="세일/혜택">세일/혜택</option>
              <option value="맛집">맛집</option>
              <option value="핀">핀</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              설명 (선택)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="라이브 스페이스에 대한 설명을 입력하세요"
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tags" className={styles.label}>
              태그 (선택)
            </label>
            {isLoadingTags ? (
              <div style={{ padding: '12px', color: '#666', fontSize: '14px' }}>
                태그 목록 로딩 중...
              </div>
            ) : tags.length === 0 ? (
              <div style={{ padding: '12px', color: '#999', fontSize: '14px' }}>
                등록된 태그가 없습니다.
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '8px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                minHeight: '50px',
                backgroundColor: '#fff'
              }}>
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      border: formData.selectedTags.includes(tag.name)
                        ? '2px solid #4a9eff'
                        : '1px solid #ddd',
                      borderRadius: '20px',
                      backgroundColor: formData.selectedTags.includes(tag.name)
                        ? '#e6f2ff'
                        : '#f5f5f5',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: formData.selectedTags.includes(tag.name) ? 500 : 400,
                      color: formData.selectedTags.includes(tag.name) ? '#4a9eff' : '#333',
                      opacity: isSubmitting ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedTags.includes(tag.name)}
                      onChange={(e) => {
                        if (isSubmitting) return
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            selectedTags: [...prev.selectedTags, tag.name]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selectedTags: prev.selectedTags.filter(name => name !== tag.name)
                          }))
                        }
                      }}
                      disabled={isSubmitting}
                      style={{ 
                        marginRight: '6px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                      }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
            {formData.selectedTags.length > 0 && (
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                선택된 태그: {formData.selectedTags.join(', ')}
              </p>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="scheduledStartTime" className={styles.label}>
                예정 시작 시간 <span className={styles.required}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id="scheduledStartTime"
                  name="scheduledStartTime"
                  type="datetime-local"
                  value={formData.scheduledStartTime}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
                    
                    // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
                    const formatForInput = (date: Date): string => {
                      const year = date.getFullYear()
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      const hours = String(date.getHours()).padStart(2, '0')
                      const minutes = String(date.getMinutes()).padStart(2, '0')
                      return `${year}-${month}-${day}T${hours}:${minutes}`
                    }
                    
                    setFormData(prev => ({
                      ...prev,
                      scheduledStartTime: formatForInput(now),
                      scheduledEndTime: formatForInput(twoHoursLater),
                    }))
                  }}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 16px',
                    background: '#4a9eff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                >
                  지금
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="scheduledEndTime" className={styles.label}>
                예정 종료 시간 <span className={styles.required}>*</span>
              </label>
              <input
                id="scheduledEndTime"
                name="scheduledEndTime"
                type="datetime-local"
                value={formData.scheduledEndTime}
                onChange={handleInputChange}
                className={styles.input}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              위치 선택 <span className={styles.required}>*</span>
            </label>
            <div className={styles.mapContainer}>
              <div ref={mapRef} className={styles.map} />
              {/* 지도 위에 핀 아이콘 오버레이 */}
              <div ref={pinOverlayRef} className={styles.pinOverlay}>
                <img 
                  src="/images/icon_aim.png" 
                  alt="위치 선택" 
                  className={styles.pinIcon}
                />
              </div>
              {selectedLocation && (
                <div className={styles.locationInfo}>
                  <div className={styles.locationText}>
                    <strong>선택된 위치:</strong>
                    <div>위도: {selectedLocation.lat.toFixed(6)}</div>
                    <div>경도: {selectedLocation.lng.toFixed(6)}</div>
                    {selectedLocation.address && (
                      <div className={styles.address}>{selectedLocation.address}</div>
                    )}
                  </div>
                </div>
              )}
              {!selectedLocation && (
                <div className={styles.mapHint}>
                  지도를 이동하여 위치를 선택하세요
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="thumbnail" className={styles.label}>
              썸네일 이미지 (선택)
            </label>
            {!thumbnailPreview ? (
              <div className={styles.fileUploadContainer}>
                <input
                  id="thumbnail"
                  name="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className={styles.fileInput}
                  disabled={isSubmitting}
                />
                <label htmlFor="thumbnail" className={styles.fileUploadLabel}>
                  <span className={styles.fileUploadIcon}>📷</span>
                  <span className={styles.fileUploadText}>이미지 파일 선택</span>
                  <span className={styles.fileUploadHint}>(최대 5MB)</span>
                </label>
              </div>
            ) : (
              <div className={styles.thumbnailPreviewContainer}>
                <div className={styles.thumbnailPreview}>
                  <img src={thumbnailPreview} alt="썸네일 미리보기" />
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className={styles.removeThumbnailButton}
                    disabled={isSubmitting}
                  >
                    ✕
                  </button>
                </div>
                <div className={styles.thumbnailInfo}>
                  {thumbnailFile && (
                    <div className={styles.thumbnailFileName}>
                      {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className={styles.changeThumbnailButton}
                    disabled={isSubmitting}
                  >
                    다른 이미지 선택
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '라이브 스페이스 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

