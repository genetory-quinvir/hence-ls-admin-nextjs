'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useMockData } from '../context/MockDataContext'
import { LiveSpace } from '../data/mockData'
import { getLiveSpacesAdmin, LiveSpaceListMeta, deleteLiveSpaceAdmin, terminateLiveSpaceAdmin, updateLiveSpaceAdmin, UpdateLiveSpaceRequest, uploadLiveSpaceThumbnail, getTagsAdmin, Tag } from '../lib/api'
import Modal from './Modal'
import styles from './LiveSpaceList.module.css'

interface LiveSpaceListProps {
  menuId: string
}

export default function LiveSpaceList({ menuId }: LiveSpaceListProps) {
  const { liveSpaces, updateLiveSpaces } = useMockData()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchKeyword, setSearchKeyword] = useState('') // 검색어 입력
  const [appliedKeyword, setAppliedKeyword] = useState<string | undefined>(undefined) // 실제 필터링에 사용되는 검색어
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<LiveSpaceListMeta | null>(null)
  const [apiLiveSpaces, setApiLiveSpaces] = useState<LiveSpace[]>([])
  const [selectedLiveSpace, setSelectedLiveSpace] = useState<LiveSpace | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 수정 폼 상태
  const [editFormData, setEditFormData] = useState<{
    title: string
    placeName: string
    description: string
    category: string
    scheduledStartTime: string
    scheduledEndTime: string
    address: string
    lat: string
    lng: string
    selectedTags: string[]
  } | null>(null)
  
  // 태그 목록 상태
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)
  
  // 썸네일 파일 상태
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  
  // 카테고리 매핑 (이름 -> ID)
  const categoryMap: Record<string, string> = {
    '팝업': '59c76d5f-df90-49e3-91be-fb074d6d2635',
    '전시': '07841371-a660-47f0-b72e-99a188b428e9',
    '이벤트': '564388d8-b577-4897-b53d-51c5391b8e88',
    '세일/혜택': 'b6ded660-6911-42c6-a869-348146ba6623',
    '맛집': '13119e08-caab-498d-a92d-af3ccbfc8bbf',
    '핀': '15d7417c-ab1f-4c9a-a1ee-718e9357698b',
    'HENCE': '15d7417c-ab1f-4c9a-a1ee-718e9357698b',
  }
  
  // 카테고리 ID -> 이름 역매핑
  const categoryIdToName: Record<string, string> = {
    '59c76d5f-df90-49e3-91be-fb074d6d2635': '팝업',
    '07841371-a660-47f0-b72e-99a188b428e9': '전시',
    '564388d8-b577-4897-b53d-51c5391b8e88': '이벤트',
    'b6ded660-6911-42c6-a869-348146ba6623': '세일/혜택',
    '13119e08-caab-498d-a92d-af3ccbfc8bbf': '맛집',
    '15d7417c-ab1f-4c9a-a1ee-718e9357698b': '핀',
  }
  
  // 중복 API 호출 방지를 위한 ref
  const lastApiCallRef = useRef<{
    menuId: string | null
    currentPage: number
    appliedKeyword: string | undefined
    filterStatus: string
    filterRegion: string
    filterCategory: string
  } | null>(null)
  const isLoadingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // API에서 Live Space 리스트 불러오기 (재사용 가능하도록 외부 함수로 분리)
  const loadLiveSpaces = async (page: number = currentPage, skipDuplicateCheck: boolean = false) => {
    if (menuId !== 'live-space-list') {
      return
    }

    // 중복 체크 스킵이 아닌 경우에만 확인
    if (!skipDuplicateCheck) {
      // 이전 호출과 동일한 파라미터인지 확인
      if (
        lastApiCallRef.current &&
        lastApiCallRef.current.menuId === menuId &&
        lastApiCallRef.current.currentPage === page &&
        lastApiCallRef.current.appliedKeyword === appliedKeyword &&
        lastApiCallRef.current.filterStatus === filterStatus &&
        lastApiCallRef.current.filterRegion === filterRegion &&
        lastApiCallRef.current.filterCategory === filterCategory
      ) {
        return
      }
      
      // 이미 로딩 중이면 중복 호출 방지
      if (isLoadingRef.current) {
        return
      }
    }
    
    // 이전 요청이 있으면 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // 새로운 AbortController 생성
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // 현재 호출 정보 저장
    lastApiCallRef.current = {
      menuId,
      currentPage: page,
      appliedKeyword,
      filterStatus,
      filterRegion,
      filterCategory,
    }
    
    // 로딩 플래그 설정
    isLoadingRef.current = true

    try {
      setIsLoading(true)
      setLoadError(null)
      
      // API 파라미터 변환
      const apiStatus = filterStatus === 'all' ? undefined : filterStatus
      const apiRegion = filterRegion === 'all' ? undefined : filterRegion
      const apiCategory = filterCategory === 'all' ? undefined : filterCategory
      
      const response = await getLiveSpacesAdmin(page, 20, appliedKeyword, apiStatus, apiRegion, apiCategory)
      
      if (abortController.signal.aborted) {
        return
      }
      
      if (response.success && response.data) {
          // API 데이터를 LiveSpace 타입으로 변환
          const convertedSpaces: LiveSpace[] = response.data
            .filter(s => !s.deletedAt) // 삭제된 항목만 제외
            .map((s) => {
              // status 결정 (endsAt이 있고 현재 시간보다 이전이면 ended, 아니면 live)
              const now = new Date()
              const endsAt = s.endsAt ? new Date(s.endsAt) : null
              const status: 'live' | 'ended' = endsAt && endsAt < now ? 'ended' : 'live'
              
              // district 추출 (address에서)
              const district = s.address 
                ? (s.address.match(/(\S+구|\S+시|\S+군)/)?.[0] || '')
                : ''
              
              console.log('[LiveSpaceList] 카테고리 데이터 확인:', {
                id: s.id,
                categoryName: s.categoryName,
                title: s.title,
              })
              
              return {
                id: s.id,
                title: s.title || '',
                hostNickname: s.hostNickname || '알 수 없음',
                hostId: s.hostId,
                hostEmail: s.hostEmail,
                thumbnail: s.thumbnail,
                category: s.categoryName as LiveSpace['category'],
                status,
                createdAt: s.createdAt,
                startedAt: s.startsAt,
                endedAt: s.endsAt,
                scheduledStartTime: s.startsAt,
                scheduledEndTime: s.endsAt,
                location: {
                  lat: s.location.lat,
                  lng: s.location.lng,
                  address: s.address || s.placeName || '',
                  district,
                },
                checkInCount: s.participantCount,
                feedCount: s.feedCount,
                reportedCount: 0, // API에서 제공되지 않음
                isForceClosed: false, // API에서 제공되지 않음
                isHidden: false, // API에서 이미 displayStatus로 필터링했으므로 항상 false
                tags: s.tags || [], // API 응답의 tags 필드 사용
              }
            })
          
          console.log('[LiveSpaceList] API 데이터 변환 완료:', {
            originalCount: response.data.length,
            convertedCount: convertedSpaces.length,
            convertedSpaces: convertedSpaces.slice(0, 3), // 처음 3개만 로그
            timestamp: new Date().toISOString(),
          })
          
          setApiLiveSpaces(convertedSpaces)
          
        if (response.meta) {
          setPaginationMeta(response.meta)
        } else {
          setPaginationMeta(null)
        }
      } else {
        setLoadError(response.error || 'Live Space 리스트를 불러오는데 실패했습니다.')
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }
      if (!abortController.signal.aborted) {
        setLoadError(error instanceof Error ? error.message : 'Live Space 리스트를 불러오는 중 오류가 발생했습니다.')
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false)
        isLoadingRef.current = false
      }
    }
  }

  // menuId, currentPage, appliedKeyword, 필터 변경 시 로딩 상태 초기화 및 API 호출 (live-space-list만)
  useEffect(() => {
    // menuId가 변경되면 로딩 상태 초기화
    if (menuId !== 'live-space-list') {
      setIsLoading(false)
      isLoadingRef.current = false
      setLoadError(null)
      return
    }
    
    // live-space-list일 때만 API 호출
    loadLiveSpaces(currentPage)
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      isLoadingRef.current = false
    }
  }, [menuId, currentPage, appliedKeyword, filterStatus, filterRegion, filterCategory])
  
  // menuId, appliedKeyword, 필터 변경 시 첫 페이지로 리셋
  useEffect(() => {
    if (menuId === 'live-space-list') {
      // 검색어나 필터가 변경되면 첫 페이지로 리셋하고 API 다시 호출
      setCurrentPage(1)
      setPaginationMeta(null)
      setApiLiveSpaces([])
      lastApiCallRef.current = null
    }
    
    // menuId에 따라 초기 필터 설정
    if (menuId === 'live-space-force-close') {
      setFilterStatus('live') // 강제 종료 큐는 라이브 상태만
    } else if (menuId === 'live-space-reported') {
      setFilterStatus('all') // 신고된 스페이스는 모든 상태
    } else {
      setFilterStatus('all') // 전체 목록은 모든 상태
    }
  }, [menuId, appliedKeyword, filterStatus, filterRegion, filterCategory])
  
  const getTitle = () => {
    switch (menuId) {
      case 'live-space-list':
        return '전체 라이브 스페이스 목록'
      case 'live-space-force-close':
        return '강제 종료 큐'
      case 'live-space-reported':
        return '신고 접수된 스페이스'
      default:
        return '라이브 스페이스 목록'
    }
  }

  // 검색 버튼 클릭 핸들러
  const handleSearch = () => {
    const trimmedKeyword = searchKeyword.trim()
    setAppliedKeyword(trimmedKeyword || undefined)
    setCurrentPage(1) // 검색 시 첫 페이지로
  }
  
  // 취소 버튼 클릭 핸들러
  const handleCancelSearch = () => {
    setSearchKeyword('')
    setAppliedKeyword(undefined)
    setCurrentPage(1) // 취소 시 첫 페이지로
  }
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'forceClose' | 'hide' | 'forceTerminate' | 'delete' | null
    liveSpace: LiveSpace | null
  }>({
    isOpen: false,
    type: null,
    liveSpace: null,
  })
  
  const filteredLiveSpaces = useMemo(() => {
    // live-space-list는 API에서 필터링된 데이터를 그대로 사용
    if (menuId === 'live-space-list') {
      return apiLiveSpaces
    }
    
    // 다른 메뉴는 Mock 데이터 사용 및 클라이언트 사이드 필터링
    let filtered: LiveSpace[] = [...liveSpaces]
    
    // menuId에 따른 기본 필터
    if (menuId === 'live-space-force-close') {
      // 강제 종료 큐: 라이브 상태이면서 다음 중 하나:
      // 1. 신고가 3건 이상 (심각한 신고)
      // 2. 체크인이 0 (비정상적인 스페이스)
      // 3. 신고가 있고 체크인이 1 이하 (문제가 있는 스페이스)
      filtered = filtered.filter(ls => 
        ls.status === 'live' && (
          ls.reportedCount >= 3 || 
          ls.checkInCount === 0 ||
          (ls.reportedCount > 0 && ls.checkInCount <= 1)
        )
      )
    } else if (menuId === 'live-space-reported') {
      // 신고 접수된 스페이스: 신고가 있는 모든 스페이스 (라이브든 종료든 상관없이)
      filtered = filtered.filter(ls => ls.reportedCount > 0)
    }
    
    // 추가 필터 적용 (Mock 데이터 메뉴에만)
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ls => {
        if (filterStatus === 'live') return ls.status === 'live'
        if (filterStatus === 'ended') return ls.status === 'ended'
        if (filterStatus === 'force-closed') return ls.isForceClosed === true
        return true
      })
    }
    
    if (filterRegion !== 'all') {
      filtered = filtered.filter(ls => ls.location.district === filterRegion)
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(ls => ls.category === filterCategory)
    }
    
    // 검색어 필터링 (Mock 데이터 메뉴에만)
    if (appliedKeyword) {
      filtered = filtered.filter(ls => 
        ls.hostNickname.toLowerCase().includes(appliedKeyword.toLowerCase()) ||
        (ls.title && ls.title.toLowerCase().includes(appliedKeyword.toLowerCase()))
      )
    }
    
    return filtered
  }, [apiLiveSpaces, liveSpaces, filterStatus, filterRegion, filterCategory, appliedKeyword, menuId])

  const handleForceClose = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'forceClose',
      liveSpace,
    })
  }

  const handleForceTerminate = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'forceTerminate',
      liveSpace,
    })
  }

  const handleDelete = (liveSpace: LiveSpace) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      liveSpace,
    })
  }

  const handleEdit = (liveSpace: LiveSpace) => {
    setSelectedLiveSpace(liveSpace)
    
    // 날짜 형식 변환 (YYYY-MM-DDTHH:mm 형식으로)
    const formatDateTimeLocal = (dateString: string | undefined): string => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    setEditFormData({
      title: liveSpace.title || '',
      placeName: liveSpace.location?.address?.split(' ')[0] || '',
      description: '',
      category: liveSpace.category || '',
      scheduledStartTime: formatDateTimeLocal(liveSpace.startedAt || liveSpace.scheduledStartTime),
      scheduledEndTime: formatDateTimeLocal(liveSpace.endedAt || liveSpace.scheduledEndTime),
      address: liveSpace.location?.address || '',
      lat: liveSpace.location?.lat?.toString() || '',
      lng: liveSpace.location?.lng?.toString() || '',
      selectedTags: liveSpace.tags || [],
    })
    
    // 썸네일 초기화
    setThumbnailFile(null)
    setThumbnailPreview(liveSpace.thumbnail || null)
    
    setShowEditModal(true)
    setShowDetailModal(false)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
    setEditFormData(null)
    setThumbnailFile(null)
    setThumbnailPreview(null)
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
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null)
    setThumbnailPreview(null)
    // input 파일 선택 초기화
    const fileInput = document.getElementById('edit-thumbnail') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleDetail = (liveSpace: LiveSpace) => {
    setSelectedLiveSpace(liveSpace)
    setShowDetailModal(true)
  }

  const handleCloseDetailModal = () => {
    setShowDetailModal(false)
    setSelectedLiveSpace(null)
  }
  
  // 태그 목록 로드
  useEffect(() => {
    if (!showEditModal) return
    
    const loadTags = async () => {
      setIsLoadingTags(true)
      try {
        const result = await getTagsAdmin()
        if (result.success) {
          let tagsData: Tag[] = []
          const resultData = result.data as any
          if (Array.isArray(resultData)) {
            tagsData = resultData
          } else if (resultData && typeof resultData === 'object') {
            if (Array.isArray(resultData.tags)) {
              tagsData = resultData.tags
            } else if (Array.isArray(resultData.items)) {
              tagsData = resultData.items
            } else if (Array.isArray(resultData.list)) {
              tagsData = resultData.list
            } else if (Array.isArray(resultData.data)) {
              tagsData = resultData.data
            }
          }
          const activeTags = tagsData.filter((tag: Tag) => tag.isActive)
          setTags(activeTags)
        } else {
          setTags([])
        }
      } catch (error) {
        console.error('[LiveSpaceList] 태그 목록 로드 중 오류:', error)
        setTags([])
      } finally {
        setIsLoadingTags(false)
      }
    }
    
    loadTags()
  }, [showEditModal])

  const confirmAction = async () => {
    if (!modalState.liveSpace) return

    const targetId = modalState.liveSpace.id
    const actionType = modalState.type

    // 모달 먼저 닫기
    setModalState({ isOpen: false, type: null, liveSpace: null })

    if (actionType === 'forceClose') {
      updateLiveSpaces((prev) => {
        const updated = prev.map((ls) =>
          ls.id === targetId
            ? { ...ls, status: 'ended' as const, endedAt: new Date().toISOString(), isForceClosed: true }
            : ls
        )
        return updated
      })
      setTimeout(() => {
        alert('라이브 스페이스가 강제 종료되었습니다.')
      }, 100)
    } else if (actionType === 'forceTerminate') {
      // API 호출하여 강제 종료
      const result = await terminateLiveSpaceAdmin(targetId)
      
      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'live-space-list') {
          // 현재 페이지의 데이터 다시 로드 (중복 체크 스킵)
          await loadLiveSpaces(currentPage, true)
        } else {
          // Mock 데이터 업데이트
          updateLiveSpaces((prev) => prev.filter((ls) => ls.id !== targetId))
        }
        alert('라이브 스페이스가 강제 종료되었습니다.')
      } else {
        alert(`강제 종료 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } else if (actionType === 'delete') {
      // API 호출하여 삭제
      const result = await deleteLiveSpaceAdmin(targetId)
      
      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'live-space-list') {
          // 현재 페이지의 데이터 다시 로드 (중복 체크 스킵)
          await loadLiveSpaces(currentPage, true)
        } else {
          // Mock 데이터 업데이트
          updateLiveSpaces((prev) => prev.filter((ls) => ls.id !== targetId))
        }
        // 상세 모달도 닫기
        setShowDetailModal(false)
        setSelectedLiveSpace(null)
        alert('라이브 스페이스가 삭제되었습니다.')
      } else {
        alert(`삭제 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLiveSpace || !editFormData) return

    setIsSubmitting(true)

    try {
      // 날짜를 YYYY-MM-DDTHH:mm:ss 형식으로 변환
      const formatDateTime = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }

      // 썸네일 이미지가 있으면 먼저 업로드
      let thumbnailImageId: string | undefined = undefined
      if (thumbnailFile) {
        const uploadResult = await uploadLiveSpaceThumbnail(thumbnailFile)
        if (!uploadResult.success) {
          alert(uploadResult.error || '썸네일 이미지 업로드 중 오류가 발생했습니다.')
          setIsSubmitting(false)
          return
        }
        thumbnailImageId = uploadResult.thumbnailImageId
      }

      const updateData: UpdateLiveSpaceRequest = {
        title: editFormData.title,
        placeName: editFormData.placeName,
        address: editFormData.address,
        longitude: parseFloat(editFormData.lng),
        latitude: parseFloat(editFormData.lat),
        description: editFormData.description || undefined,
        startsAt: formatDateTime(new Date(editFormData.scheduledStartTime)),
        endsAt: formatDateTime(new Date(editFormData.scheduledEndTime)),
        ...(editFormData.category && { categoryId: categoryMap[editFormData.category] }),
        ...(thumbnailImageId && { thumbnailImageId: thumbnailImageId }),
        ...(editFormData.selectedTags.length > 0 && { tagNames: editFormData.selectedTags }),
      }

      const result = await updateLiveSpaceAdmin(selectedLiveSpace.id, updateData)

      if (result.success) {
        // API에서 데이터를 다시 불러옴
        if (menuId === 'live-space-list') {
          await loadLiveSpaces(currentPage, true)
        }
        setShowEditModal(false)
        setEditFormData(null)
        setThumbnailFile(null)
        setThumbnailPreview(null)
        alert('라이브 스페이스가 수정되었습니다.')
      } else {
        alert(`수정 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } catch (error) {
      console.error('라이브 스페이스 수정 오류:', error)
      alert('라이브 스페이스 수정 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editFormData) return
    const { name, value } = e.target
    setEditFormData(prev => prev ? ({
      ...prev,
      [name]: value,
    }) : null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <span className={`${styles.badge} ${styles.live}`}>Live</span>
      case 'ended':
        return <span className={`${styles.badge} ${styles.ended}`}>종료</span>
      default:
        return <span className={styles.badge}>-</span>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRemainingTime = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diff = now.getTime() - created.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분 경과`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getTitle()}</h1>
        {menuId === 'live-space-reported' && (
          <p className={styles.subtitle}>신고가 접수된 라이브 스페이스 목록입니다</p>
        )}
        {menuId === 'live-space-force-close' && (
          <p className={styles.subtitle}>강제 종료가 필요한 라이브 스페이스 목록입니다</p>
        )}
      </div>

      <div className={styles.content}>
        {loadError && (
          <div style={{ background: '#fee', color: '#c33', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px' }}>
            {loadError}
          </div>
        )}
        {isLoading && (
          <div style={{ background: '#e3f2fd', color: '#1976d2', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', textAlign: 'center' }}>
            Live Space 리스트를 불러오는 중...
          </div>
        )}
        {/* 필터 섹션 */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>상태</label>
            <select 
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="live">라이브</option>
              <option value="ended">종료</option>
              <option value="force-closed">강제 종료</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>지역</label>
            <select 
              className={styles.filterSelect}
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="강남구">강남구</option>
              <option value="마포구">마포구</option>
              <option value="중구">중구</option>
              <option value="송파구">송파구</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>카테고리</label>
            <select 
              className={styles.filterSelect}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="팝업">팝업</option>
              <option value="전시">전시</option>
              <option value="이벤트">이벤트</option>
              <option value="세일/혜택">세일/혜택</option>
              <option value="맛집">맛집</option>
              <option value="HENCE">HENCE</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>호스트 검색</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="닉네임 또는 제목 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={isLoading}
                style={{
                  padding: '8px 16px',
                  background: '#4a9eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? '검색 중...' : '검색'}
              </button>
              {appliedKeyword && (
                <button
                  type="button"
                  onClick={handleCancelSearch}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 테이블 (데스크탑) */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>썸네일</th>
                <th>이름</th>
                <th>호스트</th>
                <th>상태</th>
                <th>체크인 수</th>
                <th>태그</th>
                <th>카테고리</th>
                <th>시작 시간</th>
                <th>종료 시간</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredLiveSpaces.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    {(filterStatus !== 'all' || filterRegion !== 'all' || filterCategory !== 'all' || appliedKeyword) ? (
                      '리스트가 없습니다.'
                    ) : (
                      menuId === 'live-space-force-close' 
                        ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                        : menuId === 'live-space-reported'
                        ? '신고 접수된 라이브 스페이스가 없습니다.'
                        : '조건에 맞는 라이브 스페이스가 없습니다.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredLiveSpaces.map((ls) => (
                  <tr key={ls.id}>
                    <td>
                      <div className={styles.thumbnail}>
                        {ls.thumbnail ? (
                          <img src={ls.thumbnail} alt={ls.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>
                            {ls.hostNickname[0]}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                        {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                          <span className={styles.reportedCountBadge}>
                            신고 {ls.reportedCount}건
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.hostCell}>
                        <span className={styles.hostName}>{ls.hostNickname}</span>
                        <span className={styles.activityScore}>활동지수: 85</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(ls.status)}</td>
                    <td>
                      {ls.checkInCount}
                      {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                        <span className={styles.warningBadge}>⚠️</span>
                      )}
                    </td>
                    <td>
                      {ls.tags && ls.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {ls.tags.map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                backgroundColor: '#e6f2ff',
                                color: '#4a9eff',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 500,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {ls.category ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#f0f0f0',
                            color: '#333',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          {ls.category}
                        </span>
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {ls.startedAt || ls.scheduledStartTime ? formatDate(ls.startedAt || ls.scheduledStartTime!) : '-'}
                      {ls.status === 'live' && (ls.startedAt || ls.scheduledStartTime) && (
                        <div className={styles.timeInfo}>
                          {getRemainingTime(ls.startedAt || ls.scheduledStartTime || ls.createdAt)}
                        </div>
                      )}
                    </td>
                    <td>
                      {ls.endedAt ? formatDate(ls.endedAt) : '-'}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDetail(ls)}
                        >
                          상세
                        </button>
                        {menuId === 'live-space-list' ? (
                          <>
                            <button 
                              className={styles.actionBtn}
                              onClick={() => handleEdit(ls)}
                              style={{
                                background: '#4a9eff',
                                color: '#fff',
                                border: 'none',
                              }}
                            >
                              수정
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.danger}`}
                              onClick={() => handleForceTerminate(ls)}
                            >
                              강제종료
                            </button>
                            <button 
                              className={`${styles.actionBtn} ${styles.danger}`}
                              onClick={() => handleDelete(ls)}
                            >
                              삭제
                            </button>
                          </>
                        ) : ls.status === 'live' ? (
                          // 다른 메뉴는 Mock 데이터용 강제종료 사용
                          <button 
                            className={`${styles.actionBtn} ${styles.danger}`}
                            onClick={() => handleForceClose(ls)}
                          >
                            강제종료
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 카드 리스트 (모바일) */}
        <div className={styles.cardList}>
          {filteredLiveSpaces.length === 0 ? (
            <div className={styles.emptyCard}>
              {(filterStatus !== 'all' || filterRegion !== 'all' || appliedKeyword) ? (
                '리스트가 없습니다.'
              ) : (
                menuId === 'live-space-force-close' 
                  ? '강제 종료가 필요한 라이브 스페이스가 없습니다.'
                  : menuId === 'live-space-reported'
                  ? '신고 접수된 라이브 스페이스가 없습니다.'
                  : '조건에 맞는 라이브 스페이스가 없습니다.'
              )}
            </div>
          ) : (
            filteredLiveSpaces.map((ls) => (
              <div key={ls.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardThumbnail}>
                    {ls.thumbnail ? (
                      <img src={ls.thumbnail} alt={ls.title} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        {ls.hostNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={styles.cardTitleSection}>
                    <div className={styles.cardTitle}>
                      {ls.title || `${ls.hostNickname}의 라이브스페이스`}
                      {(menuId === 'live-space-reported' || menuId === 'live-space-force-close') && ls.reportedCount > 0 && (
                        <span className={styles.reportedCountBadge}>
                          신고 {ls.reportedCount}건
                        </span>
                      )}
                    </div>
                    <div className={styles.cardHost}>
                      {ls.hostNickname}
                      <span className={styles.cardActivityScore}> · 활동지수: 85</span>
                    </div>
                  </div>
                  <div className={styles.cardStatus}>
                    {getStatusBadge(ls.status)}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>체크인 수</span>
                      <span className={styles.cardInfoValue}>
                        {ls.checkInCount}
                        {menuId === 'live-space-force-close' && ls.checkInCount === 0 && (
                          <span className={styles.warningBadge}>⚠️</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>태그</span>
                      <span className={styles.cardInfoValue}>
                        {ls.tags && ls.tags.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {ls.tags.map((tag, index) => (
                              <span
                                key={index}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  backgroundColor: '#e6f2ff',
                                  color: '#4a9eff',
                                  borderRadius: '12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>카테고리</span>
                      <span className={styles.cardInfoValue}>
                        {ls.category ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              backgroundColor: '#f0f0f0',
                              color: '#333',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 500,
                            }}
                          >
                            {ls.category}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>-</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>시작 시간</span>
                      <span className={styles.cardInfoValue}>
                        {ls.startedAt || ls.scheduledStartTime ? formatDate(ls.startedAt || ls.scheduledStartTime!) : '-'}
                      </span>
                    </div>
                    <div className={styles.cardInfoItem}>
                      <span className={styles.cardInfoLabel}>
                        {ls.status === 'live' ? '경과 시간' : '종료 시간'}
                      </span>
                      <span className={styles.cardInfoValue}>
                        {ls.status === 'live' && (ls.startedAt || ls.scheduledStartTime) ? (
                          <span className={styles.remainingTime}>
                            {getRemainingTime(ls.startedAt || ls.scheduledStartTime || ls.createdAt)}
                          </span>
                        ) : ls.endedAt ? (
                          formatDate(ls.endedAt)
                        ) : (
                          '-'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button 
                    className={styles.actionBtn}
                    onClick={() => handleDetail(ls)}
                  >
                    상세
                  </button>
                  {menuId === 'live-space-list' ? (
                    <>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleEdit(ls)}
                        style={{
                          background: '#4a9eff',
                          color: '#fff',
                          border: 'none',
                        }}
                      >
                        수정
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => handleForceTerminate(ls)}
                      >
                        강제종료
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => handleDelete(ls)}
                      >
                        삭제
                      </button>
                    </>
                  ) : ls.status === 'live' ? (
                    // 다른 메뉴는 Mock 데이터용 강제종료 사용
                    <button 
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => handleForceClose(ls)}
                    >
                      강제종료
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이징 버튼 */}
        {menuId === 'live-space-list' && paginationMeta && paginationMeta.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationNavButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!paginationMeta.hasPrevious || isLoading}
            >
              ‹
            </button>
            <div className={styles.paginationNumbers}>
              {(() => {
                const pages: (number | string)[] = []
                const totalPages = paginationMeta.totalPages
                const current = paginationMeta.currentPage
                const maxVisible = 5 // 최대 표시할 페이지 수
                
                if (totalPages <= maxVisible) {
                  // 전체 페이지가 5개 이하면 모두 표시
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i)
                  }
                } else {
                  // 첫 페이지
                  pages.push(1)
                  
                  if (current <= 3) {
                    // 현재 페이지가 앞쪽에 있으면
                    for (let i = 2; i <= 4; i++) {
                      pages.push(i)
                    }
                    pages.push('...')
                    pages.push(totalPages)
                  } else if (current >= totalPages - 2) {
                    // 현재 페이지가 뒤쪽에 있으면
                    pages.push('...')
                    for (let i = totalPages - 3; i <= totalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    // 현재 페이지가 중간에 있으면
                    pages.push('...')
                    for (let i = current - 1; i <= current + 1; i++) {
                      pages.push(i)
                    }
                    pages.push('...')
                    pages.push(totalPages)
                  }
                }
                
                return pages.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={page}
                      className={`${styles.paginationNumberButton} ${current === page ? styles.active : ''}`}
                      onClick={() => setCurrentPage(page as number)}
                      disabled={isLoading}
                    >
                      {page}
                    </button>
                  )
                })
              })()}
            </div>
            <button
              className={styles.paginationNavButton}
              onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
              disabled={!paginationMeta.hasNext || isLoading}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Live Space 상세 정보 Modal */}
      {showDetailModal && selectedLiveSpace && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCloseDetailModal}
        >
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailModalHeader}>
              <h3 className={styles.detailModalTitle}>Live Space 상세 정보</h3>
              <button 
                className={styles.detailModalClose}
                onClick={handleCloseDetailModal}
              >
                ×
              </button>
            </div>
            <div className={styles.detailModalBody}>
              {/* 썸네일 섹션 */}
              {selectedLiveSpace.thumbnail && (
                <div className={styles.detailThumbnailSection}>
                  <div className={styles.detailThumbnail}>
                    <img 
                      src={selectedLiveSpace.thumbnail} 
                      alt={selectedLiveSpace.title}
                    />
                  </div>
                </div>
              )}
              
              {/* 정보 그리드 (2열) */}
              <div className={styles.detailInfoGrid}>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>ID</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.id}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>제목</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.title}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>호스트 ID</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.hostId}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>호스트 닉네임</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.hostNickname || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>카테고리</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.category || '-'}</span>
                </div>
                <div className={`${styles.detailInfoItem} ${styles.detailInfoItemFull}`}>
                  <span className={styles.detailInfoLabel}>주소</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.location?.address || '-'}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>위도</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.lat?.toFixed(6) || '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>경도</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.lng?.toFixed(6) || '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>시작 시간</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.startedAt || selectedLiveSpace.scheduledStartTime ? formatDate(selectedLiveSpace.startedAt || selectedLiveSpace.scheduledStartTime!) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>종료 시간</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.endedAt || selectedLiveSpace.scheduledEndTime ? formatDate(selectedLiveSpace.endedAt || selectedLiveSpace.scheduledEndTime!) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>피드 수</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.feedCount || 0}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>참가자 수</span>
                  <span className={styles.detailInfoValue}>{selectedLiveSpace.checkInCount || 0}</span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>상태</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.status === 'live' ? '라이브' : '종료'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>생성일</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.createdAt ? formatDate(selectedLiveSpace.createdAt) : '-'}
                  </span>
                </div>
                <div className={styles.detailInfoItem}>
                  <span className={styles.detailInfoLabel}>지역</span>
                  <span className={styles.detailInfoValue}>
                    {selectedLiveSpace.location?.district || '-'}
                  </span>
                </div>
                {selectedLiveSpace.isForceClosed && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>강제 종료</span>
                    <span className={styles.detailInfoValue}>예</span>
                  </div>
                )}
                {selectedLiveSpace.isHidden && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>숨김</span>
                    <span className={styles.detailInfoValue}>예</span>
                  </div>
                )}
                {selectedLiveSpace.reportedCount > 0 && (
                  <div className={styles.detailInfoItem}>
                    <span className={styles.detailInfoLabel}>신고 건수</span>
                    <span className={styles.detailInfoValue}>{selectedLiveSpace.reportedCount}건</span>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.detailModalFooter}>
              <button
                className={styles.detailModalButton}
                onClick={handleCloseDetailModal}
              >
                닫기
              </button>
              {menuId === 'live-space-list' && (
                <>
                  <button
                    className={styles.detailModalButton}
                    onClick={() => handleEdit(selectedLiveSpace)}
                    style={{
                      background: '#4a9eff',
                      color: '#fff',
                      border: 'none',
                    }}
                  >
                    수정
                  </button>
                  <button
                    className={`${styles.detailModalButton} ${styles.danger}`}
                    onClick={() => handleDelete(selectedLiveSpace)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Space 수정 Modal */}
      {showEditModal && selectedLiveSpace && editFormData && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCloseEditModal}
        >
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.detailModalHeader}>
              <h3 className={styles.detailModalTitle}>Live Space 수정</h3>
              <button 
                className={styles.detailModalClose}
                onClick={handleCloseEditModal}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className={styles.detailModalBody} style={{ padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      제목 <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditInputChange}
                      required
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      장소명 <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="placeName"
                      value={editFormData.placeName}
                      onChange={handleEditInputChange}
                      required
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      카테고리
                    </label>
                    <select
                      name="category"
                      value={editFormData.category}
                      onChange={handleEditInputChange}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        background: '#fff',
                      }}
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

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      설명
                    </label>
                    <textarea
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditInputChange}
                      disabled={isSubmitting}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                        시작 시간 <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="scheduledStartTime"
                        value={editFormData.scheduledStartTime}
                        onChange={handleEditInputChange}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                        종료 시간 <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="scheduledEndTime"
                        value={editFormData.scheduledEndTime}
                        onChange={handleEditInputChange}
                        required
                        disabled={isSubmitting}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      주소 <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditInputChange}
                      required
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                        위도 <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="number"
                        name="lat"
                        value={editFormData.lat}
                        onChange={handleEditInputChange}
                        required
                        disabled={isSubmitting}
                        step="any"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                        경도 <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="number"
                        name="lng"
                        value={editFormData.lng}
                        onChange={handleEditInputChange}
                        required
                        disabled={isSubmitting}
                        step="any"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      태그
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
                              border: editFormData.selectedTags.includes(tag.name)
                                ? '2px solid #4a9eff'
                                : '1px solid #ddd',
                              borderRadius: '20px',
                              backgroundColor: editFormData.selectedTags.includes(tag.name)
                                ? '#e6f2ff'
                                : '#f5f5f5',
                              cursor: isSubmitting ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: editFormData.selectedTags.includes(tag.name) ? 500 : 400,
                              color: editFormData.selectedTags.includes(tag.name) ? '#4a9eff' : '#333',
                              opacity: isSubmitting ? 0.6 : 1,
                              transition: 'all 0.2s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editFormData.selectedTags.includes(tag.name)}
                              onChange={(e) => {
                                if (isSubmitting) return
                                if (e.target.checked) {
                                  setEditFormData(prev => prev ? ({
                                    ...prev,
                                    selectedTags: [...prev.selectedTags, tag.name]
                                  }) : null)
                                } else {
                                  setEditFormData(prev => prev ? ({
                                    ...prev,
                                    selectedTags: prev.selectedTags.filter(name => name !== tag.name)
                                  }) : null)
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
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      썸네일 이미지
                    </label>
                    {!thumbnailPreview ? (
                      <div style={{
                        position: 'relative',
                        border: '2px dashed #ddd',
                        borderRadius: '8px',
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: '#fafafa',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.currentTarget.style.borderColor = '#4a9eff'
                          e.currentTarget.style.backgroundColor = '#f0f7ff'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#ddd'
                        e.currentTarget.style.backgroundColor = '#fafafa'
                      }}
                      >
                        <input
                          id="edit-thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          disabled={isSubmitting}
                          style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            padding: 0,
                            margin: -1,
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                            border: 0,
                          }}
                        />
                        <label
                          htmlFor="edit-thumbnail"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span style={{ fontSize: '32px' }}>📷</span>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>이미지 파일 선택</span>
                          <span style={{ fontSize: '12px', color: '#999' }}>(최대 5MB)</span>
                        </label>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: '400px',
                          height: '300px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f5f5f5',
                        }}>
                          <img
                            src={thumbnailPreview}
                            alt="썸네일 미리보기"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveThumbnail}
                            disabled={isSubmitting}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'rgba(0, 0, 0, 0.6)',
                              color: '#fff',
                              border: 'none',
                              cursor: isSubmitting ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '18px',
                              lineHeight: 1,
                              transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubmitting) {
                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        {thumbnailFile && (
                          <div style={{
                            fontSize: '13px',
                            color: '#666',
                            padding: '8px 12px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                          }}>
                            {thumbnailFile.name} ({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleRemoveThumbnail}
                          disabled={isSubmitting}
                          style={{
                            padding: '8px 16px',
                            background: '#fff',
                            color: '#4a9eff',
                            border: '1px solid #4a9eff',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            alignSelf: 'flex-start',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubmitting) {
                              e.currentTarget.style.background = '#4a9eff'
                              e.currentTarget.style.color = '#fff'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff'
                            e.currentTarget.style.color = '#4a9eff'
                          }}
                        >
                          다른 이미지 선택
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.detailModalFooter}>
                <button
                  type="button"
                  className={styles.detailModalButton}
                  onClick={handleCloseEditModal}
                  disabled={isSubmitting}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className={styles.detailModalButton}
                  disabled={isSubmitting}
                  style={{ background: '#4a9eff' }}
                >
                  {isSubmitting ? '수정 중...' : '수정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, type: null, liveSpace: null })}
        title={
          modalState.type === 'forceClose'
            ? '라이브 스페이스 강제 종료'
            : modalState.type === 'forceTerminate'
            ? '라이브 스페이스 강제 종료'
            : modalState.type === 'delete'
            ? '라이브 스페이스 삭제'
            : '라이브 스페이스 강제 종료'
        }
        message={
          modalState.type === 'forceClose'
            ? `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 강제 종료하시겠습니까?\n\n해당 스페이스는 즉시 종료됩니다.\n사용자에게 '운영정책 위반으로 종료' 안내가 발송됩니다.`
            : modalState.type === 'delete'
            ? `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 삭제하시겠습니까?\n\n해당 스페이스는 영구적으로 삭제됩니다.`
            : `"${modalState.liveSpace?.title || modalState.liveSpace?.hostNickname + '의 라이브스페이스'}"를 강제 종료하시겠습니까?\n\n해당 스페이스는 삭제됩니다.`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}

