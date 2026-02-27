'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  createPlacebookCategoryAdmin,
  deletePlacebookCategoryAdmin,
  getPlacebookCategoriesAdmin,
  PlacebookCategory,
  PlacebookTheme,
  getPlacebookThemesAdmin,
  updatePlacebookCategoryAdmin,
} from '../lib/api'
import styles from './TagManagement.module.css'

type CategoryFormState = {
  name: string
  subtitle: string
  description: string
  sortOrder: number
  isActive: boolean
  thumbnailUrl: string
}

const initialFormState: CategoryFormState = {
  name: '',
  subtitle: '',
  description: '',
  sortOrder: 1,
  isActive: true,
  thumbnailUrl: '',
}

export default function TagManagement() {
  const [categories, setCategories] = useState<PlacebookCategory[]>([])
  const [themes, setThemes] = useState<PlacebookTheme[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<PlacebookCategory | null>(null)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CategoryFormState>(initialFormState)
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([])

  const getNextSortOrder = (items: PlacebookCategory[]) =>
    items.length > 0 ? Math.max(...items.map((item) => item.sortOrder || 0)) + 1 : 1

  const resetForm = (items: PlacebookCategory[] = categories) => {
    setFormData({
      ...initialFormState,
      sortOrder: getNextSortOrder(items),
    })
  }

  const loadCategories = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [categoryResult, themeResult] = await Promise.all([
        getPlacebookCategoriesAdmin(),
        getPlacebookThemesAdmin(),
      ])

      if (!categoryResult.success) {
        setCategories([])
        setThemes([])
        setError(categoryResult.error || '카테고리 목록을 불러오지 못했습니다.')
        return
      }

      if (!themeResult.success) {
        setCategories([])
        setThemes([])
        setError(themeResult.error || '테마 목록을 불러오지 못했습니다.')
        return
      }

      const items = [...(categoryResult.data || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const themeItems = [...(themeResult.data || [])].sort((a, b) => {
        if (a.categoryId === b.categoryId) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        return a.categoryId.localeCompare(b.categoryId)
      })
      setCategories(items)
      setThemes(themeItems)
    } catch (err) {
      setCategories([])
      setThemes([])
      setError(err instanceof Error ? err.message : '카테고리 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((category) => {
      const title = (category.title || category.name || '').toLowerCase()
      const subtitle = (category.subtitle || '').toLowerCase()
      const description = category.description?.toLowerCase() || ''
      return title.includes(q) || subtitle.includes(q) || description.includes(q)
    })
  }, [categories, searchQuery])

  const themesByCategory = useMemo(() => {
    const map = new Map<string, PlacebookTheme[]>()
    for (const theme of themes) {
      const current = map.get(theme.categoryId) || []
      current.push(theme)
      map.set(theme.categoryId, current)
    }
    for (const [, items] of map) {
      items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    }
    return map
  }, [themes])

  const openCreateModal = () => {
    setEditingCategory(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (category: PlacebookCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.title || category.name || '',
      subtitle: category.subtitle || '',
      description: category.description || '',
      sortOrder: category.sortOrder || 1,
      isActive: !!category.isActive,
      thumbnailUrl: category.thumbnailUrl || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setShowModal(false)
    setEditingCategory(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('카테고리 이름을 입력해주세요.')
      return
    }
    if (!Number.isFinite(formData.sortOrder) || formData.sortOrder < 1) {
      alert('정렬 순서는 1 이상의 숫자여야 합니다.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      title: formData.name.trim(),
      subtitle: formData.subtitle.trim() || null,
      description: formData.description.trim() || null,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
      thumbnailUrl: formData.thumbnailUrl.trim() || null,
    }

    const result = editingCategory
      ? await updatePlacebookCategoryAdmin(editingCategory.id, payload)
      : await createPlacebookCategoryAdmin(payload)

    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || (editingCategory ? '카테고리 수정에 실패했습니다.' : '카테고리 생성에 실패했습니다.'))
      return
    }

    await loadCategories()
    setShowModal(false)
    setEditingCategory(null)
    resetForm()
    alert(editingCategory ? '카테고리가 수정되었습니다.' : '카테고리가 생성되었습니다.')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteCategoryId || isSubmitting) return

    setIsSubmitting(true)
    const result = await deletePlacebookCategoryAdmin(deleteCategoryId)
    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || '카테고리 삭제에 실패했습니다.')
      return
    }

    await loadCategories()
    setDeleteCategoryId(null)
    alert('카테고리가 삭제되었습니다.')
  }

  const handleToggleActive = async (category: PlacebookCategory) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    const result = await updatePlacebookCategoryAdmin(category.id, {
      title: category.title || category.name,
      subtitle: category.subtitle ?? null,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: !category.isActive,
      thumbnailUrl: category.thumbnailUrl,
    })
    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || '카테고리 상태 변경에 실패했습니다.')
      return
    }

    await loadCategories()
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const updateCategoryOrder = async (nextOrderedCategories: PlacebookCategory[]) => {
    const prevCategories = categories
    const normalized = nextOrderedCategories.map((category, index) => ({
      ...category,
      sortOrder: index + 1,
    }))

    setCategories(normalized)
    setDraggingCategoryId(null)
    setDragOverCategoryId(null)
    setIsSubmitting(true)

    const changedItems = normalized.filter((item, index) => {
      const prev = prevCategories.find((p) => p.id === item.id)
      return !prev || prev.sortOrder !== index + 1
    })

    try {
      for (const item of changedItems) {
        const result = await updatePlacebookCategoryAdmin(item.id, {
          title: item.title || item.name,
          subtitle: item.subtitle ?? null,
          description: item.description,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
          thumbnailUrl: item.thumbnailUrl,
        })

        if (!result.success) {
          throw new Error(result.error || '정렬 순서 저장에 실패했습니다.')
        }
      }
      await loadCategories()
    } catch (err) {
      setCategories(prevCategories)
      alert(err instanceof Error ? err.message : '정렬 순서 저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDropReorder = async (targetCategoryId: string) => {
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId) {
      setDraggingCategoryId(null)
      setDragOverCategoryId(null)
      return
    }
    if (searchQuery.trim()) {
      setDraggingCategoryId(null)
      setDragOverCategoryId(null)
      return
    }

    const sourceIndex = categories.findIndex((item) => item.id === draggingCategoryId)
    const targetIndex = categories.findIndex((item) => item.id === targetCategoryId)
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingCategoryId(null)
      setDragOverCategoryId(null)
      return
    }

    const next = [...categories]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    await updateCategoryOrder(next)
  }

  const toggleExpandedCategory = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>카테고리 관리</h1>
        <button onClick={openCreateModal} className={styles.addButton}>
          + 카테고리 추가
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="카테고리 이름/설명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#777' }}>
            정렬은 행 드래그앤드롭으로 변경할 수 있습니다. {searchQuery.trim() ? '(검색 중에는 비활성화)' : ''}
          </p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            {filteredCategories.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 카테고리가 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>썸네일</th>
                      <th>타이틀</th>
                      <th>서브타이틀</th>
                      <th>설명</th>
                      <th>상태</th>
                      <th>정렬</th>
                      <th>테마</th>
                      <th>장소</th>
                      <th>방문완료</th>
                      <th>방문율</th>
                      <th>수정일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => {
                      const isExpanded = expandedCategoryIds.includes(category.id)
                      const categoryThemes = themesByCategory.get(category.id) || []
                      return (
                      <Fragment key={category.id}>
                      <tr
                        draggable={!isSubmitting && !searchQuery.trim()}
                        onDragStart={() => {
                          if (isSubmitting || searchQuery.trim()) return
                          setDraggingCategoryId(category.id)
                        }}
                        onDragOver={(e) => {
                          if (!draggingCategoryId || isSubmitting || searchQuery.trim()) return
                          e.preventDefault()
                          setDragOverCategoryId(category.id)
                        }}
                        onDragLeave={() => {
                          if (dragOverCategoryId === category.id) setDragOverCategoryId(null)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          void handleDropReorder(category.id)
                        }}
                        onDragEnd={() => {
                          setDraggingCategoryId(null)
                          setDragOverCategoryId(null)
                        }}
                        style={{
                          opacity: draggingCategoryId === category.id ? 0.55 : 1,
                          backgroundColor: dragOverCategoryId === category.id ? '#eef6ff' : undefined,
                          cursor: !isSubmitting && !searchQuery.trim() ? 'grab' : undefined,
                        }}
                      >
                        <td>
                          {category.thumbnailUrl ? (
                            <img
                              src={category.thumbnailUrl}
                              alt={category.title || category.name || '카테고리'}
                              style={{
                                width: '64px',
                                height: '40px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                display: 'block',
                              }}
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => toggleExpandedCategory(category.id)}
                              className={styles.actionButton}
                              style={{ padding: '2px 8px', minWidth: '32px' }}
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                            <div className={styles.tagNameCell}>{category.title || category.name || '-'}</div>
                          </div>
                        </td>
                        <td>{category.subtitle || '-'}</td>
                        <td>{category.description || '-'}</td>
                        <td>
                          <button
                            onClick={() => void handleToggleActive(category)}
                            className={`${styles.statusBadge} ${styles.toggleButton} ${
                              category.isActive ? styles.active : styles.inactive
                            }`}
                            title="클릭하여 활성/비활성 토글"
                            disabled={isSubmitting}
                          >
                            {category.isActive ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td>{category.sortOrder}</td>
                        <td>{category.themeCount ?? 0}</td>
                        <td>{category.placeCount ?? 0}</td>
                        <td>{category.visitedPlaceCount ?? 0}</td>
                        <td>{typeof category.visitedPercent === 'number' ? `${category.visitedPercent}%` : '-'}</td>
                        <td>{formatDate(category.updatedAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button onClick={() => openEditModal(category)} className={styles.actionButton} disabled={isSubmitting}>
                              수정
                            </button>
                            <button
                              onClick={() => setDeleteCategoryId(category.id)}
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              disabled={isSubmitting}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} style={{ background: '#fafcff', padding: '12px 16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                포함된 테마 ({categoryThemes.length})
                              </div>
                              {categoryThemes.length === 0 ? (
                                <div style={{ fontSize: '13px', color: '#64748b' }}>등록된 테마가 없습니다.</div>
                              ) : (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                  {categoryThemes.map((theme) => (
                                    <div
                                      key={theme.id}
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '56px 1fr auto',
                                        gap: '10px',
                                        alignItems: 'center',
                                        padding: '8px 10px',
                                        background: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                      }}
                                    >
                                      <div style={{ fontSize: '12px', color: '#64748b' }}>#{theme.sortOrder}</div>
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                          {theme.title || theme.name || theme.id}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                          {theme.description || '-'}
                                        </div>
                                      </div>
                                      <span
                                        className={`${styles.statusBadge} ${theme.isActive ? styles.active : styles.inactive}`}
                                      >
                                        {theme.isActive ? '활성' : '비활성'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    )})}
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
              <h2>{editingCategory ? '카테고리 수정' : '카테고리 추가'}</h2>
              <button onClick={closeModal} className={styles.modalCloseButton} disabled={isSubmitting}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  카테고리 타이틀 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={styles.input}
                  placeholder="카테고리 타이틀을 입력하세요"
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className={styles.textarea}
                  placeholder="카테고리 설명을 입력하세요"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>썸네일 URL</label>
                <input
                  type="text"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                  className={styles.input}
                  placeholder="https://..."
                  disabled={isSubmitting}
                />
                <p style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
                  파일 업로드 API 연결 전까지는 URL 입력 방식으로 사용합니다.
                </p>
                {formData.thumbnailUrl.trim() && (
                  <div style={{ marginTop: '10px' }}>
                    <img
                      src={formData.thumbnailUrl}
                      alt="썸네일 미리보기"
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        background: '#f8fafc',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  정렬 순서 <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sortOrder: Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1),
                    }))
                  }
                  className={styles.input}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  활성화 상태 <span className={styles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                    <input
                      type="radio"
                      name="category-isActive"
                      checked={formData.isActive === true}
                      onChange={() => setFormData((prev) => ({ ...prev, isActive: true }))}
                      disabled={isSubmitting}
                    />
                    <span>활성</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                    <input
                      type="radio"
                      name="category-isActive"
                      checked={formData.isActive === false}
                      onChange={() => setFormData((prev) => ({ ...prev, isActive: false }))}
                      disabled={isSubmitting}
                    />
                    <span>비활성</span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={closeModal} className={styles.cancelButton} disabled={isSubmitting}>
                취소
              </button>
              <button onClick={() => void handleSave()} className={styles.saveButton} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : editingCategory ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCategoryId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeleteCategoryId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>카테고리 삭제</h2>
              <button
                onClick={() => setDeleteCategoryId(null)}
                className={styles.modalCloseButton}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>정말로 이 카테고리를 삭제하시겠습니까?</p>
              <p className={styles.warningText}>이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDeleteCategoryId(null)} className={styles.cancelButton} disabled={isSubmitting}>
                취소
              </button>
              <button onClick={() => void handleDeleteConfirm()} className={styles.deleteConfirmButton} disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
