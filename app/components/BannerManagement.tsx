'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getFeaturedBannersAdmin,
  createFeaturedBannerAdmin,
  updateFeaturedBannerAdmin,
  deleteFeaturedBannerAdmin,
  uploadFeaturedBannerThumbnail,
  getTagsAdmin,
  FeaturedBanner,
  FeaturedBannerListMeta,
  Tag,
} from '../lib/api'
import Modal from './Modal'
import styles from './BannerManagement.module.css'

interface BannerFormData {
  title: string
  subtitle: string
  order: number
  selectedTags: string[]  // 선택된 태그 이름 배열
  isActive: boolean
  thumbnailImageId: string
}

const initialFormData: BannerFormData = {
  title: '',
  subtitle: '',
  order: 0,
  selectedTags: [],
  isActive: true,
  thumbnailImageId: '',
}

export default function BannerManagement() {
  const [banners, setBanners] = useState<FeaturedBanner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [paginationMeta, setPaginationMeta] = useState<FeaturedBannerListMeta | null>(null)
  
  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<FeaturedBanner | null>(null)
  const [formData, setFormData] = useState<BannerFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 이미지 업로드 상태
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  
  // 태그 상태
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // 태그 목록 불러오기
  const loadTags = useCallback(async () => {
    setIsLoadingTags(true)
    try {
      const response = await getTagsAdmin()
      console.log('[BannerManagement] 태그 응답:', response)
      
      if (response.success && response.data) {
        // 응답 데이터가 배열인지 확인
        let tagsArray: Tag[] = []
        const responseData = response.data as any
        
        if (Array.isArray(responseData)) {
          tagsArray = responseData
        } else if (responseData.data && Array.isArray(responseData.data)) {
          // { data: { data: [...] } } 구조인 경우
          tagsArray = responseData.data
        } else if (responseData.tags && Array.isArray(responseData.tags)) {
          // { data: { tags: [...] } } 구조인 경우
          tagsArray = responseData.tags
        }
        
        // 활성화된 태그만 필터링
        const activeTags = tagsArray.filter((tag: Tag) => tag.isActive)
        setAvailableTags(activeTags)
      }
    } catch (error) {
      console.error('태그 목록 로드 오류:', error)
    } finally {
      setIsLoadingTags(false)
    }
  }, [])

  // 컴포넌트 마운트 시 태그 로드
  useEffect(() => {
    loadTags()
  }, [loadTags])

  // 배너 목록 불러오기
  const loadBanners = useCallback(async (page: number) => {
    setIsLoading(true)
    setLoadError(null)
    
    try {
      const response = await getFeaturedBannersAdmin(page, 20)
      
      if (response.success && response.data) {
        setBanners(response.data)
        if (response.meta) {
          setPaginationMeta(response.meta)
        }
      } else {
        setLoadError(response.error || '배너 목록을 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('배너 목록 로드 오류:', error)
      setLoadError('배너 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBanners(currentPage)
  }, [currentPage, loadBanners])

  // 폼 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (name === 'order') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 태그 선택/해제 핸들러
  const handleTagToggle = (tagName: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedTags.includes(tagName)
      if (isSelected) {
        return {
          ...prev,
          selectedTags: prev.selectedTags.filter(t => t !== tagName)
        }
      } else {
        return {
          ...prev,
          selectedTags: [...prev.selectedTags, tagName]
        }
      }
    })
  }

  // 이미지 파일 선택 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      
      // 미리보기 설정
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // 이미지 업로드
      setIsUploadingImage(true)
      try {
        const uploadResult = await uploadFeaturedBannerThumbnail(file)
        if (uploadResult.success && uploadResult.imageId) {
          setFormData(prev => ({ ...prev, thumbnailImageId: uploadResult.imageId! }))
        } else {
          alert(`이미지 업로드 실패: ${uploadResult.error}`)
          setImageFile(null)
          setImagePreview(null)
        }
      } catch (error) {
        console.error('이미지 업로드 오류:', error)
        alert('이미지 업로드 중 오류가 발생했습니다.')
        setImageFile(null)
        setImagePreview(null)
      } finally {
        setIsUploadingImage(false)
      }
    }
  }

  // 이미지 제거 핸들러
  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, thumbnailImageId: '' }))
  }

  // 배너 이미지 URL 가져오기
  const getBannerImageUrl = (banner: FeaturedBanner): string => {
    if (banner.thumbnailImage) {
      return banner.thumbnailImage.cdnUrl || 
             banner.thumbnailImage.thumbnailUrl || 
             banner.thumbnailImage.fileUrl || 
             'https://via.placeholder.com/800x400?text=No+Image'
    }
    return 'https://via.placeholder.com/800x400?text=No+Image'
  }

  // 생성 모달 열기
  const handleCreate = () => {
    setFormData(initialFormData)
    setImageFile(null)
    setImagePreview(null)
    setShowCreateModal(true)
  }

  // 수정 모달 열기
  const handleEdit = (banner: FeaturedBanner) => {
    setSelectedBanner(banner)
    // 태그 문자열을 배열로 변환
    const tagArray = banner.tags 
      ? banner.tags.split(',').map(t => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      : []
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      order: banner.order,
      selectedTags: tagArray,
      isActive: banner.isActive,
      thumbnailImageId: banner.thumbnailImage?.id || '',
    })
    setImagePreview(getBannerImageUrl(banner))
    setImageFile(null)
    setShowEditModal(true)
  }

  // 상세 모달 열기
  const handleDetail = (banner: FeaturedBanner) => {
    setSelectedBanner(banner)
    setShowDetailModal(true)
  }

  // 삭제 모달 열기
  const handleDelete = (banner: FeaturedBanner) => {
    setSelectedBanner(banner)
    setShowDeleteModal(true)
  }

  // 생성 제출
  const handleCreateSubmit = async () => {
    if (!formData.title.trim()) {
      alert('배너 제목을 입력해주세요.')
      return
    }
    
    if (!formData.thumbnailImageId) {
      alert('배너 이미지를 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    
    try {
      // 선택된 태그를 쉼표로 구분된 문자열로 변환
      const tagsString = formData.selectedTags.length > 0 
        ? formData.selectedTags.join(',') 
        : undefined
      
      const result = await createFeaturedBannerAdmin({
        thumbnailImageId: formData.thumbnailImageId,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        order: formData.order,
        tags: tagsString,
        isActive: formData.isActive,
      })
      
      if (result.success) {
        alert('배너가 생성되었습니다.')
        setShowCreateModal(false)
        loadBanners(currentPage)
      } else {
        alert(`배너 생성 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('배너 생성 오류:', error)
      alert('배너 생성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 수정 제출
  const handleEditSubmit = async () => {
    if (!selectedBanner) return
    
    if (!formData.title.trim()) {
      alert('배너 제목을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    
    try {
      // 선택된 태그를 쉼표로 구분된 문자열로 변환 (빈 배열이면 빈 문자열로 전송해 모든 태그 삭제)
      const tagsString = formData.selectedTags.length > 0 
        ? formData.selectedTags.join(',') 
        : ''
      
      const updateData: any = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        order: formData.order,
        tags: tagsString,
        isActive: formData.isActive,
      }
      
      // 새 이미지가 업로드된 경우에만 thumbnailImageId 포함
      if (formData.thumbnailImageId && formData.thumbnailImageId !== selectedBanner.thumbnailImage?.id) {
        updateData.thumbnailImageId = formData.thumbnailImageId
      }
      
      const result = await updateFeaturedBannerAdmin(selectedBanner.id, updateData)
      
      if (result.success) {
        alert('배너가 수정되었습니다.')
        setShowEditModal(false)
        loadBanners(currentPage)
      } else {
        alert(`배너 수정 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('배너 수정 오류:', error)
      alert('배너 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (!selectedBanner) return

    setIsSubmitting(true)
    
    try {
      const result = await deleteFeaturedBannerAdmin(selectedBanner.id)
      
      if (result.success) {
        alert('배너가 삭제되었습니다.')
        setShowDeleteModal(false)
        loadBanners(currentPage)
      } else {
        alert(`배너 삭제 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('배너 삭제 오류:', error)
      alert('배너 삭제에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 날짜 포맷
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

  // 태그 파싱
  const parseTags = (tags?: string): string[] => {
    if (!tags) return []
    // 쉼표로 구분된 태그 파싱
    return tags.split(',').map(tag => tag.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
  }

  // 배너 폼 모달 내용
  const renderBannerForm = () => (
    <div className={styles.formContainer}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          배너 제목 <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={styles.formInput}
          placeholder="배너 제목을 입력하세요"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          부제목
        </label>
        <input
          type="text"
          name="subtitle"
          value={formData.subtitle}
          onChange={handleInputChange}
          className={styles.formInput}
          placeholder="부제목을 입력하세요 (선택)"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          배너 이미지 <span className={styles.required}>*</span>
        </label>
        <div className={styles.imageUpload}>
          {imagePreview ? (
            <div className={styles.imagePreviewContainer}>
              <img src={imagePreview} alt="배너 미리보기" className={styles.imagePreview} />
              <button
                type="button"
                onClick={handleRemoveImage}
                className={styles.removeImageBtn}
                disabled={isUploadingImage}
              >
                ×
              </button>
              {isUploadingImage && (
                <div className={styles.uploadingOverlay}>
                  업로드 중...
                </div>
              )}
            </div>
          ) : (
            <label className={styles.imageUploadLabel}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={styles.imageInput}
                disabled={isUploadingImage}
              />
              <span>{isUploadingImage ? '업로드 중...' : '이미지 선택'}</span>
              <small>권장 크기: 800 x 400px</small>
            </label>
          )}
        </div>
        {formData.thumbnailImageId && (
          <small className={styles.imageIdText}>이미지 ID: {formData.thumbnailImageId}</small>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>태그</label>
        {isLoadingTags ? (
          <div className={styles.loadingTags}>태그 목록 로딩 중...</div>
        ) : availableTags.length === 0 ? (
          <div className={styles.noTags}>사용 가능한 태그가 없습니다.</div>
        ) : (
          <div className={styles.tagSelectContainer}>
            {availableTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className={`${styles.tagSelectBtn} ${formData.selectedTags.includes(tag.name) ? styles.selected : ''}`}
                onClick={() => handleTagToggle(tag.name)}
              >
                {tag.name}
                {formData.selectedTags.includes(tag.name) && <span className={styles.tagCheck}>✓</span>}
              </button>
            ))}
          </div>
        )}
        <div className={styles.tagActionsRow}>
          {formData.selectedTags.length > 0 && (
            <>
              <div className={styles.selectedTagsPreview}>
                <small>선택된 태그: {formData.selectedTags.join(', ')}</small>
              </div>
              <button
                type="button"
                className={styles.clearTagsBtn}
                onClick={() => setFormData(prev => ({ ...prev, selectedTags: [] }))}
              >
                모든 태그 삭제
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>노출 순서</label>
          <input
            type="number"
            name="order"
            value={formData.order}
            onChange={handleInputChange}
            className={styles.formInput}
            min="0"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>활성화 상태</label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
            />
            <span>활성화</span>
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>배너 관리</h1>
        <button className={styles.createBtn} onClick={handleCreate}>
          + 배너 추가
        </button>
      </div>

      {isLoading && (
        <div className={styles.loading}>
          배너 목록을 불러오는 중...
        </div>
      )}

      {loadError && (
        <div className={styles.error}>
          {loadError}
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순서</th>
                  <th>이미지</th>
                  <th>제목</th>
                  <th>부제목</th>
                  <th>태그</th>
                  <th>상태</th>
                  <th>생성일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyCell}>
                      등록된 배너가 없습니다.
                    </td>
                  </tr>
                ) : (
                  banners.map((banner) => (
                    <tr key={banner.id}>
                      <td>{banner.order}</td>
                      <td>
                        <img
                          src={getBannerImageUrl(banner)}
                          alt={banner.title}
                          className={styles.thumbnailImage}
                        />
                      </td>
                      <td>{banner.title}</td>
                      <td>{banner.subtitle || '-'}</td>
                      <td>
                        <div className={styles.tagList}>
                          {parseTags(banner.tags).length > 0 ? (
                            parseTags(banner.tags).map((tag, idx) => (
                              <span key={idx} className={styles.tag}>{tag}</span>
                            ))
                          ) : (
                            <span className={styles.noTag}>-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${banner.isActive ? styles.active : styles.inactive}`}>
                          {banner.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td>{formatDate(banner.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => handleDetail(banner)}
                          >
                            상세
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.editBtn}`}
                            onClick={() => handleEdit(banner)}
                          >
                            수정
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => handleDelete(banner)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 목록 */}
          <div className={styles.cardList}>
            {banners.length === 0 ? (
              <div className={styles.emptyCard}>
                등록된 배너가 없습니다.
              </div>
            ) : (
              banners.map((banner) => (
                <div key={banner.id} className={styles.card}>
                  <img
                    src={getBannerImageUrl(banner)}
                    alt={banner.title}
                    className={styles.cardImage}
                  />
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardOrder}>#{banner.order}</span>
                      <span className={`${styles.statusBadge} ${banner.isActive ? styles.active : styles.inactive}`}>
                        {banner.isActive ? '활성' : '비활성'}
                      </span>
                    </div>
                    <h3 className={styles.cardTitle}>{banner.title}</h3>
                    {banner.subtitle && (
                      <p className={styles.cardSubtitle}>{banner.subtitle}</p>
                    )}
                    <div className={styles.cardTags}>
                      {parseTags(banner.tags).map((tag, idx) => (
                        <span key={idx} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleDetail(banner)}
                      >
                        상세
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEdit(banner)}
                      >
                        수정
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDelete(banner)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 페이징 */}
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
                  const maxVisible = 5
                  
                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    pages.push(1)
                    
                    if (current <= 3) {
                      for (let i = 2; i <= 4; i++) {
                        pages.push(i)
                      }
                      pages.push('...')
                      pages.push(totalPages)
                    } else if (current >= totalPages - 2) {
                      pages.push('...')
                      for (let i = totalPages - 3; i <= totalPages; i++) {
                        pages.push(i)
                      }
                    } else {
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
        </>
      )}

      {/* 생성 모달 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="배너 추가"
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowCreateModal(false)}
              disabled={isSubmitting || isUploadingImage}
            >
              취소
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleCreateSubmit}
              disabled={isSubmitting || isUploadingImage}
            >
              {isSubmitting ? '생성 중...' : '생성'}
            </button>
          </div>
        }
      >
        {renderBannerForm()}
      </Modal>

      {/* 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="배너 수정"
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowEditModal(false)}
              disabled={isSubmitting || isUploadingImage}
            >
              취소
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleEditSubmit}
              disabled={isSubmitting || isUploadingImage}
            >
              {isSubmitting ? '수정 중...' : '수정'}
            </button>
          </div>
        }
      >
        {renderBannerForm()}
      </Modal>

      {/* 상세 모달 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="배너 상세"
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowDetailModal(false)}
            >
              닫기
            </button>
            <button
              className={`${styles.actionBtn} ${styles.editBtn}`}
              onClick={() => {
                setShowDetailModal(false)
                if (selectedBanner) handleEdit(selectedBanner)
              }}
            >
              수정
            </button>
          </div>
        }
      >
        {selectedBanner && (
          <div className={styles.detailContainer}>
            <img
              src={getBannerImageUrl(selectedBanner)}
              alt={selectedBanner.title}
              className={styles.detailImage}
            />
            <div className={styles.detailInfo}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>제목</span>
                <span className={styles.detailValue}>{selectedBanner.title}</span>
              </div>
              {selectedBanner.subtitle && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>부제목</span>
                  <span className={styles.detailValue}>{selectedBanner.subtitle}</span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>노출 순서</span>
                <span className={styles.detailValue}>{selectedBanner.order}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>태그</span>
                <span className={styles.detailValue}>
                  <div className={styles.tagList}>
                    {parseTags(selectedBanner.tags).length > 0 ? (
                      parseTags(selectedBanner.tags).map((tag, idx) => (
                        <span key={idx} className={styles.tag}>{tag}</span>
                      ))
                    ) : (
                      '-'
                    )}
                  </div>
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>상태</span>
                <span className={`${styles.statusBadge} ${selectedBanner.isActive ? styles.active : styles.inactive}`}>
                  {selectedBanner.isActive ? '활성' : '비활성'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>생성일</span>
                <span className={styles.detailValue}>{formatDate(selectedBanner.createdAt)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>수정일</span>
                <span className={styles.detailValue}>{formatDate(selectedBanner.updatedAt)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="배너 삭제"
        footer={
          <div className={styles.modalFooter}>
            <button
              className={styles.cancelBtn}
              onClick={() => setShowDeleteModal(false)}
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              className={styles.deleteConfirmBtn}
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? '삭제 중...' : '삭제'}
            </button>
          </div>
        }
      >
        <div className={styles.deleteConfirmContent}>
          <p>정말로 이 배너를 삭제하시겠습니까?</p>
          {selectedBanner && (
            <div className={styles.deleteTarget}>
              <strong>{selectedBanner.title}</strong>
            </div>
          )}
          <p className={styles.deleteWarning}>이 작업은 되돌릴 수 없습니다.</p>
        </div>
      </Modal>
    </div>
  )
}
