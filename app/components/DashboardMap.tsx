'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApiBaseUrl } from '../context/ApiBaseUrlContext'
import { getAccessToken } from '../lib/authStorage'
import {
  getPlacebookCategoriesAdmin,
  updatePlacebookPlaceHiddenAdmin,
  updatePlacebookPlaceAdmin,
  deletePlacebookPlaceAdmin,
  type PlacebookCategory,
} from '../lib/api'
import styles from './DetailView.module.css'
import tagStyles from './TagManagement.module.css'
import userListStyles from './UserList.module.css'
import Modal from './Modal'

declare global {
  interface Window {
    naver: any
    navermap_authFailure?: () => void
  }
}

type MapStatus = 'idle' | 'loading' | 'ready' | 'error'

type MapPlace = {
  id?: string
  placeName?: string
  name?: string
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  isActive?: boolean
  isHidden?: boolean
  themeId?: string
  description?: string | null
  thumbnailUrl?: string | null
  hashtags?: string[]
  visitCount?: number
  favoriteCount?: number
  likeCount?: number
  commentCount?: number
  popularityScore?: number
}

const DEFAULT_CENTER = { latitude: 37.5665, longitude: 127.0276 }
const DEFAULT_RADIUS_KM = 10
const DEFAULT_LIMIT = 200

export default function DashboardMap() {
  const { apiBaseUrl } = useApiBaseUrl()
  const [places, setPlaces] = useState<MapPlace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapStatus, setMapStatus] = useState<MapStatus>('idle')
  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [categories, setCategories] = useState<PlacebookCategory[]>([])
  const [categoryId, setCategoryId] = useState<string>('')
  const [isClusterReady, setIsClusterReady] = useState(false)
  const [mapViewKey, setMapViewKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingPlaceId, setUpdatingPlaceId] = useState<string | null>(null)
  const [modalState, setModalState] = useState<{
    type: 'detail' | 'edit' | 'delete' | null
    place: MapPlace | null
  }>({ type: null, place: null })
  const [editForm, setEditForm] = useState({
    themeId: '',
    placeName: '',
    address: '',
    latitude: '',
    longitude: '',
    description: '',
    thumbnailUrl: '',
    hashtags: '',
    isActive: true,
  })
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pageSize = 20
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const markerMapRef = useRef<Map<string, any>>(new Map())
  const clusterRef = useRef<any>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasUserMovedRef = useRef(false)
  const hasAutoFitRef = useRef(false)
  const detailMapRef = useRef<HTMLDivElement>(null)
  const detailMapInstanceRef = useRef<any>(null)
  const infoWindowRef = useRef<any>(null)
  const selectedPlaceIdRef = useRef<string | null>(null)
  const lastFetchKeyRef = useRef<string | null>(null)
  const hasIgnoredInitialIdleRef = useRef(false)
  const centerRef = useRef(DEFAULT_CENTER)
  const radiusCircleRef = useRef<any>(null)

  const handleZoomIn = () => {
    const map = mapInstanceRef.current
    if (!map) return
    map.setZoom(map.getZoom() + 1, true)
  }

  const handleZoomOut = () => {
    const map = mapInstanceRef.current
    if (!map) return
    map.setZoom(map.getZoom() - 1, true)
  }

  const summary = useMemo(() => {
    const total = places.length
    const active = places.filter((place) => place.isActive !== false).length
    const withCoords = places.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)).length
    return { total, active, withCoords }
  }, [places])


  const totalPages = Math.max(1, Math.ceil(places.length / pageSize))
  const pagedPlaces = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return places.slice(start, start + pageSize)
  }, [places, currentPage, pageSize])

  useEffect(() => {
    const loadCategories = async () => {
      const result = await getPlacebookCategoriesAdmin()
      if (!result.success) {
        setCategories([])
        return
      }
      setCategories(result.data || [])
    }

    void loadCategories()
  }, [])

  // 테마 필터는 일단 사용하지 않음

  const fetchPlaces = async (
    nextCenter: { latitude: number; longitude: number },
    nextCategoryId: string,
    nextRadiusKm: number
  ) => {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({
      latitude: String(nextCenter.latitude),
      longitude: String(nextCenter.longitude),
      radius: String(nextRadiusKm),
      limit: String(DEFAULT_LIMIT),
      orderBy: 'distance',
      order: 'ASC',
    })

    if (nextCategoryId) {
      params.set('categoryId', nextCategoryId)
    }

    const accessToken = getAccessToken()
    const url = `${apiBaseUrl}/api/v1/map/placebook/themes/top?${params.toString()}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error('failed')
      }

      const responseData = await response.json()
      const rawItems = Array.isArray(responseData)
        ? responseData
        : Array.isArray(responseData?.items)
          ? responseData.items
          : Array.isArray(responseData?.data?.items)
            ? responseData.data.items
            : Array.isArray(responseData?.data)
              ? responseData.data
              : []

      const toNumber = (value: any): number | null => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null
        if (typeof value === 'string' && value.trim() !== '') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : null
        }
        return null
      }

      const mapped = rawItems.map((item: any) => {
        const lat =
          toNumber(item?.latitude) ?? toNumber(item?.mapy) ?? toNumber(item?.lat)
        const lng =
          toNumber(item?.longitude) ?? toNumber(item?.mapx) ?? toNumber(item?.lng)

        return {
          ...item,
          title: item?.title ?? item?.placeName ?? item?.name ?? item?.place_name ?? null,
          subtitle: item?.subtitle ?? item?.subTitle ?? null,
          placeName: item?.placeName || item?.title || item?.name || item?.place_name,
          latitude: lat,
          longitude: lng,
          isHidden: item?.isHidden ?? item?.hidden ?? false,
          description: item?.description ?? null,
          thumbnailUrl: item?.thumbnailUrl ?? item?.thumbnail_url ?? null,
          hashtags: Array.isArray(item?.hashtags) ? item.hashtags : undefined,
        }
      })

      setPlaces(mapped)
    } catch {
      setPlaces([])
      setError('장소 데이터를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadNaverMapScript = () =>
      new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') {
          reject(new Error('window is not available'))
          return
        }

        const ensureClusterModule = () => {
          if (window.naver?.maps?.MarkerClustering) {
            setIsClusterReady(true)
            return
          }

          const existingClusterScript = document.querySelector('script[src*="markerClustering"]')
          if (existingClusterScript) {
            existingClusterScript.addEventListener('load', () => {
              if (window.naver?.maps?.MarkerClustering) setIsClusterReady(true)
            })
            return
          }

          const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'
          const scriptElement = document.createElement('script')
          scriptElement.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=markerClustering`
          scriptElement.async = true
          scriptElement.onload = () => {
            if (window.naver?.maps?.MarkerClustering) setIsClusterReady(true)
          }
          scriptElement.onerror = () => reject(new Error('map script failed'))
          document.head.appendChild(scriptElement)
        }

        if (window.naver?.maps) {
          ensureClusterModule()
          resolve()
          return
        }

        const existingScript = document.querySelector('script[src*="map.naver.com"]')
        if (existingScript) {
          existingScript.addEventListener('load', () => {
            ensureClusterModule()
            resolve()
          })
          existingScript.addEventListener('error', () => reject(new Error('map script failed')))
          return
        }

        const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID || 'e2m4s9kqcr'
        const scriptElement = document.createElement('script')
        scriptElement.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder,markerClustering`
        scriptElement.async = true
        scriptElement.onload = () => {
          if (window.naver?.maps?.MarkerClustering) setIsClusterReady(true)
          resolve()
        }
        scriptElement.onerror = () => reject(new Error('map script failed'))
        document.head.appendChild(scriptElement)
      })

    setMapStatus('loading')
    loadNaverMapScript()
      .then(() => {
        if (!isMounted) return
        if (!mapRef.current || !window.naver?.maps) {
          setMapStatus('error')
          return
        }

        const initialCenter = new window.naver.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)
        const map = new window.naver.maps.Map(mapRef.current, {
          center: initialCenter,
          zoom: 10,
          minZoom: 6,
          scaleControl: false,
          mapDataControl: false,
          logoControl: false,
        })
        mapInstanceRef.current = map
        console.info('[DashboardMap] Map ready. MarkerClustering:', !!window.naver?.maps?.MarkerClustering)
        window.naver.maps.Event.addListener(map, 'dragstart', () => {
          hasUserMovedRef.current = true
        })

        window.naver.maps.Event.addListener(map, 'zoom_changed', () => {
          hasUserMovedRef.current = true
        })

        window.naver.maps.Event.addListener(map, 'idle', () => {
          const nextCenter = map.getCenter()
          if (!nextCenter) return
          if (!hasUserMovedRef.current && !hasIgnoredInitialIdleRef.current) {
            hasIgnoredInitialIdleRef.current = true
            return
          }
          const next = { latitude: nextCenter.lat(), longitude: nextCenter.lng() }
          const prev = centerRef.current
          const latDiff = Math.abs(prev.latitude - next.latitude)
          const lngDiff = Math.abs(prev.longitude - next.longitude)
          if (!hasUserMovedRef.current && latDiff < 0.0001 && lngDiff < 0.0001) {
            return
          }
          centerRef.current = next
          setCenter(next)
          setMapViewKey((prev) => prev + 1)
        })
        setMapStatus('ready')
      })
      .catch(() => {
        if (!isMounted) return
        setMapStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.naver?.maps) return

    if (clusterRef.current) {
      if (typeof clusterRef.current.setMap === 'function') {
        clusterRef.current.setMap(null)
      }
      clusterRef.current = null
    }

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []
    markerMapRef.current.clear()

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.naver.maps.InfoWindow({
        disableAutoPan: true,
        backgroundColor: 'transparent',
        borderWidth: 0,
        anchorSize: new window.naver.maps.Size(0, 0),
        anchorSkew: false,
        pixelOffset: new window.naver.maps.Point(0, -4),
      })
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        infoWindowRef.current?.close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    if (mapInstanceRef.current) {
      window.naver.maps.Event.addListener(mapInstanceRef.current, 'click', () => {
        infoWindowRef.current?.close()
        selectedPlaceIdRef.current = null
      })
    }

    const validPlaces = places.filter(
      (place) =>
        !place.isHidden &&
        Number.isFinite(place.latitude) &&
        Number.isFinite(place.longitude)
    )

    if (validPlaces.length === 0) return

    const bounds = new window.naver.maps.LatLngBounds()

    const markers = validPlaces.map((place) => {
      const position = new window.naver.maps.LatLng(place.latitude, place.longitude)
      const markerHtml =
        '<div style="width:16px;height:16px;border-radius:50%;background:#111827;border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(17,24,39,0.35);"></div>'
      const marker = new window.naver.maps.Marker({
        position,
        title: place.title || place.placeName || place.name || '장소',
        icon: {
          content: markerHtml,
          size: new window.naver.maps.Size(20, 20),
          anchor: new window.naver.maps.Point(10, 10),
        },
        zIndex: 100,
      })
      window.naver.maps.Event.addListener(marker, 'click', () => {
        const title = place.title || place.placeName || place.name || '장소'
        const content = `<div style="padding:6px 10px;background:#111827;color:#fff;border-radius:999px;font-size:12px;line-height:1;white-space:nowrap;">${title}</div>`
        infoWindowRef.current?.close()
        infoWindowRef.current.setContent(content)
        infoWindowRef.current.open(mapInstanceRef.current, marker)
      })
      if (place.id) {
        markerMapRef.current.set(place.id, marker)
      }
      markersRef.current.push(marker)
      bounds.extend(position)   
      return marker
    })

    const clusteringCtor = window.naver?.maps?.MarkerClustering || (window as any).MarkerClustering
    if (isClusterReady && clusteringCtor) {
      console.info('[DashboardMap] MarkerClustering enabled.')
      const clusterHtml =
        '<div style="width:48px;height:48px;border-radius:50%;background:#111827;border:2px solid #ffffff;box-shadow:0 10px 24px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.2px;line-height:1;"><span class="count">0</span></div>'
      clusterRef.current = new clusteringCtor({
        minClusterSize: 2,
        maxZoom: 14,
        map: mapInstanceRef.current,
        markers,
        disableClickZoom: false,
        gridSize: 220,
        icons: [
          {
            content: clusterHtml,
            size: new window.naver.maps.Size(48, 48),
            anchor: new window.naver.maps.Point(50, 50),
          },
        ],
        indexGenerator: [10, 50, 100, 200],
        stylingFunction: (clusterMarker: any, count: number) => {
          const element = clusterMarker.getElement()
          if (!element) return
          const countEl = element.querySelector('.count')
          if (countEl) {
            countEl.textContent = String(count)
          } else {
            element.textContent = String(count)
          }
        },
      })
    } else {
      const map = mapInstanceRef.current
      if (!map) return
      const zoom = map.getZoom()
      const baseStep = 0.03
      const step = Math.max(0.0015, baseStep * Math.pow(2, 10 - zoom))

      const bucket = new Map<string, MapPlace[]>()
      validPlaces.forEach((place) => {
        const key = `${Math.round((place.latitude as number) / step)}_${Math.round((place.longitude as number) / step)}`
        const existing = bucket.get(key)
        if (existing) {
          existing.push(place)
        } else {
          bucket.set(key, [place])
        }
      })

      const clusterHtmlBase = (count: number) =>
        `<div style="width:48px;height:48px;border-radius:50%;background:#111827;border:2px solid #ffffff;box-shadow:0 10px 24px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:14px;font-weight:700;letter-spacing:0.2px;line-height:1;">${count}</div>`
      bucket.forEach((group) => {
        const count = group.length
        if (count === 1) {
          const place = group[0]
          const position = new window.naver.maps.LatLng(place.latitude, place.longitude)
          const markerHtml =
            '<div style="width:16px;height:16px;border-radius:50%;background:#111827;border:2px solid #ffffff;box-shadow:0 0 0 1px rgba(17,24,39,0.35);"></div>'
          const marker = new window.naver.maps.Marker({
            position,
            map,
            title: place.title || place.placeName || place.name || '장소',
            icon: {
              content: markerHtml,
              size: new window.naver.maps.Size(20, 20),
              anchor: new window.naver.maps.Point(10, 10),
            },
            zIndex: 100,
          })
          window.naver.maps.Event.addListener(marker, 'click', () => {
            const title = place.title || place.placeName || place.name || '장소'
            const content = `<div style="padding:6px 10px;background:#111827;color:#fff;border-radius:999px;font-size:12px;line-height:1;white-space:nowrap;">${title}</div>`
            infoWindowRef.current?.close()
            infoWindowRef.current.setContent(content)
            infoWindowRef.current.open(map, marker)
          })
          if (place.id) {
            markerMapRef.current.set(place.id, marker)
          }
          markersRef.current.push(marker)
        } else {
          const avgLat = group.reduce((sum, p) => sum + (p.latitude as number), 0) / count
          const avgLng = group.reduce((sum, p) => sum + (p.longitude as number), 0) / count
          const position = new window.naver.maps.LatLng(avgLat, avgLng)
          const clusterMarker = new window.naver.maps.Marker({
            position,
            map,
            icon: {
              content: clusterHtmlBase(count),
              size: new window.naver.maps.Size(48, 48),
              anchor: new window.naver.maps.Point(50, 50),
            },
            zIndex: 200,
          })
          markersRef.current.push(clusterMarker)
        }
      })
    }

    if (!hasUserMovedRef.current && !hasAutoFitRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      hasAutoFitRef.current = true
    }

    if (selectedPlaceIdRef.current) {
      const selectedPlace = validPlaces.find((place) => place.id === selectedPlaceIdRef.current)
      if (selectedPlace && Number.isFinite(selectedPlace.latitude) && Number.isFinite(selectedPlace.longitude)) {
        const title = selectedPlace.title || selectedPlace.placeName || selectedPlace.name || '장소'
        const content = `<div style="padding:6px 10px;background:#111827;color:#fff;border-radius:999px;font-size:12px;line-height:1;white-space:nowrap;">${title}</div>`
        infoWindowRef.current.setContent(content)
        const marker = selectedPlace.id ? markerMapRef.current.get(selectedPlace.id) : null
        if (marker) {
          infoWindowRef.current.open(mapInstanceRef.current, marker)
        } else {
          infoWindowRef.current.open(
            mapInstanceRef.current,
            new window.naver.maps.LatLng(selectedPlace.latitude, selectedPlace.longitude)
          )
        }
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [places, isClusterReady, mapViewKey])

  const handleSelectPlaceFromList = (place: MapPlace) => {
    if (!mapInstanceRef.current || !infoWindowRef.current) return
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return
    const title = place.title || place.placeName || place.name || '장소'
    const content = `<div style="padding:6px 10px;background:#111827;color:#fff;border-radius:999px;font-size:12px;line-height:1;white-space:nowrap;">${title}</div>`
    selectedPlaceIdRef.current = place.id || null
    infoWindowRef.current.setContent(content)
    const marker = place.id ? markerMapRef.current.get(place.id) : null
    if (marker) {
      infoWindowRef.current.open(mapInstanceRef.current, marker)
    } else {
      infoWindowRef.current.open(
        mapInstanceRef.current,
        new window.naver.maps.LatLng(place.latitude, place.longitude)
      )
    }
  }

  const getVisibleRadiusKm = () => {
    const map = mapInstanceRef.current
    if (!map || !window.naver?.maps) return DEFAULT_RADIUS_KM
    const bounds = map.getBounds()
    if (!bounds) return DEFAULT_RADIUS_KM
    const ne = bounds.getNE()
    const sw = bounds.getSW()
    if (!ne || !sw) return DEFAULT_RADIUS_KM

    const r = 6371
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const lat1 = sw.lat()
    const lat2 = ne.lat()
    const lng = (sw.lng() + ne.lng()) / 2
    const dLat = toRad(lat2 - lat1)
    const dLng = 0
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const verticalKm = r * c
    const halfVerticalKm = verticalKm / 2
    return Math.max(1, Number(halfVerticalKm.toFixed(2)))
  }

  const updateRadiusCircle = () => {
    const map = mapInstanceRef.current
    if (!map || !window.naver?.maps) return
    const radiusKm = getVisibleRadiusKm()
    const centerPoint = new window.naver.maps.LatLng(center.latitude, center.longitude)
    const radiusMeters = radiusKm * 1000

    if (!radiusCircleRef.current) {
      radiusCircleRef.current = new window.naver.maps.Circle({
        map,
        center: centerPoint,
        radius: radiusMeters,
        strokeColor: '#2563eb',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
      })
    } else {
      radiusCircleRef.current.setCenter(centerPoint)
      radiusCircleRef.current.setRadius(radiusMeters)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      const radiusKm = getVisibleRadiusKm()
      const key = `${center.latitude.toFixed(5)}:${center.longitude.toFixed(5)}:${categoryId}:${radiusKm.toFixed(2)}`
      if (lastFetchKeyRef.current === key) return
      lastFetchKeyRef.current = key
      updateRadiusCircle()
      void fetchPlaces(center, categoryId, radiusKm)
    }, 450)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [apiBaseUrl, center, categoryId])

  const handleToggleHidden = async (place: MapPlace) => {
    if (!place.id || updatingPlaceId) return
    const nextHidden = !place.isHidden
    setUpdatingPlaceId(place.id)
    const result = await updatePlacebookPlaceHiddenAdmin(place.id, nextHidden)
    if (!result.success) {
      setUpdatingPlaceId(null)
      alert(result.error || '숨김 상태 변경에 실패했습니다.')
      return
    }
    setPlaces((prev) =>
      prev.map((item) =>
        item.id === place.id ? { ...item, isHidden: nextHidden } : item
      )
    )
    setModalState((prev) =>
      prev.place && prev.place.id === place.id
        ? { ...prev, place: { ...prev.place, isHidden: nextHidden } }
        : prev
    )
    setUpdatingPlaceId(null)
  }

  const openDetailModal = (place: MapPlace) => {
    setModalState({ type: 'detail', place })
  }

  const openEditModal = (place: MapPlace) => {
    setEditForm({
      themeId: place.themeId || '',
      placeName: place.title || place.placeName || place.name || '',
      address: place.address || '',
      latitude: Number.isFinite(place.latitude) ? String(place.latitude) : '',
      longitude: Number.isFinite(place.longitude) ? String(place.longitude) : '',
      description: place.description || '',
      thumbnailUrl: place.thumbnailUrl || '',
      hashtags: Array.isArray(place.hashtags) ? place.hashtags.join(', ') : '',
      isActive: place.isActive !== false,
    })
    setThumbnailPreview(place.thumbnailUrl || null)
    setModalState({ type: 'edit', place })
  }

  const openDeleteModal = (place: MapPlace) => {
    setModalState({ type: 'delete', place })
  }

  const closeModal = () => {
    setModalState({ type: null, place: null })
    setThumbnailPreview(null)
  }

  const handleSaveEdit = async () => {
    if (!modalState.place?.id) return
    setIsSubmitting(true)
    const payload = {
      ...(editForm.themeId ? { themeId: editForm.themeId } : {}),
      placeName: editForm.placeName.trim(),
      address: editForm.address.trim() || null,
      latitude: editForm.latitude ? Number(editForm.latitude) : null,
      longitude: editForm.longitude ? Number(editForm.longitude) : null,
      description: editForm.description.trim() || null,
      thumbnailUrl: editForm.thumbnailUrl.trim() || null,
      hashtags: editForm.hashtags
        ? editForm.hashtags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      isActive: editForm.isActive,
    }

    const result = await updatePlacebookPlaceAdmin(modalState.place.id, payload)
    if (!result.success) {
      alert(result.error || '장소 수정에 실패했습니다.')
      setIsSubmitting(false)
      return
    }

    setPlaces((prev) =>
      prev.map((item) =>
        item.id === modalState.place?.id
          ? {
              ...item,
              ...payload,
              placeName: payload.placeName || item.placeName,
              hashtags: payload.hashtags,
            }
          : item
      )
    )
    setIsSubmitting(false)
    closeModal()
  }

  const handleDelete = async () => {
    if (!modalState.place?.id) return
    setIsSubmitting(true)
    const result = await deletePlacebookPlaceAdmin(modalState.place.id)
    if (!result.success) {
      alert(result.error || '장소 삭제에 실패했습니다.')
      setIsSubmitting(false)
      return
    }
    setPlaces((prev) => prev.filter((item) => item.id !== modalState.place?.id))
    setIsSubmitting(false)
    closeModal()
  }

  useEffect(() => {
    if (modalState.type !== 'detail') return
    const place = modalState.place
    if (!place || !detailMapRef.current || !window.naver?.maps) return
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return

    const center = new window.naver.maps.LatLng(place.latitude, place.longitude)
    const map = new window.naver.maps.Map(detailMapRef.current, {
      center,
      zoom: 14,
      minZoom: 6,
      scaleControl: false,
      mapDataControl: false,
      logoControl: false,
    })
    detailMapInstanceRef.current = map
    const marker = new window.naver.maps.Marker({ position: center, map })

    return () => {
      if (marker) marker.setMap(null)
      if (detailMapInstanceRef.current) detailMapInstanceRef.current = null
    }
  }, [modalState])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      return
    }
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [places])

  return (
    <div className={styles.detailView}>
      <div className={styles.header}>
        <h1 className={styles.title}>지도로 보기</h1>
        <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>
          장소 좌표가 있는 항목을 지도에서 확인합니다.
        </p>
      </div>
      <div className={styles.content}>
        <div style={{ display: 'grid', gap: 24 }}>
          {error && (
            <div className={styles.card}>
              <p style={{ color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <div className={styles.card} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>전체 장소</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {summary.total.toLocaleString('ko-KR')}
              </div>
            </div>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>활성 장소</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {summary.active.toLocaleString('ko-KR')}
              </div>
            </div>
            <div style={{ minWidth: 120 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>좌표 보유</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {summary.withCoords.toLocaleString('ko-KR')}
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>현재 중심 좌표</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  display: 'inline-block',
                  minWidth: 160,
                }}
              >
                {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                반경 {DEFAULT_RADIUS_KM}km · 최대 {DEFAULT_LIMIT}개
              </div>
            </div>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>카테고리</div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{
                  marginTop: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  fontSize: 13,
                  width: '100%',
                }}
              >
                <option value="">전체</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name || category.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              minHeight: 20,
              color: mapStatus === 'error' ? '#b45309' : '#6b7280',
              fontSize: 13,
              visibility: isLoading || mapStatus === 'error' ? 'visible' : 'hidden',
            }}
          >
            {mapStatus === 'error'
              ? '지도 스크립트를 불러오지 못했습니다.'
              : '장소 데이터를 불러오는 중...'}
          </div>

          <div
            style={{
              height: 520,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            <div
              style={{
                position: 'absolute',
                right: 12,
                bottom: 32,
                display: 'grid',
                gap: 6,
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#111827',
                  color: '#fff',
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
                }}
                aria-label="지도 확대"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: '#111827',
                  color: '#fff',
                  fontSize: 18,
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
                }}
                aria-label="지도 축소"
              >
                −
              </button>
            </div>
            {mapStatus !== 'ready' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  fontSize: 14,
                }}
              >
                {mapStatus === 'error' ? '지도를 불러오지 못했습니다.' : '지도를 불러오는 중...'}
              </div>
            )}
          </div>
        </div>

        <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>장소 리스트</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{places.length.toLocaleString('ko-KR')}개</div>
          </div>
          <div>
            {places.length === 0 ? (
              <div style={{ padding: 16, color: '#6b7280', fontSize: 13 }}>표시할 장소가 없습니다.</div>
            ) : (
              <div className={tagStyles.tableContainer}>
                <table className={tagStyles.table}>
                  <thead>
                    <tr>
                      <th>썸네일</th>
                      <th>이름</th>
                      <th>주소</th>
                      <th>방문수</th>
                      <th>즐겨찾기수</th>
                      <th>좋아요</th>
                      <th>댓글</th>
                      <th>인기도</th>
                      <th>노출</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPlaces.map((place, index) => (
                      <tr
                        key={place.id || `${place.title || place.placeName}-${index}`}
                        onClick={() => handleSelectPlaceFromList(place)}
                        style={{
                          cursor:
                            Number.isFinite(place.latitude) && Number.isFinite(place.longitude) ? 'pointer' : 'default',
                        }}
                      >
                        <td>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              overflow: 'hidden',
                              background: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              color: '#94a3b8',
                            }}
                          >
                            {place.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={place.thumbnailUrl}
                                alt={place.title || place.placeName || place.name || '썸네일'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </td>
                        <td className={tagStyles.tagNameCell}>{place.title || place.placeName || place.name || '-'}</td>
                        <td>{place.address || '-'}</td>
                      <td>{place.visitCount ?? 0}</td>
                      <td>{place.favoriteCount ?? 0}</td>
                      <td>{place.likeCount ?? 0}</td>
                      <td>{place.commentCount ?? 0}</td>
                      <td>{place.popularityScore ?? 0}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleHidden(place)}
                            disabled={!place.id || updatingPlaceId === place.id}
                            className={`${tagStyles.statusBadge} ${tagStyles.toggleButton} ${
                              place.isHidden ? tagStyles.inactive : tagStyles.active
                            }`}
                          >
                            {updatingPlaceId === place.id
                              ? '처리 중...'
                              : place.isHidden
                                ? '숨김'
                                : '노출'}
                          </button>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className={tagStyles.actions}>
                            <button
                              type="button"
                              className={tagStyles.actionButton}
                              onClick={() => openDetailModal(place)}
                            >
                              상세
                            </button>
                            <button
                              type="button"
                              className={tagStyles.actionButton}
                              onClick={() => openEditModal(place)}
                              disabled={isSubmitting}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className={`${tagStyles.actionButton} ${tagStyles.deleteButton}`}
                              onClick={() => openDeleteModal(place)}
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
          </div>
        </div>

        {totalPages > 1 && (
          <div className={userListStyles.pagination}>
            <button
              className={userListStyles.paginationNavButton}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              ‹
            </button>
            <div className={userListStyles.paginationNumbers}>
              {(() => {
                const pages: (number | string)[] = []
                const maxVisible = 5
                if (totalPages <= maxVisible) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (currentPage <= 3) {
                    pages.push(2, 3, 4, '...', totalPages)
                  } else if (currentPage >= totalPages - 2) {
                    pages.push('...')
                    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
                  } else {
                    pages.push('...')
                    pages.push(currentPage - 1, currentPage, currentPage + 1)
                    pages.push('...', totalPages)
                  }
                }
                return pages.map((page, index) =>
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className={userListStyles.paginationEllipsis}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      className={`${userListStyles.paginationNumberButton} ${
                        currentPage === page ? userListStyles.active : ''
                      }`}
                      onClick={() => setCurrentPage(page as number)}
                      disabled={isLoading}
                    >
                      {page}
                    </button>
                  )
                )
              })()}
            </div>
            <button
              className={userListStyles.paginationNavButton}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              ›
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalState.type === 'detail'}
        onClose={closeModal}
        title="장소 상세"
        footer={null}
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#94a3b8',
              }}
            >
              {modalState.place?.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={modalState.place.thumbnailUrl}
                  alt={modalState.place.title || modalState.place.placeName || modalState.place.name || '썸네일'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                'N/A'
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div>
                <span style={{ fontSize: 12, color: '#6b7280' }}>이름</span>
                <div style={{ fontWeight: 600 }}>
                  {modalState.place?.title || modalState.place?.placeName || modalState.place?.name || '-'}
                </div>
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>테마</span>
                <div>{modalState.place?.themeId || '-'}</div>
              </div>
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>주소</span>
            <div>{modalState.place?.address || '-'}</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>좌표</span>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>
              {Number.isFinite(modalState.place?.latitude) && Number.isFinite(modalState.place?.longitude)
                ? `${Number(modalState.place?.latitude).toFixed(4)}, ${Number(modalState.place?.longitude).toFixed(4)}`
                : '-'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>설명</span>
            <div>{modalState.place?.description || '-'}</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>해시태그</span>
            <div>{modalState.place?.hashtags?.join(', ') || '-'}</div>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>노출</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{modalState.place?.isHidden ? '숨김' : '노출'}</span>
              {modalState.place && (
                <button
                  type="button"
                  className={`${tagStyles.statusBadge} ${tagStyles.toggleButton} ${
                    modalState.place.isHidden ? tagStyles.inactive : tagStyles.active
                  }`}
                  onClick={() => handleToggleHidden(modalState.place as MapPlace)}
                >
                  {modalState.place.isHidden ? '숨김' : '노출'}
                </button>
              )}
            </div>
          </div>
          {Number.isFinite(modalState.place?.latitude) && Number.isFinite(modalState.place?.longitude) && (
            <div>
              <span style={{ fontSize: 12, color: '#6b7280' }}>지도</span>
              <div
                ref={detailMapRef}
                style={{
                  marginTop: 6,
                  height: 160,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden',
                }}
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={modalState.type === 'edit'}
        onClose={closeModal}
        title="장소 수정"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className={tagStyles.actionButton} onClick={closeModal} disabled={isSubmitting}>
              취소
            </button>
            <button className={tagStyles.actionButton} onClick={() => void handleSaveEdit()} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label className={tagStyles.label}>테마</label>
            <input
              className={tagStyles.input}
              value={editForm.themeId}
              onChange={(e) => setEditForm((prev) => ({ ...prev, themeId: e.target.value }))}
              placeholder="테마 ID"
            />
          </div>
          <div>
            <label className={tagStyles.label}>이름</label>
            <input
              className={tagStyles.input}
              value={editForm.placeName}
              onChange={(e) => setEditForm((prev) => ({ ...prev, placeName: e.target.value }))}
            />
          </div>
          <div>
            <label className={tagStyles.label}>주소</label>
            <input
              className={tagStyles.input}
              value={editForm.address}
              onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className={tagStyles.label}>위도</label>
              <input
                className={tagStyles.input}
                value={editForm.latitude}
                onChange={(e) => setEditForm((prev) => ({ ...prev, latitude: e.target.value }))}
              />
            </div>
            <div>
              <label className={tagStyles.label}>경도</label>
              <input
                className={tagStyles.input}
                value={editForm.longitude}
                onChange={(e) => setEditForm((prev) => ({ ...prev, longitude: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={tagStyles.label}>설명</label>
            <textarea
              className={tagStyles.textarea}
              value={editForm.description}
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div>
            <label className={tagStyles.label}>썸네일 URL</label>
            <input
              className={tagStyles.input}
              value={editForm.thumbnailUrl}
              onChange={(e) => {
                const value = e.target.value
                setEditForm((prev) => ({ ...prev, thumbnailUrl: value }))
                setThumbnailPreview(value || null)
              }}
            />
          </div>
          <div>
            <label className={tagStyles.label}>썸네일 미리보기</label>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontSize: 12,
              }}
            >
              {thumbnailPreview || editForm.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailPreview || editForm.thumbnailUrl}
                  alt="썸네일 미리보기"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                'N/A'
              )}
            </div>
          </div>
          <div>
            <label className={tagStyles.label}>썸네일 업로드</label>
            <input
              className={tagStyles.input}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  const result = typeof reader.result === 'string' ? reader.result : ''
                  if (result) {
                    setThumbnailPreview(result)
                    setEditForm((prev) => ({ ...prev, thumbnailUrl: result }))
                  }
                }
                reader.readAsDataURL(file)
              }}
            />
          </div>
          <div>
            <label className={tagStyles.label}>해시태그</label>
            <input
              className={tagStyles.input}
              value={editForm.hashtags}
              onChange={(e) => setEditForm((prev) => ({ ...prev, hashtags: e.target.value }))}
              placeholder="예: 카페, 강남, 테마"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            활성 상태
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={modalState.type === 'delete'}
        onClose={closeModal}
        title="장소 삭제"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className={tagStyles.actionButton} onClick={closeModal} disabled={isSubmitting}>
              취소
            </button>
            <button
              className={`${tagStyles.actionButton} ${tagStyles.deleteButton}`}
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              {isSubmitting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        }
      >
        <p style={{ margin: 0 }}>선택한 장소를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.</p>
      </Modal>
    </div>
  </div>
  )
}
