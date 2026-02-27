'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createPlacebookPlaceAdmin,
  deletePlacebookPlaceAdmin,
  getPlacebookPlacesAdmin,
  getPlacebookThemesAdmin,
  PlacebookPlace,
  PlacebookTheme,
  updatePlacebookPlaceAdmin,
  updatePlacebookPlaceStatusAdmin,
} from '../lib/api'
import styles from './TagManagement.module.css'

declare global {
  interface Window {
    naver: any
    navermap_authFailure?: () => void
  }
}

type PlaceFormState = {
  themeId: string
  description: string
  subtitle: string
  placeName: string
  address: string
  latitude: string
  longitude: string
  thumbnailUrl: string
  hashtags: string
  isActive: boolean
}

const initialFormState: PlaceFormState = {
  themeId: '',
  description: '',
  subtitle: '',
  placeName: '',
  address: '',
  latitude: '',
  longitude: '',
  thumbnailUrl: '',
  hashtags: '',
  isActive: true,
}

export default function PlaceManagement() {
  const [places, setPlaces] = useState<PlacebookPlace[]>([])
  const [themes, setThemes] = useState<PlacebookTheme[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [themeFilter, setThemeFilter] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingPlace, setEditingPlace] = useState<PlacebookPlace | null>(null)
  const [deletePlaceId, setDeletePlaceId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PlaceFormState>(initialFormState)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<PlacebookPlace | null>(null)
  const [autoFillAddress, setAutoFillAddress] = useState(true)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const reverseGeocodeTimerRef = useRef<number | null>(null)
  const detailMapRef = useRef<HTMLDivElement>(null)
  const detailMapInstanceRef = useRef<any>(null)
  const naverScriptPromiseRef = useRef<Promise<void> | null>(null)

  const loadPlaces = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [placeResult, themeResult] = await Promise.all([
        getPlacebookPlacesAdmin(),
        getPlacebookThemesAdmin(),
      ])

      if (!placeResult.success) {
        setPlaces([])
        setThemes([])
        setError(placeResult.error || '장소 목록을 불러오지 못했습니다.')
        return
      }

      if (!themeResult.success) {
        setPlaces([])
        setThemes([])
        setError(themeResult.error || '테마 목록을 불러오지 못했습니다.')
        return
      }

      const placeItems = [...(placeResult.data || [])]
      const themeItems = [...(themeResult.data || [])].sort((a, b) => {
        if (a.categoryId === b.categoryId) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        return a.categoryId.localeCompare(b.categoryId)
      })
      setPlaces(placeItems)
      setThemes(themeItems)
    } catch (err) {
      setPlaces([])
      setThemes([])
      setError(err instanceof Error ? err.message : '장소 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPlaces()
  }, [])

  const resetForm = () => {
    const firstThemeId = themes[0]?.id || ''
    setFormData({
      ...initialFormState,
      themeId: firstThemeId,
    })
    setThumbnailPreview(null)
    setThumbnailDataUrl(null)
  }

  useEffect(() => {
    if (!showModal || editingPlace) return
    if (!formData.themeId && themes.length > 0) {
      setFormData((prev) => ({ ...prev, themeId: themes[0].id }))
    }
  }, [showModal, editingPlace, themes, formData.themeId])

  const loadNaverMapScript = () => {
    if (naverScriptPromiseRef.current) return naverScriptPromiseRef.current
    naverScriptPromiseRef.current = new Promise<void>((resolve, reject) => {
      if (window.naver && window.naver.maps) {
        resolve()
        return
      }

      const existingScript = document.querySelector('script[src*="map.naver.com"]')
      if (existingScript) {
        const waitId = setInterval(() => {
          if (window.naver && window.naver.maps) {
            clearInterval(waitId)
            resolve()
          }
        }, 100)
        return
      }

      const scriptElement = document.createElement('script')
      scriptElement.type = 'text/javascript'
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'
      scriptElement.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`
      scriptElement.async = true
      scriptElement.defer = true

      scriptElement.onload = () => resolve()
      scriptElement.onerror = () => {
        naverScriptPromiseRef.current = null
        reject(new Error('네이버 맵 API 스크립트를 로드하지 못했습니다.'))
      }

      document.head.appendChild(scriptElement)
    })
    return naverScriptPromiseRef.current
  }

  useEffect(() => {
    if (!showModal || !mapRef.current) return

    window.navermap_authFailure = function () {
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 8px;">
            <div style="font-size: 14px; font-weight: 600; color: #e74c3c;">네이버 맵 API 인증 실패</div>
            <div style="font-size: 12px;">클라이언트 아이디와 웹 서비스 URL을 확인해주세요.</div>
          </div>
        `
      }
    }

    let cleanupMap: (() => void) | undefined

    const initMap = (): (() => void) | undefined => {
      if (!window.naver || !window.naver.maps || !mapRef.current) return undefined

      const savedCenter = localStorage.getItem('placebook-map-center')
      const savedZoom = localStorage.getItem('placebook-map-zoom')
      const parsedCenter = savedCenter ? savedCenter.split(',').map((v) => parseFloat(v)) : []
      const defaultLat =
        parseFloat(formData.latitude) ||
        (parsedCenter.length === 2 && Number.isFinite(parsedCenter[0]) ? parsedCenter[0] : 37.5665)
      const defaultLng =
        parseFloat(formData.longitude) ||
        (parsedCenter.length === 2 && Number.isFinite(parsedCenter[1]) ? parsedCenter[1] : 126.9780)
      const defaultPosition = new window.naver.maps.LatLng(defaultLat, defaultLng)
      const map = new window.naver.maps.Map(mapRef.current, {
        center: defaultPosition,
        zoom: savedZoom ? Number(savedZoom) : 15,
      })
      mapInstanceRef.current = map

      const updateCenterLocation = () => {
        const center = map.getCenter()
        const lat = center.lat()
        const lng = center.lng()
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        }))
        localStorage.setItem('placebook-map-center', `${lat},${lng}`)
        localStorage.setItem('placebook-map-zoom', String(map.getZoom()))

        if (!autoFillAddress || !window.naver.maps?.Service) return
        if (reverseGeocodeTimerRef.current) {
          window.clearTimeout(reverseGeocodeTimerRef.current)
        }
        reverseGeocodeTimerRef.current = window.setTimeout(() => {
          window.naver.maps.Service.reverseGeocode(
            {
              coords: new window.naver.maps.LatLng(lat, lng),
              orders: ['roadaddr', 'addr'].join(','),
            },
            (status: any, response: any) => {
              if (status === window.naver.maps.Service.Status.OK) {
                const result = response.v2
                const address = result.address
                const roadAddress = result.roadAddress
                const fullAddress = roadAddress?.roadAddress || address?.roadAddress || address?.jibunAddress || ''
                if (fullAddress) {
                  setFormData((prev) => ({ ...prev, address: fullAddress }))
                }
              }
            }
          )
        }, 350)
      }

      updateCenterLocation()

      const listeners: any[] = []
      listeners.push(window.naver.maps.Event.addListener(map, 'dragend', updateCenterLocation))
      listeners.push(window.naver.maps.Event.addListener(map, 'zoom_changed', updateCenterLocation))
      listeners.push(window.naver.maps.Event.addListener(map, 'idle', updateCenterLocation))

      return () => {
        listeners.forEach((listener) => {
          if (listener && window.naver?.maps?.Event) {
            window.naver.maps.Event.removeListener(listener)
          }
        })
      }
    }

    loadNaverMapScript()
      .then(() => {
        cleanupMap = initMap()
      })
      .catch((error) => {
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 8px;">
              <div style="font-size: 14px; font-weight: 600; color: #e74c3c;">네이버 맵 로드 실패</div>
              <div style="font-size: 12px;">${error instanceof Error ? error.message : '알 수 없는 오류'}</div>
            </div>
          `
        }
      })

    return () => {
      if (cleanupMap) cleanupMap()
      if (reverseGeocodeTimerRef.current) {
        window.clearTimeout(reverseGeocodeTimerRef.current)
        reverseGeocodeTimerRef.current = null
      }
    }
  }, [showModal, editingPlace, autoFillAddress])

  useEffect(() => {
    if (!selectedPlace || !detailMapRef.current) return

    let cleanupMap: (() => void) | undefined

    const initDetailMap = () => {
      if (!window.naver || !window.naver.maps || !detailMapRef.current) return
      const lat = toNumberOrUndefined(selectedPlace.latitude) ?? 37.5665
      const lng = toNumberOrUndefined(selectedPlace.longitude) ?? 126.9780
      const center = new window.naver.maps.LatLng(lat, lng)
      const map = new window.naver.maps.Map(detailMapRef.current, {
        center,
        zoom: 15,
      })
      detailMapInstanceRef.current = map
      const marker = new window.naver.maps.Marker({ position: center, map })

      return () => {
        if (marker) marker.setMap(null)
      }
    }

    loadNaverMapScript()
      .then(() => {
        cleanupMap = initDetailMap()
      })
      .catch((error) => {
        if (detailMapRef.current) {
          detailMapRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; padding: 20px; text-align: center; flex-direction: column; gap: 8px;">
              <div style="font-size: 14px; font-weight: 600; color: #e74c3c;">네이버 맵 로드 실패</div>
              <div style="font-size: 12px;">${error instanceof Error ? error.message : '알 수 없는 오류'}</div>
            </div>
          `
        }
      })

    return () => {
      if (cleanupMap) cleanupMap()
    }
  }, [selectedPlace])

  const themeNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const theme of themes) {
      map.set(theme.id, theme.title || theme.name || theme.id)
    }
    return map
  }, [themes])

  const hashtagSuggestions = useMemo(() => {
    const counter = new Map<string, number>()
    for (const place of places) {
      if (!place.hashtags) continue
      for (const tag of place.hashtags) {
        const trimmed = tag?.trim()
        if (!trimmed) continue
        counter.set(trimmed, (counter.get(trimmed) || 0) + 1)
      }
    }
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [places])

  const filteredPlaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return places.filter((place) => {
      const matchesTheme = themeFilter === 'ALL' || place.themeId === themeFilter
      if (!matchesTheme) return false

      if (!q) return true
      const themeName = (themeNameMap.get(place.themeId) || '').toLowerCase()
      const placeTitle = (place.title || place.placeName || '').toLowerCase()
      const address = (place.address || '').toLowerCase()
      const tags = (place.hashtags || []).join(',').toLowerCase()
      return (
        placeTitle.includes(q) ||
        address.includes(q) ||
        themeName.includes(q) ||
        tags.includes(q)
      )
    })
  }, [places, searchQuery, themeFilter, themeNameMap])

  const openCreateModal = () => {
    setEditingPlace(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (place: PlacebookPlace) => {
    setEditingPlace(place)
    const placeLat = toNumberOrUndefined(place.latitude)
    const placeLng = toNumberOrUndefined(place.longitude)
    setFormData({
      themeId: place.themeId,
      description: place.description || '',
      subtitle: place.subtitle || '',
      placeName: place.title || place.placeName || '',
      address: place.address || '',
      latitude: placeLat !== undefined ? String(placeLat) : '',
      longitude: placeLng !== undefined ? String(placeLng) : '',
      thumbnailUrl: place.thumbnailUrl || '',
      hashtags: (place.hashtags || []).join(', '),
      isActive: !!place.isActive,
    })
    setThumbnailPreview(place.thumbnailUrl || null)
    setThumbnailDataUrl(null)
    setShowModal(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setShowModal(false)
    setEditingPlace(null)
  }

  const parseNumberInput = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  const toNumberOrUndefined = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
  }

  const parseHashtags = (value: string) => {
    const raw = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    return Array.from(new Set(raw))
  }

  const getHashtagInputParts = (value: string) => {
    const parts = value.split(',')
    const head = parts.slice(0, -1).map((item) => item.trim()).filter(Boolean)
    const tail = (parts[parts.length - 1] || '').trim()
    return { head, tail }
  }

  const applyHashtagSuggestion = (tag: string) => {
    const { head } = getHashtagInputParts(formData.hashtags)
    const next = Array.from(new Set([...head, tag]))
    setFormData((prev) => ({ ...prev, hashtags: next.join(', ') }))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return
    if (!formData.themeId) {
      alert('테마를 선택해주세요.')
      return
    }
    if (!formData.placeName.trim()) {
      alert('타이틀을 입력해주세요.')
      return
    }

    const latitude = parseNumberInput(formData.latitude)
    const longitude = parseNumberInput(formData.longitude)
    if (formData.latitude.trim() && latitude === undefined) {
      alert('위도 값이 올바르지 않습니다.')
      return
    }
    if (formData.longitude.trim() && longitude === undefined) {
      alert('경도 값이 올바르지 않습니다.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      themeId: formData.themeId,
      title: formData.placeName.trim(),
      subtitle: formData.subtitle.trim() || undefined,
      description: formData.description.trim() || undefined,
      placeName: formData.placeName.trim(),
      address: formData.address.trim() || undefined,
      latitude,
      longitude,
      thumbnailUrl: thumbnailDataUrl || formData.thumbnailUrl.trim() || undefined,
      hashtags: parseHashtags(formData.hashtags),
    }

    const result = editingPlace
      ? await updatePlacebookPlaceAdmin(editingPlace.id, payload)
      : await createPlacebookPlaceAdmin(payload)

    if (!result.success) {
      alert(result.error || (editingPlace ? '장소 수정에 실패했습니다.' : '장소 생성에 실패했습니다.'))
      setIsSubmitting(false)
      return
    }

    if (editingPlace && formData.isActive !== !!editingPlace.isActive) {
      const statusResult = await updatePlacebookPlaceStatusAdmin(editingPlace.id, {
        isActive: formData.isActive,
      })

      if (!statusResult.success) {
        alert(statusResult.error || '장소 상태 변경에 실패했습니다.')
        setIsSubmitting(false)
        return
      }
    }

    await loadPlaces()
    setShowModal(false)
    setEditingPlace(null)
    setIsSubmitting(false)
    alert(editingPlace ? '장소가 수정되었습니다.' : '장소가 생성되었습니다.')
  }

  const handleDelete = async () => {
    if (!deletePlaceId || isSubmitting) return
    setIsSubmitting(true)
    const result = await deletePlacebookPlaceAdmin(deletePlaceId)
    if (!result.success) {
      alert(result.error || '장소 삭제에 실패했습니다.')
      setIsSubmitting(false)
      return
    }
    await loadPlaces()
    setDeletePlaceId(null)
    setIsSubmitting(false)
    alert('장소가 삭제되었습니다.')
  }

  const handleToggleActive = async (place: PlacebookPlace) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const result = await updatePlacebookPlaceStatusAdmin(place.id, {
      isActive: !place.isActive,
    })

    if (!result.success) {
      alert(result.error || '장소 상태 변경에 실패했습니다.')
      setIsSubmitting(false)
      return
    }

    await loadPlaces()
    setIsSubmitting(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>장소 관리</h1>
        <button onClick={openCreateModal} className={styles.addButton}>
          + 장소 추가
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 220px' }}>
            <input
              type="text"
              placeholder="장소명/주소/테마로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <select
              className={styles.searchInput}
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
            >
              <option value="ALL">전체 테마</option>
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.title || theme.name || theme.id}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            {filteredPlaces.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery || themeFilter !== 'ALL' ? '검색 결과가 없습니다.' : '등록된 장소가 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>썸네일</th>
                      <th>테마</th>
                      <th>타이틀</th>
                      <th>서브타이틀</th>
                      <th>주소</th>
                      <th>활성</th>
                      <th>해시태그</th>
                      <th>방문수</th>
                      <th>즐겨찾기수</th>
                      <th>좋아요</th>
                      <th>댓글</th>
                      <th>인기도</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlaces.map((place) => (
                      <tr key={place.id}>
                        <td>
                          {place.thumbnailUrl ? (
                            <a href={place.thumbnailUrl} target="_blank" rel="noreferrer">
                              보기
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{themeNameMap.get(place.themeId) || place.themeId}</td>
                        <td className={styles.tagNameCell}>{place.title || place.placeName || '-'}</td>
                        <td>{place.subtitle || '-'}</td>
                        <td>{place.address || '-'}</td>
                        <td>
                          <button
                            onClick={() => void handleToggleActive(place)}
                            className={`${styles.statusBadge} ${styles.toggleButton} ${
                              place.isActive ? styles.active : styles.inactive
                            }`}
                            disabled={isSubmitting}
                          >
                            {place.isActive ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td>{place.hashtags && place.hashtags.length > 0 ? place.hashtags.join(', ') : '-'}</td>
                        <td>{place.visitCount ?? 0}</td>
                        <td>{place.favoriteCount ?? 0}</td>
                        <td>{place.likeCount ?? 0}</td>
                        <td>{place.commentCount ?? 0}</td>
                        <td>{place.popularityScore ?? 0}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              onClick={() => setSelectedPlace(place)}
                              className={styles.actionButton}
                              disabled={isSubmitting}
                            >
                              상세
                            </button>
                            <button
                              onClick={() => openEditModal(place)}
                              className={styles.actionButton}
                              disabled={isSubmitting}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => setDeletePlaceId(place.id)}
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              disabled={isSubmitting}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingPlace ? '장소 수정' : '장소 추가'}</h2>
              <button className={styles.modalCloseButton} onClick={closeModal} disabled={isSubmitting}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mapSection}>
                <div className={styles.mapHeader}>
                  <span className={styles.detailLabel}>지도에서 위치를 이동하면 중앙 좌표가 저장됩니다.</span>
                  <span className={styles.mapCoords}>
                    {formData.latitude && formData.longitude
                      ? `${formData.latitude}, ${formData.longitude}`
                      : '좌표 없음'}
                  </span>
                </div>
                <div className={styles.mapToggleRow}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={autoFillAddress}
                      onChange={(e) => setAutoFillAddress(e.target.checked)}
                    />
                    주소 자동 입력
                  </label>
                  <span className={styles.mapToggleHint}>
                    지도 이동 후 약간의 지연을 두고 주소를 채웁니다.
                  </span>
                </div>
                <div className={styles.mapContainer}>
                  <div ref={mapRef} className={styles.mapCanvas} />
                  <div className={styles.mapCenterMarker} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  테마 <span className={styles.required}>*</span>
                </label>
                <select
                  value={formData.themeId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, themeId: e.target.value }))}
                  className={styles.input}
                >
                  {themes.length === 0 && <option value="">테마 없음</option>}
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.title || theme.name || theme.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  타이틀 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.placeName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, placeName: e.target.value }))}
                  className={styles.input}
                  placeholder="타이틀을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>서브타이틀</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className={styles.input}
                  placeholder="서브타이틀을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className={styles.textarea}
                  placeholder="설명을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className={styles.input}
                  placeholder="주소를 입력하세요"
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>위도</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    className={styles.input}
                    placeholder="예: 37.5665"
                    readOnly
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>경도</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    className={styles.input}
                    placeholder="예: 126.9780"
                    readOnly
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>썸네일 URL</label>
                <input
                  type="text"
                  value={formData.thumbnailUrl}
                  onChange={(e) => {
                    setThumbnailDataUrl(null)
                    setThumbnailPreview(e.target.value.trim() || null)
                    setFormData((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                  }}
                  className={styles.input}
                  placeholder="https://..."
                />
                <div className={styles.thumbnailUploadRow}>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.thumbnailUploadInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (!file.type.startsWith('image/')) {
                        alert('이미지 파일만 업로드할 수 있습니다.')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : null
                        setThumbnailPreview(result)
                        setThumbnailDataUrl(result)
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                  <span className={styles.thumbnailMeta}>파일 선택 시 미리보기 및 업로드 데이터로 사용됩니다.</span>
                </div>
                {thumbnailPreview && (
                  <div className={styles.thumbnailPreviewBox}>
                    <img src={thumbnailPreview} alt="썸네일 미리보기" className={styles.previewImage} />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>해시태그</label>
                <input
                  type="text"
                  value={formData.hashtags}
                  list="place-hashtag-suggestions"
                  onChange={(e) => setFormData((prev) => ({ ...prev, hashtags: e.target.value }))}
                  className={styles.input}
                  placeholder="쉼표로 구분 (예: 맛집, 데이트, 야경)"
                />
                <datalist id="place-hashtag-suggestions">
                  {hashtagSuggestions.map((tag) => (
                    <option value={tag} key={tag} />
                  ))}
                </datalist>
                {hashtagSuggestions.length > 0 && (
                  <div className={styles.suggestionRow}>
                    {hashtagSuggestions.slice(0, 12).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={styles.suggestionChip}
                        onClick={() => applyHashtagSuggestion(tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.chipRow}>
                  {parseHashtags(formData.hashtags).length === 0 && (
                    <span className={styles.chipHint}>입력한 해시태그가 없습니다.</span>
                  )}
                  {parseHashtags(formData.hashtags).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={styles.chip}
                      onClick={() => {
                        const next = parseHashtags(formData.hashtags).filter((item) => item !== tag)
                        setFormData((prev) => ({ ...prev, hashtags: next.join(', ') }))
                      }}
                    >
                      #{tag}
                      <span className={styles.chipRemove}>×</span>
                    </button>
                  ))}
                </div>
              </div>
              {editingPlace && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>활성 상태</label>
                  <div className={styles.toggleRow}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="radio"
                        name="place-isActive"
                        value="true"
                        checked={formData.isActive}
                        onChange={() => setFormData((prev) => ({ ...prev, isActive: true }))}
                      />
                      활성
                    </label>
                    <label className={styles.toggleLabel}>
                      <input
                        type="radio"
                        name="place-isActive"
                        value="false"
                        checked={!formData.isActive}
                        onChange={() => setFormData((prev) => ({ ...prev, isActive: false }))}
                      />
                      비활성
                    </label>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button onClick={closeModal} className={styles.cancelButton} disabled={isSubmitting}>
                취소
              </button>
              <button onClick={() => void handleSubmit()} className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : editingPlace ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePlaceId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeletePlaceId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>장소 삭제</h2>
              <button
                className={styles.modalCloseButton}
                onClick={() => setDeletePlaceId(null)}
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>정말로 이 장소를 삭제하시겠습니까?</p>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDeletePlaceId(null)} className={styles.cancelButton} disabled={isSubmitting}>
                취소
              </button>
              <button onClick={() => void handleDelete()} className={styles.deleteConfirmButton} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlace && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPlace(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>장소 상세</h2>
              <button className={styles.modalCloseButton} onClick={() => setSelectedPlace(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.mapSection}>
                <div className={styles.mapHeader}>
                  <span className={styles.detailLabel}>선택된 장소의 위치</span>
                  <span className={styles.mapCoords}>
                    {toNumberOrUndefined(selectedPlace.latitude) !== undefined &&
                    toNumberOrUndefined(selectedPlace.longitude) !== undefined
                      ? `${toNumberOrUndefined(selectedPlace.latitude)}, ${toNumberOrUndefined(selectedPlace.longitude)}`
                      : '좌표 없음'}
                  </span>
                </div>
                <div className={styles.mapContainer}>
                  <div ref={detailMapRef} className={styles.mapCanvas} />
                </div>
              </div>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>테마</span>
                  <span className={styles.detailValue}>
                    {themeNameMap.get(selectedPlace.themeId) || selectedPlace.themeId}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>타이틀</span>
                  <span className={styles.detailValue}>{selectedPlace.title || selectedPlace.placeName || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>서브타이틀</span>
                  <span className={styles.detailValue}>{selectedPlace.subtitle || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>주소</span>
                  <span className={styles.detailValue}>{selectedPlace.address || '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>좌표</span>
                  <span className={styles.detailValue}>
                    {toNumberOrUndefined(selectedPlace.latitude) !== undefined &&
                    toNumberOrUndefined(selectedPlace.longitude) !== undefined
                      ? `${toNumberOrUndefined(selectedPlace.latitude)}, ${toNumberOrUndefined(selectedPlace.longitude)}`
                      : '-'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>상태</span>
                  <span className={styles.detailValue}>{selectedPlace.isActive ? '활성' : '비활성'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>방문/즐겨찾기</span>
                  <span className={styles.detailValue}>
                    {selectedPlace.visited ? '방문' : '미방문'} · {selectedPlace.favorited ? '즐겨찾기' : '미즐겨찾기'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>정렬</span>
                  <span className={styles.detailValue}>{selectedPlace.sortOrder ?? '-'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>방문수</span>
                  <span className={styles.detailValue}>{selectedPlace.visitCount ?? 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>즐겨찾기수</span>
                  <span className={styles.detailValue}>{selectedPlace.favoriteCount ?? 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>좋아요</span>
                  <span className={styles.detailValue}>{selectedPlace.likeCount ?? 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>댓글</span>
                  <span className={styles.detailValue}>{selectedPlace.commentCount ?? 0}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>인기도</span>
                  <span className={styles.detailValue}>{selectedPlace.popularityScore ?? 0}</span>
                </div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>설명</span>
                <div className={styles.detailValueBlock}>{selectedPlace.description || '-'}</div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>해시태그</span>
                <div className={styles.chipRow}>
                  {selectedPlace.hashtags && selectedPlace.hashtags.length > 0 ? (
                    selectedPlace.hashtags.map((tag) => (
                      <span key={tag} className={styles.chipStatic}>
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className={styles.chipHint}>등록된 해시태그가 없습니다.</span>
                  )}
                </div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>썸네일</span>
                {selectedPlace.thumbnailUrl ? (
                  <div className={styles.thumbnailPreviewBox}>
                    <img src={selectedPlace.thumbnailUrl} alt="썸네일" className={styles.previewImage} />
                  </div>
                ) : (
                  <div className={styles.detailValueBlock}>-</div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setSelectedPlace(null)} className={styles.cancelButton}>
                닫기
              </button>
              <button
                onClick={() => {
                  setSelectedPlace(null)
                  openEditModal(selectedPlace)
                }}
                className={styles.saveButton}
              >
                수정
              </button>
              <button
                onClick={() => {
                  setSelectedPlace(null)
                  setDeletePlaceId(selectedPlace.id)
                }}
                className={styles.deleteConfirmButton}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
