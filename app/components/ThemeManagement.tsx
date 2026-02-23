'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  createPlacebookThemeAdmin,
  deletePlacebookThemeAdmin,
  getPlacebookCategoriesAdmin,
  getPlacebookThemesAdmin,
  PlacebookCategory,
  PlacebookTheme,
  updatePlacebookThemeAdmin,
} from '../lib/api'
import styles from './TagManagement.module.css'

type ThemeFormState = {
  categoryId: string
  name: string
  description: string
  sortOrder: number
  isActive: boolean
  thumbnailUrl: string
}

const initialFormState: ThemeFormState = {
  categoryId: '',
  name: '',
  description: '',
  sortOrder: 1,
  isActive: true,
  thumbnailUrl: '',
}

export default function ThemeManagement() {
  const [categories, setCategories] = useState<PlacebookCategory[]>([])
  const [themes, setThemes] = useState<PlacebookTheme[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingTheme, setEditingTheme] = useState<PlacebookTheme | null>(null)
  const [deleteThemeId, setDeleteThemeId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ThemeFormState>(initialFormState)
  const [draggingThemeId, setDraggingThemeId] = useState<string | null>(null)
  const [dragOverThemeId, setDragOverThemeId] = useState<string | null>(null)

  const categoryNameMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  )

  const sortThemesForDisplay = (sourceThemes: PlacebookTheme[], sourceCategories: PlacebookCategory[] = categories) => {
    return [...sourceThemes].sort((a, b) => {
      if (a.categoryId === b.categoryId) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      return (sourceCategories.find((c) => c.id === a.categoryId)?.sortOrder ?? 9999) -
        (sourceCategories.find((c) => c.id === b.categoryId)?.sortOrder ?? 9999)
    })
  }

  const getNextSortOrderForCategory = (categoryId: string, sourceThemes: PlacebookTheme[] = themes) => {
    if (!categoryId) return 1
    const sameCategory = sourceThemes.filter((theme) => theme.categoryId === categoryId)
    return sameCategory.length > 0 ? Math.max(...sameCategory.map((theme) => theme.sortOrder || 0)) + 1 : 1
  }

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [categoriesResult, themesResult] = await Promise.all([
        getPlacebookCategoriesAdmin(),
        getPlacebookThemesAdmin(),
      ])

      if (!categoriesResult.success) {
        throw new Error(categoriesResult.error || '카테고리 목록을 불러오지 못했습니다.')
      }
      if (!themesResult.success) {
        throw new Error(themesResult.error || '테마 목록을 불러오지 못했습니다.')
      }

      const nextCategories = [...(categoriesResult.data || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const nextThemes = sortThemesForDisplay(themesResult.data || [], nextCategories)

      setCategories(nextCategories)
      setThemes(nextThemes)

      if (!formData.categoryId && nextCategories[0]) {
        setFormData((prev) => ({
          ...prev,
          categoryId: nextCategories[0].id,
          sortOrder: getNextSortOrderForCategory(nextCategories[0].id, nextThemes),
        }))
      }
    } catch (err) {
      setCategories([])
      setThemes([])
      setError(err instanceof Error ? err.message : '테마 관리 데이터를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredThemes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return themes.filter((theme) => {
      const matchesCategory = categoryFilter === 'ALL' || theme.categoryId === categoryFilter
      if (!matchesCategory) return false
      if (!q) return true
      const name = theme.name?.toLowerCase() || ''
      const description = theme.description?.toLowerCase() || ''
      const categoryName = (categoryNameMap.get(theme.categoryId) || '').toLowerCase()
      return name.includes(q) || description.includes(q) || categoryName.includes(q)
    })
  }, [themes, categoryFilter, searchQuery, categoryNameMap])

  const resetForm = () => {
    const defaultCategoryId = categories[0]?.id || ''
    setFormData({
      ...initialFormState,
      categoryId: defaultCategoryId,
      sortOrder: getNextSortOrderForCategory(defaultCategoryId),
    })
  }

  const openCreateModal = () => {
    setEditingTheme(null)
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (theme: PlacebookTheme) => {
    setEditingTheme(theme)
    setFormData({
      categoryId: theme.categoryId,
      name: theme.name || '',
      description: theme.description || '',
      sortOrder: theme.sortOrder || 1,
      isActive: !!theme.isActive,
      thumbnailUrl: theme.thumbnailUrl || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (isSubmitting) return
    setShowModal(false)
    setEditingTheme(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.categoryId) {
      alert('카테고리를 선택해주세요.')
      return
    }
    if (!formData.name.trim()) {
      alert('테마 이름을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    const payload = {
      categoryId: formData.categoryId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
      thumbnailUrl: formData.thumbnailUrl.trim() || null,
    }

    const result = editingTheme
      ? await updatePlacebookThemeAdmin(editingTheme.id, payload)
      : await createPlacebookThemeAdmin(payload)

    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || (editingTheme ? '테마 수정에 실패했습니다.' : '테마 생성에 실패했습니다.'))
      return
    }

    await loadData()
    setShowModal(false)
    setEditingTheme(null)
    resetForm()
    alert(editingTheme ? '테마가 수정되었습니다.' : '테마가 생성되었습니다.')
  }

  const handleDeleteConfirm = async () => {
    if (!deleteThemeId || isSubmitting) return
    setIsSubmitting(true)
    const result = await deletePlacebookThemeAdmin(deleteThemeId)
    setIsSubmitting(false)
    if (!result.success) {
      alert(result.error || '테마 삭제에 실패했습니다.')
      return
    }
    await loadData()
    setDeleteThemeId(null)
    alert('테마가 삭제되었습니다.')
  }

  const handleToggleActive = async (theme: PlacebookTheme) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const result = await updatePlacebookThemeAdmin(theme.id, {
      categoryId: theme.categoryId,
      name: theme.name,
      description: theme.description,
      sortOrder: theme.sortOrder,
      isActive: !theme.isActive,
      thumbnailUrl: theme.thumbnailUrl,
    })
    setIsSubmitting(false)

    if (!result.success) {
      alert(result.error || '테마 상태 변경에 실패했습니다.')
      return
    }

    await loadData()
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const updateThemeOrderInCategory = async (categoryId: string, nextCategoryThemes: PlacebookTheme[]) => {
    const prevThemes = themes
    const normalizedCategoryThemes = nextCategoryThemes.map((theme, index) => ({
      ...theme,
      sortOrder: index + 1,
    }))
    const normalizedMap = new Map(normalizedCategoryThemes.map((theme) => [theme.id, theme]))

    const nextThemes = sortThemesForDisplay(
      prevThemes.map((theme) => (theme.categoryId === categoryId ? normalizedMap.get(theme.id) || theme : theme))
    )

    setThemes(nextThemes)
    setDraggingThemeId(null)
    setDragOverThemeId(null)
    setIsSubmitting(true)

    const changedThemes = normalizedCategoryThemes.filter((theme, index) => {
      const prev = prevThemes.find((t) => t.id === theme.id)
      return !prev || prev.sortOrder !== index + 1
    })

    try {
      for (const theme of changedThemes) {
        const result = await updatePlacebookThemeAdmin(theme.id, {
          categoryId: theme.categoryId,
          name: theme.name,
          description: theme.description,
          sortOrder: theme.sortOrder,
          isActive: theme.isActive,
          thumbnailUrl: theme.thumbnailUrl,
        })
        if (!result.success) {
          throw new Error(result.error || '테마 정렬 저장에 실패했습니다.')
        }
      }
      await loadData()
    } catch (err) {
      setThemes(prevThemes)
      alert(err instanceof Error ? err.message : '테마 정렬 저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleThemeDropReorder = async (targetThemeId: string) => {
    if (!draggingThemeId || draggingThemeId === targetThemeId) {
      setDraggingThemeId(null)
      setDragOverThemeId(null)
      return
    }
    if (searchQuery.trim()) {
      setDraggingThemeId(null)
      setDragOverThemeId(null)
      return
    }

    const sourceTheme = themes.find((theme) => theme.id === draggingThemeId)
    const targetTheme = themes.find((theme) => theme.id === targetThemeId)
    if (!sourceTheme || !targetTheme || sourceTheme.categoryId !== targetTheme.categoryId) {
      setDraggingThemeId(null)
      setDragOverThemeId(null)
      return
    }

    const categoryThemes = themes
      .filter((theme) => theme.categoryId === sourceTheme.categoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    const sourceIndex = categoryThemes.findIndex((theme) => theme.id === draggingThemeId)
    const targetIndex = categoryThemes.findIndex((theme) => theme.id === targetThemeId)
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingThemeId(null)
      setDragOverThemeId(null)
      return
    }

    const nextCategoryThemes = [...categoryThemes]
    const [moved] = nextCategoryThemes.splice(sourceIndex, 1)
    nextCategoryThemes.splice(targetIndex, 0, moved)
    await updateThemeOrderInCategory(sourceTheme.categoryId, nextCategoryThemes)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>테마 관리</h1>
        <button onClick={openCreateModal} className={styles.addButton}>
          + 테마 추가
        </button>
      </div>

      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 220px' }}>
            <input
              type="text"
              placeholder="테마 이름/설명/카테고리로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <select
              className={styles.searchInput}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">전체 카테고리</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#777' }}>
            테마는 카테고리에 포함되며, 목록에서 카테고리명을 함께 표시합니다.
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#777' }}>
            정렬은 같은 카테고리 내에서만 드래그앤드롭 가능합니다. {searchQuery.trim() ? '(검색 중에는 비활성화)' : ''}
          </p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            {filteredThemes.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery || categoryFilter !== 'ALL' ? '검색 결과가 없습니다.' : '등록된 테마가 없습니다.'}
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>카테고리</th>
                      <th>이름</th>
                      <th>썸네일</th>
                      <th>설명</th>
                      <th>상태</th>
                      <th>정렬</th>
                      <th>장소</th>
                      <th>방문완료</th>
                      <th>방문율</th>
                      <th>수정일</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredThemes.map((theme) => (
                      <tr
                        key={theme.id}
                        draggable={!isSubmitting && !searchQuery.trim()}
                        onDragStart={() => {
                          if (isSubmitting || searchQuery.trim()) return
                          setDraggingThemeId(theme.id)
                        }}
                        onDragOver={(e) => {
                          if (!draggingThemeId || isSubmitting || searchQuery.trim()) return
                          const draggingTheme = themes.find((item) => item.id === draggingThemeId)
                          if (!draggingTheme || draggingTheme.categoryId !== theme.categoryId) return
                          e.preventDefault()
                          setDragOverThemeId(theme.id)
                        }}
                        onDragLeave={() => {
                          if (dragOverThemeId === theme.id) setDragOverThemeId(null)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          void handleThemeDropReorder(theme.id)
                        }}
                        onDragEnd={() => {
                          setDraggingThemeId(null)
                          setDragOverThemeId(null)
                        }}
                        style={{
                          opacity: draggingThemeId === theme.id ? 0.55 : 1,
                          backgroundColor: dragOverThemeId === theme.id ? '#eef6ff' : undefined,
                          cursor: !isSubmitting && !searchQuery.trim() ? 'grab' : undefined,
                        }}
                      >
                        <td>{categoryNameMap.get(theme.categoryId) || theme.categoryId}</td>
                        <td>
                          <div className={styles.tagNameCell}>{theme.name}</div>
                        </td>
                        <td>
                          {theme.thumbnailUrl ? (
                            <img
                              src={theme.thumbnailUrl}
                              alt={theme.name}
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
                        <td>{theme.description || '-'}</td>
                        <td>
                          <button
                            onClick={() => void handleToggleActive(theme)}
                            className={`${styles.statusBadge} ${styles.toggleButton} ${
                              theme.isActive ? styles.active : styles.inactive
                            }`}
                            disabled={isSubmitting}
                          >
                            {theme.isActive ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td>{theme.sortOrder}</td>
                        <td>{theme.placeCount ?? 0}</td>
                        <td>{theme.visitedPlaceCount ?? 0}</td>
                        <td>{typeof theme.visitedPercent === 'number' ? `${theme.visitedPercent}%` : '-'}</td>
                        <td>{formatDate(theme.updatedAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button onClick={() => openEditModal(theme)} className={styles.actionButton} disabled={isSubmitting}>
                              수정
                            </button>
                            <button
                              onClick={() => setDeleteThemeId(theme.id)}
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
              <h2>{editingTheme ? '테마 수정' : '테마 추가'}</h2>
              <button onClick={closeModal} className={styles.modalCloseButton} disabled={isSubmitting}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  카테고리 <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.input}
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: e.target.value,
                      sortOrder: editingTheme ? prev.sortOrder : getNextSortOrderForCategory(e.target.value),
                    }))
                  }
                  disabled={isSubmitting}
                >
                  <option value="">카테고리 선택</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  테마 이름 <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="테마 이름을 입력하세요"
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>설명</label>
                <textarea
                  className={styles.textarea}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="테마 설명을 입력하세요"
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>썸네일 URL</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, thumbnailUrl: e.target.value }))}
                  placeholder="https://..."
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  정렬 순서 <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sortOrder: Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1),
                    }))
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  활성화 상태 <span className={styles.required}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="theme-isActive"
                      checked={formData.isActive}
                      onChange={() => setFormData((prev) => ({ ...prev, isActive: true }))}
                      disabled={isSubmitting}
                    />
                    <span>활성</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="radio"
                      name="theme-isActive"
                      checked={!formData.isActive}
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
                {isSubmitting ? '처리 중...' : editingTheme ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteThemeId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeleteThemeId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>테마 삭제</h2>
              <button
                onClick={() => setDeleteThemeId(null)}
                className={styles.modalCloseButton}
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>정말로 이 테마를 삭제하시겠습니까?</p>
              <p className={styles.warningText}>이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={() => setDeleteThemeId(null)} className={styles.cancelButton} disabled={isSubmitting}>
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
