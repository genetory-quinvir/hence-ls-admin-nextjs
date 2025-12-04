'use client'

import { useState, useEffect, useRef } from 'react'
import { useMockData } from '../context/MockDataContext'
import { LiveSpaceCategory } from '../data/mockData'
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
  
  // 폼 상태
  const [formData, setFormData] = useState({
    title: '',
    category: '' as LiveSpaceCategory | '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    lat: '',
    lng: '',
    thumbnail: '',
  })
  
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)

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
                <strong>현재 Client ID:</strong> ${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'v1hcn1ics0'}<br/>
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
          const checkInterval = setInterval(() => {
            if (window.naver && window.naver.maps) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
          return
        }

        // 스크립트 동적 추가 (신규 Maps API - NCP)
        // 참고: https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html
        // 변경사항: ncpClientId → ncpKeyId로 변경
        const script = document.createElement('script')
        script.type = 'text/javascript'
        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'v1hcn1ics0'
        // 신규 Maps API는 ncpKeyId를 사용합니다
        script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`
        script.async = true
        script.defer = true
        
        script.onload = () => {
          // 스크립트 로드 후 약간의 지연을 두고 확인
          const checkInterval = setInterval(() => {
            if (window.naver && window.naver.maps) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 100)
        }
        
        script.onerror = (error) => {
          console.error('네이버 맵 스크립트 로드 실패:', error)
          reject(new Error('네이버 맵 API 스크립트 로드 실패. 네이버 클라우드 플랫폼 콘솔에서 웹 서비스 URL(http://localhost:3000/)을 등록했는지 확인해주세요.'))
        }
        
        document.head.appendChild(script)
      })
    }

    const initMap = () => {
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
        return
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

        // 지도 이동/드래그/줌 시 중심 좌표 업데이트
        window.naver.maps.Event.addListener(map, 'dragend', updateCenterLocation)
        window.naver.maps.Event.addListener(map, 'zoom_changed', updateCenterLocation)
        window.naver.maps.Event.addListener(map, 'idle', updateCenterLocation)
        // 지도 드래그 중에도 실시간으로 업데이트
        window.naver.maps.Event.addListener(map, 'drag', updateCenterLocation)
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
        return
      }
    }

    // 스크립트 로드 후 맵 초기화
    loadNaverMapScript()
      .then(() => {
        console.log('네이버 맵 스크립트 로드 성공, 맵 초기화 시작')
        initMap()
      })
      .catch((error) => {
        console.error('네이버 맵 초기화 실패:', error)
        console.error('에러 상세:', {
          message: error.message,
          stack: error.stack,
          clientId: process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'v1hcn1ics0',
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
                  <strong>현재 Client ID:</strong> ${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'v1hcn1ics0'}<br/>
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
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    
    if (!formData.category) {
      alert('카테고리를 선택해주세요.')
      return
    }
    
    if (!formData.lat || !formData.lng) {
      alert('지도에서 위치를 선택해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      // 실제로는 API 호출
      // await createLiveSpace(formData)
      
      // 시뮬레이션
      const lat = parseFloat(formData.lat)
      const lng = parseFloat(formData.lng)
      
      // 위도/경도로부터 구/군 추정 (간단한 로직, 실제로는 역지오코딩 사용)
      const districts = ['강남구', '마포구', '중구', '송파구', '강동구', '서초구']
      const district = districts[Math.floor(Math.random() * districts.length)]
      
      const newLiveSpace = {
        id: `ls-${Date.now()}`,
        title: formData.title,
        hostNickname: 'Admin',
        hostId: 'admin-001',
        category: formData.category as LiveSpaceCategory,
        status: 'live' as const,
        createdAt: new Date().toISOString(),
        scheduledStartTime: formData.scheduledStartTime || undefined,
        scheduledEndTime: formData.scheduledEndTime || undefined,
        location: {
          lat,
          lng,
          address: selectedLocation?.address || `위도: ${lat}, 경도: ${lng}`,
          district,
        },
        checkInCount: 0,
        feedCount: 0,
        reportedCount: 0,
        thumbnail: formData.thumbnail || undefined,
      }

      // Mock 데이터에 추가
      updateLiveSpaces((prev) => [...prev, newLiveSpace])
      
      setShowSuccess(true)
      
      // 폼 초기화
      setFormData({
        title: '',
        category: '' as LiveSpaceCategory | '',
        scheduledStartTime: '',
        scheduledEndTime: '',
        lat: '',
        lng: '',
        thumbnail: '',
      })
      setSelectedLocation(null)
      
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (error) {
      alert('라이브 스페이스 생성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>라이브 스페이스 생성</h1>
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
            <label htmlFor="category" className={styles.label}>
              카테고리 <span className={styles.required}>*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={styles.select}
              required
              disabled={isSubmitting}
            >
              <option value="">카테고리를 선택하세요</option>
              <option value="팝업">팝업</option>
              <option value="전시">전시</option>
              <option value="이벤트">이벤트</option>
              <option value="세일/혜택">세일/혜택</option>
              <option value="맛집">맛집</option>
              <option value="HENCE">HENCE</option>
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="scheduledStartTime" className={styles.label}>
                예정 시작 시간
              </label>
              <input
                id="scheduledStartTime"
                name="scheduledStartTime"
                type="datetime-local"
                value={formData.scheduledStartTime}
                onChange={handleInputChange}
                className={styles.input}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="scheduledEndTime" className={styles.label}>
                예정 종료 시간
              </label>
              <input
                id="scheduledEndTime"
                name="scheduledEndTime"
                type="datetime-local"
                value={formData.scheduledEndTime}
                onChange={handleInputChange}
                className={styles.input}
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
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.pinIcon}>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 0.5C14.5196 0.5 16.9362 1.50063 18.7178 3.28223C20.4994 5.06382 21.5 7.48044 21.5 10C21.5 13.7009 19.1331 17.0728 16.8633 19.4688C15.7181 20.6775 14.5744 21.6626 13.7178 22.3447C13.2893 22.686 12.9313 22.9521 12.6797 23.1338C12.5539 23.2247 12.4542 23.2944 12.3857 23.3418C12.3515 23.3655 12.3249 23.3841 12.3066 23.3965C12.2976 23.4026 12.29 23.4069 12.2852 23.4102C12.283 23.4116 12.2803 23.4141 12.2803 23.4141L12.2783 23.415L12.2773 23.416C12.1305 23.5139 11.9447 23.5264 11.7881 23.4531L11.7227 23.416L11.7197 23.4141C11.7197 23.4141 11.717 23.4116 11.7148 23.4102C11.71 23.4069 11.7024 23.4026 11.6934 23.3965C11.6751 23.3841 11.6485 23.3655 11.6143 23.3418C11.5458 23.2944 11.4461 23.2247 11.3203 23.1338C11.0687 22.9521 10.7107 22.686 10.2822 22.3447C9.42561 21.6626 8.28189 20.6775 7.13672 19.4688C4.86689 17.0728 2.5 13.7009 2.5 10C2.5 7.48044 3.50063 5.06382 5.28223 3.28223C7.06382 1.50063 9.48044 0.5 12 0.5ZM12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7Z" fill="#FF0000" stroke="#FFFFFF" strokeWidth="1"/>
                </svg>
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
              썸네일 URL (선택)
            </label>
            <input
              id="thumbnail"
              name="thumbnail"
              type="url"
              value={formData.thumbnail}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="https://example.com/image.jpg"
              disabled={isSubmitting}
            />
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

