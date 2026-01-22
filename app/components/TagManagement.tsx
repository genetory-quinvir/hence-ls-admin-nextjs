'use client'

import { useState, useEffect } from 'react'
import { getTagsAdmin, createTagAdmin, updateTagAdmin, deleteTagAdmin, toggleTagFilter, createTagFilter } from '../lib/api'
import styles from './TagManagement.module.css'

interface Tag {
  id: string
  name: string
  isActive: boolean
  order: number
  createdAt?: string
  updatedAt?: string
}

export default function TagManagement() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    order: 1,
  })

  // 태그 목록 로드
  const loadTags = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await getTagsAdmin()
      console.log('[TagManagement] API 응답:', result)
      
      if (result.success) {
        // result.data가 배열인지 확인
        let tagsData: Tag[] = []
        
        if (Array.isArray(result.data)) {
          tagsData = result.data
        } else if (result.data && typeof result.data === 'object') {
          // 객체인 경우, 배열 필드를 찾아봄
          if (Array.isArray(result.data.tags)) {
            tagsData = result.data.tags
          } else if (Array.isArray(result.data.items)) {
            tagsData = result.data.items
          } else if (Array.isArray(result.data.list)) {
            tagsData = result.data.list
          } else {
            // 객체 자체가 태그 하나일 수도 있음
            console.warn('[TagManagement] 예상치 못한 응답 구조:', result.data)
          }
        }
        
        console.log('[TagManagement] 추출된 태그 데이터:', tagsData)
        setTags(tagsData)
      } else {
        const errorMsg = result.error || '태그 목록을 불러오는데 실패했습니다.'
        setError(errorMsg)
        setTags([])
        console.error('[TagManagement] 태그 목록 로드 실패:', errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '태그 목록을 불러오는데 실패했습니다.'
      setError(errorMsg)
      setTags([])
      console.error('[TagManagement] 태그 목록 로드 예외:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTags()
  }, [])

  // 검색 필터링
  const filteredTags = Array.isArray(tags) ? tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : []

  // 모달 열기 (생성)
  const handleAddClick = () => {
    setEditingTag(null)
    // 다음 order 값 계산 (기존 태그 중 최대 order + 1)
    const maxOrder = tags.length > 0 ? Math.max(...tags.map(t => t.order || 0)) : 0
    setFormData({
      name: '',
      isActive: true,
      order: maxOrder + 1,
    })
    setShowModal(true)
  }

  // 모달 열기 (수정)
  const handleEditClick = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      isActive: tag.isActive ?? true,
      order: tag.order ?? 1,
    })
    setShowModal(true)
  }

  // 삭제 확인
  const handleDeleteClick = (tagId: string) => {
    setDeleteTagId(tagId)
  }

  // 삭제 취소
  const handleDeleteCancel = () => {
    setDeleteTagId(null)
  }

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!deleteTagId) return

    try {
      const result = await deleteTagAdmin(deleteTagId)
      if (result.success) {
        await loadTags()
        setDeleteTagId(null)
        alert('태그가 삭제되었습니다.')
      } else {
        alert(result.error || '태그 삭제에 실패했습니다.')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '태그 삭제에 실패했습니다.')
    }
  }

  // 활성/비활성 토글
  const handleToggleActive = async (tagId: string) => {
    try {
      // 먼저 토글 시도
      let result = await toggleTagFilter(tagId)
      
      // 필터에 등록되지 않은 태그인 경우 먼저 등록하고 활성화
      if (!result.success && (
        result.error?.includes('필터에 등록되지 않은 태그') ||
        result.error?.includes('등록되지 않은 태그') ||
        result.error?.includes('not found') ||
        result.error?.includes('404')
      )) {
        console.log('[TagManagement] 필터에 등록되지 않은 태그 감지, 필터 등록 시작')
        
        // 필터에 등록
        const filterResult = await createTagFilter(tagId, {})
        
        if (!filterResult.success) {
          alert(`필터 등록에 실패했습니다: ${filterResult.error || '알 수 없는 오류'}`)
          return
        }
        
        console.log('[TagManagement] 필터 등록 성공, 활성화 시작')
        
        // 필터 등록 완료 후 상태 안정화 대기
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // 필터 등록 성공 후 토글하여 활성화
        result = await toggleTagFilter(tagId)
        
        if (!result.success) {
          // 토글 실패 시 재시도
          await new Promise(resolve => setTimeout(resolve, 200))
          result = await toggleTagFilter(tagId)
          
          if (!result.success) {
            alert(`필터는 등록되었지만 활성화에 실패했습니다: ${result.error || '알 수 없는 오류'}`)
            return
          }
        }
        
        console.log('[TagManagement] 필터 등록 및 활성화 완료')
      } else if (!result.success) {
        alert(result.error || '태그 상태 변경에 실패했습니다.')
        return
      }
      
      if (result.success) {
        await loadTags()
      }
    } catch (err) {
      console.error('[TagManagement] 토글 중 오류:', err)
      alert(err instanceof Error ? err.message : '태그 상태 변경에 실패했습니다.')
    }
  }

  // 저장
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('태그 이름을 입력해주세요.')
      return
    }

    // 수정 시에만 순서 검증
    if (editingTag && formData.order < 1) {
      alert('순서는 1 이상이어야 합니다.')
      return
    }

    try {
      let result
      if (editingTag) {
        // 활성/비활성 상태가 변경되었다면 토글 API 호출
        if (formData.isActive !== editingTag.isActive) {
          let toggleResult = await toggleTagFilter(editingTag.id)
          
          // 필터에 등록되지 않은 태그인 경우 먼저 등록
          if (!toggleResult.success && toggleResult.error?.includes('필터에 등록되지 않은 태그')) {
            const filterResult = await createTagFilter(editingTag.id, {})
            if (filterResult.success) {
              // 필터 등록 성공 후 다시 토글 시도
              toggleResult = await toggleTagFilter(editingTag.id)
              if (!toggleResult.success) {
                alert(`태그 상태 변경에 실패했습니다: ${toggleResult.error || '알 수 없는 오류'}`)
                return // 상태 변경 실패 시 수정 중단
              }
            } else {
              alert(`필터 등록에 실패했습니다: ${filterResult.error || '알 수 없는 오류'}`)
              return // 필터 등록 실패 시 수정 중단
            }
          } else if (!toggleResult.success) {
            alert(`태그 상태 변경에 실패했습니다: ${toggleResult.error || '알 수 없는 오류'}`)
            return // 상태 변경 실패 시 수정 중단
          }
        }
        
        // 수정 (이름과 순서만 수정, isActive는 토글 API로만 변경)
        result = await updateTagAdmin(editingTag.id, {
          name: formData.name.trim(),
          isActive: editingTag.isActive, // API에는 전송하지 않지만 인터페이스 유지를 위해 포함
          order: formData.order,
        })
      } else {
        // 생성: 태그만 생성 (필터 등록은 나중에)
        console.log('[TagManagement] 태그 생성 시작:', formData)
        result = await createTagAdmin({
          name: formData.name.trim(),
          // 태그 생성 시 isActive와 order는 필요없음
        })
        
        console.log('[TagManagement] 태그 생성 결과:', result)
      }

      // 태그 생성/수정 및 필터 등록이 모두 완료된 후에만 모달 닫기
      if (result.success) {
        // 태그 목록을 다시 로드하여 최신 상태 반영
        await loadTags()
        
        // 모든 작업이 완료된 후 모달 닫기
        setShowModal(false)
        setEditingTag(null)
        const maxOrder = tags.length > 0 ? Math.max(...tags.map(t => t.order || 0)) : 0
        setFormData({
          name: '',
          isActive: true,
          order: maxOrder + 1,
        })
        alert(editingTag ? '태그가 수정되었습니다.' : '태그가 생성되었습니다.')
      } else {
        // 실패 시 모달은 열려있고 에러 메시지만 표시
        alert(result.error || (editingTag ? '태그 수정에 실패했습니다.' : '태그 생성에 실패했습니다.'))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : (editingTag ? '태그 수정에 실패했습니다.' : '태그 생성에 실패했습니다.'))
    }
  }

  // 모달 닫기
  const handleModalClose = () => {
    setShowModal(false)
    setEditingTag(null)
    const maxOrder = tags.length > 0 ? Math.max(...tags.map(t => t.order || 0)) : 0
    setFormData({
      name: '',
      isActive: true,
      order: maxOrder + 1,
    })
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>태그 관리</h1>
        <button
          onClick={handleAddClick}
          className={styles.addButton}
        >
          + 태그 추가
        </button>
      </div>

      <div className={styles.content}>
        {/* 검색 */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="태그 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* 로딩 */}
        {isLoading && (
          <div className={styles.loading}>
            로딩 중...
          </div>
        )}

        {/* 태그 목록 */}
        {!isLoading && !error && (
          <>
            {filteredTags.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 태그가 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>태그 이름</th>
                      <th>활성화 상태</th>
                      <th>순서</th>
                      <th>생성일</th>
                      <th>수정일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTags.map((tag) => (
                      <tr key={tag.id}>
                        <td>
                          <div className={styles.tagNameCell}>
                            {tag.name}
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(tag.id)}
                            className={`${styles.statusBadge} ${styles.toggleButton} ${tag.isActive ? styles.active : styles.inactive}`}
                            title="클릭하여 활성/비활성 토글"
                          >
                            {tag.isActive ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td>{tag.order}</td>
                        <td>{tag.createdAt ? formatDate(tag.createdAt) : '-'}</td>
                        <td>{tag.updatedAt && tag.updatedAt !== tag.createdAt ? formatDate(tag.updatedAt) : '-'}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              onClick={() => handleEditClick(tag)}
                              className={styles.actionButton}
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteClick(tag.id)}
                              className={`${styles.actionButton} ${styles.deleteButton}`}
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

      {/* 생성/수정 모달 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={handleModalClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingTag ? '태그 수정' : '태그 추가'}</h2>
              <button
                onClick={handleModalClose}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  태그 이름 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.input}
                  placeholder="태그 이름을 입력하세요"
                />
              </div>
              {/* 수정 모달에서만 활성화 상태와 순서 표시 */}
              {editingTag && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      활성화 상태 <span className={styles.required}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="radio"
                          name="isActive"
                          checked={formData.isActive === true}
                          onChange={() => setFormData({ ...formData, isActive: true })}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>활성</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                        <input
                          type="radio"
                          name="isActive"
                          checked={formData.isActive === false}
                          onChange={() => setFormData({ ...formData, isActive: false })}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>비활성</span>
                      </label>
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      테이블에서 상태 배지를 클릭하여도 활성/비활성을 변경할 수 있습니다.
                    </p>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      순서 <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10)
                        if (!isNaN(value) && value >= 1) {
                          setFormData({ ...formData, order: value })
                        } else if (e.target.value === '') {
                          setFormData({ ...formData, order: 1 })
                        }
                      }}
                      className={styles.input}
                      placeholder="1"
                    />
                    <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      숫자가 작을수록 먼저 표시됩니다.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={handleModalClose}
                className={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className={styles.saveButton}
              >
                {editingTag ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTagId && (
        <div className={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>태그 삭제</h2>
              <button
                onClick={handleDeleteCancel}
                className={styles.modalCloseButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>정말로 이 태그를 삭제하시겠습니까?</p>
              <p className={styles.warningText}>
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                onClick={handleDeleteCancel}
                className={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
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
