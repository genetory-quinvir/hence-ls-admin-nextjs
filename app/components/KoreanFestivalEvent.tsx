'use client'

import { useState, useEffect, useMemo } from 'react'
import { createLiveSpaceAdmin, CreateLiveSpaceRequest, uploadLiveSpaceThumbnail } from '../lib/api'
import Modal from './Modal'
import styles from './KoreanFestivalEvent.module.css'

// 축제/행사 데이터 타입
interface FestivalEvent {
  id: string
  title: string
  description?: string
  location: string
  address?: string
  startDate: string
  endDate?: string
  latitude?: number
  longitude?: number
  imageUrl?: string
  homepage?: string
  contact?: string
}

interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  hasNext: boolean
  hasPrevious: boolean
}

export default function KoreanFestivalEvent() {
  const [festivals, setFestivals] = useState<FestivalEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFestival, setSelectedFestival] = useState<FestivalEvent | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null)
  const [sortField, setSortField] = useState<'title' | 'location' | 'startDate' | 'endDate' | null>(null)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const itemsPerPage = 20 // 페이지당 항목 수
  
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

  // 축제/행사 데이터 로드
  const loadFestivals = async (page: number = 1) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 내부 API Route를 통해 축제/행사 데이터 가져오기
      const response = await fetch(`/api/v1/festivals?numOfRows=${itemsPerPage}&pageNo=${page}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '축제/행사 데이터를 불러오는데 실패했습니다.')
      }

      const totalCount = result.totalCount || 0
      const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage)) // 최소 1페이지는 보장

      console.log('✅ 축제/행사 데이터 로드 성공:', {
        count: result.data?.length || 0,
        totalCount,
        totalPages,
        currentPage: page,
        timestamp: new Date().toISOString(),
      })

      setFestivals(result.data || [])
      setPaginationMeta({
        currentPage: page,
        totalPages,
        totalCount,
        itemsPerPage,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      })
    } catch (err) {
      console.error('❌ 축제/행사 데이터 로드 오류:', err)
      setError(err instanceof Error ? err.message : '축제/행사 데이터를 불러오는 중 오류가 발생했습니다.')
      setFestivals([]) // 오류 시 빈 배열로 설정
      setPaginationMeta(null)
    } finally {
      setIsLoading(false)
    }
  }

  // 정렬 핸들러
  const handleSort = (field: 'title' | 'location' | 'startDate' | 'endDate') => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 정렬 순서 토글
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      // 다른 필드를 클릭하면 해당 필드로 정렬 (기본 오름차순)
      setSortField(field)
      setSortOrder('ASC')
    }
  }

  // 정렬된 축제 리스트
  const sortedFestivals = useMemo(() => {
    if (!sortField) return festivals

    return [...festivals].sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sortField === 'title') {
        aValue = a.title || ''
        bValue = b.title || ''
      } else if (sortField === 'location') {
        aValue = a.location || ''
        bValue = b.location || ''
      } else if (sortField === 'startDate') {
        aValue = new Date(a.startDate).getTime()
        bValue = new Date(b.startDate).getTime()
      } else if (sortField === 'endDate') {
        aValue = a.endDate ? new Date(a.endDate).getTime() : 0
        bValue = b.endDate ? new Date(b.endDate).getTime() : 0
      }

      if (aValue < bValue) {
        return sortOrder === 'ASC' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortOrder === 'ASC' ? 1 : -1
      }
      return 0
    })
  }, [festivals, sortField, sortOrder])

  // currentPage 변경 시 데이터 다시 로드
  useEffect(() => {
    loadFestivals(currentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  const handleCreateLiveSpace = async (festival: FestivalEvent) => {
    setSelectedFestival(festival)
    setShowCreateModal(true)
  }

  const confirmCreateLiveSpace = async () => {
    if (!selectedFestival) return

    setIsCreating(true)
    
    try {
      // 썸네일 이미지 업로드 (있는 경우)
      // 우리나라 축제/행사는 Admin API를 사용하며 Official 계정으로 생성됨
      // 자동화 기능과 달리 자동 회원가입을 사용하지 않음 (useAutoRegistration = false)
      let thumbnailImageId: string | undefined = undefined
      
      if (selectedFestival.imageUrl) {
        console.log('📤 축제 썸네일 이미지 처리 시작:', {
          imageUrl: selectedFestival.imageUrl,
        })
        
        try {
          // 서버 사이드에서 외부 이미지 다운로드 (CORS 문제 해결)
          const downloadResponse = await fetch('/api/v1/festivals/download-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageUrl: selectedFestival.imageUrl }),
          })

          if (downloadResponse.ok) {
            const downloadResult = await downloadResponse.json()
            
            if (downloadResult.success && downloadResult.data) {
              // Base64를 Blob으로 변환
              const base64Data = downloadResult.data.base64
              const contentType = downloadResult.data.contentType || 'image/jpeg'
              const byteCharacters = atob(base64Data)
              const byteNumbers = new Array(byteCharacters.length)
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i)
              }
              const byteArray = new Uint8Array(byteNumbers)
              const blob = new Blob([byteArray], { type: contentType })
              const imageFile = new File([blob], downloadResult.data.fileName || 'festival-image.jpg', { type: contentType })
              
              console.log('✅ 축제 이미지 다운로드 성공:', {
                fileName: imageFile.name,
                size: imageFile.size,
                type: imageFile.type,
              })
              
              // Admin API 사용 (Official 계정 사용, 자동 회원가입 안 함)
              const uploadResult = await uploadLiveSpaceThumbnail(imageFile, false)
              if (uploadResult.success && uploadResult.thumbnailImageId) {
                thumbnailImageId = uploadResult.thumbnailImageId
                console.log('✅ 축제 썸네일 업로드 성공:', {
                  thumbnailImageId,
                })
              } else {
                console.error('❌ 축제 썸네일 업로드 실패:', {
                  error: uploadResult.error,
                  success: uploadResult.success,
                })
                // 이미지 업로드 실패 시에도 계속 진행 (썸네일 없이 생성)
              }
            } else {
              console.error('❌ 축제 이미지 다운로드 결과 오류:', {
                success: downloadResult.success,
                error: downloadResult.error,
              })
            }
          } else {
            const errorText = await downloadResponse.text().catch(() => '')
            console.error('❌ 축제 이미지 다운로드 실패:', {
              status: downloadResponse.status,
              statusText: downloadResponse.statusText,
              error: errorText,
            })
          }
        } catch (uploadError) {
          console.error('❌ 축제 썸네일 이미지 처리 예외:', {
            error: uploadError,
            message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          })
          // 이미지 업로드 실패해도 계속 진행 (썸네일 없이 생성)
        }
      } else {
        console.log('ℹ️ 축제 이미지 URL이 없어 썸네일을 건너뜁니다.')
      }

      // 날짜 형식 변환 (YYYY-MM-DDTHH:mm:ss)
      const formatDateTime = (dateString: string): string => {
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
      }

      // 라이브 스페이스 생성 요청 데이터
      // 카테고리는 "이벤트"로 고정
      // 축제 데이터의 시작일과 종료일을 그대로 사용
      const requestData: CreateLiveSpaceRequest = {
        title: selectedFestival.title,
        placeName: selectedFestival.location,
        address: selectedFestival.address || selectedFestival.location,
        longitude: selectedFestival.longitude || 127.0276, // 기본값: 서울
        latitude: selectedFestival.latitude || 37.4979,
        description: selectedFestival.description || '',
        startsAt: formatDateTime(selectedFestival.startDate),
        endsAt: selectedFestival.endDate ? formatDateTime(selectedFestival.endDate) : formatDateTime(selectedFestival.startDate), // 종료일이 없으면 시작일과 동일하게 설정
        categoryId: categoryMap['이벤트'], // 축제/행사는 이벤트 카테고리로 고정
      }

      // 썸네일 이미지 ID가 있으면 반드시 포함
      if (thumbnailImageId) {
        requestData.thumbnailImageId = thumbnailImageId
        console.log('✅ 썸네일 이미지 ID 포함:', {
          thumbnailImageId,
        })
      } else {
        console.warn('⚠️ 썸네일 이미지 ID가 없습니다. (이미지 URL:', selectedFestival.imageUrl, ')')
      }

      console.log('📤 축제 라이브 스페이스 생성 요청:', {
        title: requestData.title,
        hasThumbnailImageId: !!thumbnailImageId,
        thumbnailImageId,
        startsAt: requestData.startsAt,
        endsAt: requestData.endsAt,
      })

      // Admin API 사용 (Official 계정으로 생성)
      const result = await createLiveSpaceAdmin(requestData)

      if (result.success) {
        alert('라이브 스페이스가 성공적으로 생성되었습니다.')
        setShowCreateModal(false)
        setSelectedFestival(null)
      } else {
        alert(`라이브 스페이스 생성 실패: ${result.error || '알 수 없는 오류가 발생했습니다.'}`)
      }
    } catch (error) {
      console.error('라이브 스페이스 생성 오류:', error)
      alert('라이브 스페이스 생성 중 오류가 발생했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>우리나라 축제/행사</h1>
        <p className={styles.subtitle}>외부 축제/행사 데이터를 라이브 스페이스로 생성할 수 있습니다.</p>
      </div>

      <div className={styles.content}>
        {error && (
          <div style={{ background: '#fee', color: '#c33', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px' }}>
            {error}
          </div>
        )}
        
        {isLoading && (
          <div style={{ background: '#e3f2fd', color: '#1976d2', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', textAlign: 'center' }}>
            축제/행사 데이터를 불러오는 중...
          </div>
        )}

        {!isLoading && festivals.length === 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>썸네일</th>
                  <th>축제/행사명</th>
                  <th>장소</th>
                  <th>시작일</th>
                  <th>종료일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    축제/행사 데이터가 없습니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>썸네일</th>
                  <th>
                    <button 
                      className={styles.sortableHeader}
                      onClick={() => handleSort('title')}
                    >
                      축제/행사명
                      {sortField === 'title' && (
                        <span className={styles.sortIcon}>
                          {sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button 
                      className={styles.sortableHeader}
                      onClick={() => handleSort('location')}
                    >
                      장소
                      {sortField === 'location' && (
                        <span className={styles.sortIcon}>
                          {sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button 
                      className={styles.sortableHeader}
                      onClick={() => handleSort('startDate')}
                    >
                      시작일
                      {sortField === 'startDate' && (
                        <span className={styles.sortIcon}>
                          {sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button 
                      className={styles.sortableHeader}
                      onClick={() => handleSort('endDate')}
                    >
                      종료일
                      {sortField === 'endDate' && (
                        <span className={styles.sortIcon}>
                          {sortOrder === 'ASC' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  </th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedFestivals.map((festival) => (
                  <tr key={festival.id}>
                    <td>
                      <div className={styles.thumbnailCell}>
                        {festival.imageUrl ? (
                          <img 
                            src={festival.imageUrl} 
                            alt={festival.title}
                            className={styles.thumbnailImage}
                            onError={(e) => {
                              // 이미지 로드 실패 시 placeholder 표시
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              if (target.parentElement) {
                                target.parentElement.innerHTML = '<div class="' + styles.thumbnailPlaceholder + '">📷</div>'
                              }
                            }}
                          />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>📷</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.titleCell}>
                        {festival.title}
                      </div>
                      {festival.description && (
                        <div className={styles.descriptionText}>
                          {festival.description.length > 50
                            ? `${festival.description.substring(0, 50)}...`
                            : festival.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.locationCell}>
                        {festival.location}
                      </div>
                      {festival.address && (
                        <div className={styles.addressText}>
                          {festival.address}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(festival.startDate)}</td>
                    <td>{festival.endDate ? formatDate(festival.endDate) : '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => handleCreateLiveSpace(festival)}
                          className={`${styles.actionBtn} ${styles.primary}`}
                        >
                          생성
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 페이징 버튼 */}
        {paginationMeta && paginationMeta.totalPages > 1 && (
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

      {/* 생성 확인 모달 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          if (!isCreating) {
            setShowCreateModal(false)
            setSelectedFestival(null)
          }
        }}
        title="라이브 스페이스 생성 확인"
        message={
          selectedFestival
            ? `"${selectedFestival.title}" 축제/행사를 라이브 스페이스로 생성하시겠습니까?\n\n장소: ${selectedFestival.location}\n시작: ${formatDate(selectedFestival.startDate)}`
            : ''
        }
        confirmText="생성"
        cancelText="취소"
        onConfirm={confirmCreateLiveSpace}
        type="info"
      />
    </div>
  )
}

