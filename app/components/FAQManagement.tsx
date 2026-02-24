'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminListMeta,
  AdminFaqCategoryItem,
  AdminFaqItem,
  createAdminFaq,
  createAdminFaqCategory,
  deleteAdminFaq,
  deleteAdminFaqCategory,
  getAdminFaqCategories,
  getAdminFaqDetail,
  getAdminFaqs,
  updateAdminFaq,
  updateAdminFaqCategory,
} from '../lib/api'
import styles from './TagManagement.module.css'

type FaqFormState = {
  categoryId: string
  question: string
  answer: string
  sortOrder: string
  isActive: boolean
}

type CategoryFormState = {
  name: string
  sortOrder: string
  isActive: boolean
}

const initialFaqForm: FaqFormState = {
  categoryId: '',
  question: '',
  answer: '',
  sortOrder: '0',
  isActive: true,
}

const initialCategoryForm: CategoryFormState = {
  name: '',
  sortOrder: '0',
  isActive: true,
}

export default function FAQManagement() {
  const [faqs, setFaqs] = useState<AdminFaqItem[]>([])
  const [categories, setCategories] = useState<AdminFaqCategoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [paginationMeta, setPaginationMeta] = useState<AdminListMeta | null>(null)
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null)
  const [isSortingCategories, setIsSortingCategories] = useState(false)

  const [showFaqModal, setShowFaqModal] = useState(false)
  const [editingFaq, setEditingFaq] = useState<AdminFaqItem | null>(null)
  const [faqForm, setFaqForm] = useState<FaqFormState>(initialFaqForm)
  const [selectedFaq, setSelectedFaq] = useState<AdminFaqItem | null>(null)
  const [deleteFaqId, setDeleteFaqId] = useState<string | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminFaqCategoryItem | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm)
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('ko-KR')
  }

  const loadAll = async () => {
    setIsLoading(true)
    setError(null)
    const [faqResult, categoryResult] = await Promise.all([
      getAdminFaqs({ page: currentPage, limit: pageSize, q: searchQuery }),
      getAdminFaqCategories(),
    ])
    if (!faqResult.success) {
      setError(faqResult.error || 'FAQ 목록을 불러오지 못했습니다.')
      setFaqs([])
      setCategories([])
      setPaginationMeta(null)
      setIsLoading(false)
      return
    }
    if (!categoryResult.success) {
      setError(categoryResult.error || 'FAQ 카테고리를 불러오지 못했습니다.')
      setFaqs([])
      setCategories([])
      setIsLoading(false)
      return
    }
    setFaqs(faqResult.data || [])
    setPaginationMeta(faqResult.meta || null)
    setCategories((categoryResult.data || []).slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadAll()
  }, [currentPage, pageSize, searchQuery])

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories])

  const filteredFaqs = useMemo(() => {
    return faqs
      .filter((faq) => (categoryFilter === 'ALL' ? true : faq.categoryId === categoryFilter))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  }, [faqs, categoryFilter])

  const openCreateFaq = () => {
    setEditingFaq(null)
    setFaqForm({ ...initialFaqForm, categoryId: categories[0]?.id || '' })
    setShowFaqModal(true)
  }

  const openEditFaq = async (faq: AdminFaqItem) => {
    setIsSubmitting(true)
    const detail = await getAdminFaqDetail(faq.id)
    setIsSubmitting(false)
    const target = detail.success && detail.data ? detail.data : faq
    setEditingFaq(target)
    setFaqForm({
      categoryId: target.categoryId || '',
      question: target.question || '',
      answer: target.answer || '',
      sortOrder: String(target.sortOrder ?? 0),
      isActive: target.isActive ?? true,
    })
    setShowFaqModal(true)
  }

  const saveFaq = async () => {
    if (isSubmitting) return
    if (!faqForm.question.trim()) return alert('질문을 입력해주세요.')
    if (!faqForm.answer.trim()) return alert('답변을 입력해주세요.')
    setIsSubmitting(true)
    const payload = {
      categoryId: faqForm.categoryId || null,
      question: faqForm.question.trim(),
      answer: faqForm.answer.trim(),
      sortOrder: Number(faqForm.sortOrder) || 0,
      isActive: faqForm.isActive,
    }
    const result = editingFaq ? await updateAdminFaq(editingFaq.id, payload) : await createAdminFaq(payload)
    setIsSubmitting(false)
    if (!result.success) return alert(result.error || 'FAQ 저장에 실패했습니다.')
    setShowFaqModal(false)
    if (!editingFaq) setCurrentPage(1)
    await loadAll()
    alert(editingFaq ? 'FAQ가 수정되었습니다.' : 'FAQ가 생성되었습니다.')
  }

  const confirmDeleteFaq = async () => {
    if (!deleteFaqId || isSubmitting) return
    setIsSubmitting(true)
    const result = await deleteAdminFaq(deleteFaqId)
    setIsSubmitting(false)
    if (!result.success) return alert(result.error || 'FAQ 삭제에 실패했습니다.')
    setDeleteFaqId(null)
    if (filteredFaqs.length === 1 && currentPage > 1) {
      setCurrentPage((p) => Math.max(1, p - 1))
      return
    }
    await loadAll()
    alert('FAQ가 삭제되었습니다.')
  }

  const openCreateCategory = () => {
    setEditingCategory(null)
    const lastCategory = categories[categories.length - 1]
    setCategoryForm({ ...initialCategoryForm, sortOrder: String((lastCategory?.sortOrder || 0) + 1) })
    setShowCategoryModal(true)
  }

  const openEditCategory = (category: AdminFaqCategoryItem) => {
    setEditingCategory(category)
    setCategoryForm({
      name: category.name || '',
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive ?? true,
    })
    setShowCategoryModal(true)
  }

  const saveCategory = async () => {
    if (isSubmitting) return
    if (!categoryForm.name.trim()) return alert('카테고리명을 입력해주세요.')
    setIsSubmitting(true)
    const payload = {
      name: categoryForm.name.trim(),
      sortOrder: Number(categoryForm.sortOrder) || 0,
      isActive: categoryForm.isActive,
    }
    const result = editingCategory
      ? await updateAdminFaqCategory(editingCategory.id, payload)
      : await createAdminFaqCategory(payload)
    setIsSubmitting(false)
    if (!result.success) return alert(result.error || '카테고리 저장에 실패했습니다.')
    setShowCategoryModal(false)
    await loadAll()
    alert(editingCategory ? '카테고리가 수정되었습니다.' : '카테고리가 생성되었습니다.')
  }

  const confirmDeleteCategory = async () => {
    if (!deleteCategoryId || isSubmitting) return
    setIsSubmitting(true)
    const result = await deleteAdminFaqCategory(deleteCategoryId)
    setIsSubmitting(false)
    if (!result.success) return alert(result.error || '카테고리 삭제에 실패했습니다.')
    setDeleteCategoryId(null)
    await loadAll()
    alert('카테고리가 삭제되었습니다.')
  }

  const handleDropCategory = async (targetCategoryId: string) => {
    if (!draggingCategoryId || draggingCategoryId === targetCategoryId || isSortingCategories || isSubmitting) {
      setDraggingCategoryId(null)
      return
    }

    const sourceIndex = categories.findIndex((c) => c.id === draggingCategoryId)
    const targetIndex = categories.findIndex((c) => c.id === targetCategoryId)
    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingCategoryId(null)
      return
    }

    const reordered = [...categories]
    const [moved] = reordered.splice(sourceIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const nextCategories = reordered.map((c, index) => ({ ...c, sortOrder: index + 1 }))

    setCategories(nextCategories)
    setDraggingCategoryId(null)
    setIsSortingCategories(true)

    for (const category of nextCategories) {
      const result = await updateAdminFaqCategory(category.id, { sortOrder: category.sortOrder || 0 })
      if (!result.success) {
        setIsSortingCategories(false)
        alert(result.error || '카테고리 정렬 저장에 실패했습니다.')
        await loadAll()
        return
      }
    }

    setIsSortingCategories(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FAQ 관리</h1>
        <div className={styles.actions}>
          <button className={styles.actionButton} onClick={openCreateCategory}>카테고리 추가</button>
          <button className={styles.addButton} onClick={openCreateFaq}>+ FAQ 추가</button>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 220px' }}>
            <input
              className={styles.searchInput}
              placeholder="질문/답변/카테고리 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
            <select
              className={styles.searchInput}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="ALL">전체 카테고리</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            <div className={styles.tableContainer} style={{ marginBottom: '24px' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>정렬</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan={4}>카테고리가 없습니다.</td></tr>
                  ) : (
                    categories.map((c) => (
                      <tr
                        key={c.id}
                        draggable={!isSubmitting && !isSortingCategories}
                        onDragStart={() => setDraggingCategoryId(c.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => void handleDropCategory(c.id)}
                        style={{ cursor: isSubmitting || isSortingCategories ? 'default' : 'grab' }}
                      >
                        <td className={styles.tagNameCell}>
                          <span style={{ color: '#999', marginRight: '8px' }}>⋮⋮</span>
                          {c.name}
                        </td>
                        <td>{c.sortOrder ?? 0}</td>
                        <td>{c.isActive ? '활성' : '비활성'}</td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.actionButton} onClick={() => openEditCategory(c)} disabled={isSortingCategories}>수정</button>
                            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => setDeleteCategoryId(c.id)} disabled={isSortingCategories}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '-12px', marginBottom: '16px' }}>
              카테고리 행을 드래그해서 순서를 변경할 수 있습니다.
            </div>

            {filteredFaqs.length === 0 ? (
              <div className={styles.emptyState}>FAQ가 없습니다.</div>
            ) : (
              <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>카테고리</th>
                      <th>질문</th>
                      <th>정렬</th>
                      <th>상태</th>
                      <th>수정일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaqs.map((faq) => (
                      <tr key={faq.id}>
                        <td>{faq.categoryName || categoryMap.get(faq.categoryId || '') || '-'}</td>
                        <td className={styles.tagNameCell}>{faq.question}</td>
                        <td>{faq.sortOrder ?? 0}</td>
                        <td>{faq.isActive ? '활성' : '비활성'}</td>
                        <td>{formatDate(faq.updatedAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.actionButton} onClick={() => setSelectedFaq(faq)}>상세</button>
                            <button className={styles.actionButton} onClick={() => void openEditFaq(faq)} disabled={isSubmitting}>수정</button>
                            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => setDeleteFaqId(faq.id)} disabled={isSubmitting}>삭제</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paginationMeta && paginationMeta.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    총 {paginationMeta.totalItems}건 · {paginationMeta.currentPage}/{paginationMeta.totalPages} 페이지
                  </div>
                  <div className={styles.actions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={!paginationMeta.hasPrevious || isLoading}
                    >
                      이전
                    </button>
                    <button
                      className={styles.actionButton}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!paginationMeta.hasNext || isLoading}
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </>
        )}
      </div>

      {showFaqModal && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setShowFaqModal(false))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingFaq ? 'FAQ 수정' : 'FAQ 추가'}</h2>
              <button className={styles.modalCloseButton} onClick={() => setShowFaqModal(false)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>카테고리</label>
                <select className={styles.input} value={faqForm.categoryId} onChange={(e) => setFaqForm((p) => ({ ...p, categoryId: e.target.value }))}>
                  <option value="">선택 안함</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>질문 <span className={styles.required}>*</span></label>
                <input className={styles.input} value={faqForm.question} onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>답변 <span className={styles.required}>*</span></label>
                <textarea className={styles.textarea} value={faqForm.answer} onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>정렬순서</label>
                  <input className={styles.input} type="number" value={faqForm.sortOrder} onChange={(e) => setFaqForm((p) => ({ ...p, sortOrder: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>상태</label>
                  <div className={styles.toggleRow}>
                    <label className={styles.toggleLabel}>
                      <input type="checkbox" checked={faqForm.isActive} onChange={(e) => setFaqForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      활성
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowFaqModal(false)} disabled={isSubmitting}>취소</button>
              <button className={styles.saveButton} onClick={() => void saveFaq()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setShowCategoryModal(false))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingCategory ? 'FAQ 카테고리 수정' : 'FAQ 카테고리 추가'}</h2>
              <button className={styles.modalCloseButton} onClick={() => setShowCategoryModal(false)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>카테고리명 <span className={styles.required}>*</span></label>
                <input className={styles.input} value={categoryForm.name} onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>정렬순서</label>
                  <input className={styles.input} type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((p) => ({ ...p, sortOrder: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>상태</label>
                  <div className={styles.toggleRow}>
                    <label className={styles.toggleLabel}>
                      <input type="checkbox" checked={categoryForm.isActive} onChange={(e) => setCategoryForm((p) => ({ ...p, isActive: e.target.checked }))} />
                      활성
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowCategoryModal(false)} disabled={isSubmitting}>취소</button>
              <button className={styles.saveButton} onClick={() => void saveCategory()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedFaq && (
        <div className={styles.modalOverlay} onClick={() => setSelectedFaq(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>FAQ 상세</h2>
              <button className={styles.modalCloseButton} onClick={() => setSelectedFaq(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}><span className={styles.detailLabel}>카테고리</span><span className={styles.detailValue}>{selectedFaq.categoryName || categoryMap.get(selectedFaq.categoryId || '') || '-'}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>정렬순서</span><span className={styles.detailValue}>{selectedFaq.sortOrder ?? 0}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>상태</span><span className={styles.detailValue}>{selectedFaq.isActive ? '활성' : '비활성'}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>생성일</span><span className={styles.detailValue}>{formatDate(selectedFaq.createdAt)}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>수정일</span><span className={styles.detailValue}>{formatDate(selectedFaq.updatedAt)}</span></div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>질문</span>
                <div className={styles.detailValueBlock}>{selectedFaq.question}</div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>답변</span>
                <div className={styles.detailValueBlock}>{selectedFaq.answer}</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setSelectedFaq(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {deleteFaqId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeleteFaqId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>FAQ 삭제</h2>
              <button className={styles.modalCloseButton} onClick={() => setDeleteFaqId(null)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>정말 삭제하시겠습니까?</div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setDeleteFaqId(null)} disabled={isSubmitting}>취소</button>
              <button className={styles.deleteConfirmButton} onClick={() => void confirmDeleteFaq()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteCategoryId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeleteCategoryId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>FAQ 카테고리 삭제</h2>
              <button className={styles.modalCloseButton} onClick={() => setDeleteCategoryId(null)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>정말 삭제하시겠습니까? (연결된 FAQ가 있으면 서버에서 거부될 수 있습니다.)</div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setDeleteCategoryId(null)} disabled={isSubmitting}>취소</button>
              <button className={styles.deleteConfirmButton} onClick={() => void confirmDeleteCategory()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
