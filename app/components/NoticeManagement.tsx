'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AdminListMeta,
  AdminNoticeItem,
  createAdminNotice,
  deleteAdminNotice,
  getAdminNoticeDetail,
  getAdminNotices,
  updateAdminNotice,
} from '../lib/api'
import styles from './TagManagement.module.css'

type NoticeFormState = {
  title: string
  content: string
  isImportant: boolean
  isActive: boolean
}

const initialForm: NoticeFormState = {
  title: '',
  content: '',
  isImportant: false,
  isActive: true,
}

export default function NoticeManagement() {
  const [items, setItems] = useState<AdminNoticeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingItem, setEditingItem] = useState<AdminNoticeItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<AdminNoticeItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<NoticeFormState>(initialForm)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [paginationMeta, setPaginationMeta] = useState<AdminListMeta | null>(null)

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString('ko-KR')
  }

  const loadItems = async () => {
    setIsLoading(true)
    setError(null)
    const result = await getAdminNotices({ page: currentPage, limit: pageSize, q: searchQuery })
    if (!result.success) {
      setItems([])
      setPaginationMeta(null)
      setError(result.error || '공지사항 목록을 불러오지 못했습니다.')
      setIsLoading(false)
      return
    }
    setItems(result.data || [])
    setPaginationMeta(result.meta || null)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadItems()
  }, [currentPage, pageSize, searchQuery])

  const filteredItems = useMemo(() => items, [items])

  const openCreate = () => {
    setEditingItem(null)
    setFormData(initialForm)
    setShowModal(true)
  }

  const openEdit = async (item: AdminNoticeItem) => {
    setIsSubmitting(true)
    const detail = await getAdminNoticeDetail(item.id)
    setIsSubmitting(false)
    const target = detail.success && detail.data ? detail.data : item
    setEditingItem(target)
    setFormData({
      title: target.title || '',
      content: target.content || '',
      isImportant: !!target.isImportant,
      isActive: target.isActive ?? true,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (isSubmitting) return
    if (!formData.title.trim()) return alert('제목을 입력해주세요.')
    if (!formData.content.trim()) return alert('내용을 입력해주세요.')

    setIsSubmitting(true)
    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      isImportant: formData.isImportant,
      isActive: formData.isActive,
    }
    const result = editingItem
      ? await updateAdminNotice(editingItem.id, payload)
      : await createAdminNotice(payload)
    setIsSubmitting(false)

    if (!result.success) return alert(result.error || '공지사항 저장에 실패했습니다.')
    setShowModal(false)
    setEditingItem(null)
    if (!editingItem) setCurrentPage(1)
    await loadItems()
    alert(editingItem ? '공지사항이 수정되었습니다.' : '공지사항이 생성되었습니다.')
  }

  const handleDelete = async () => {
    if (!deleteId || isSubmitting) return
    setIsSubmitting(true)
    const result = await deleteAdminNotice(deleteId)
    setIsSubmitting(false)
    if (!result.success) return alert(result.error || '공지사항 삭제에 실패했습니다.')
    setDeleteId(null)
    if (items.length === 1 && currentPage > 1) {
      setCurrentPage((p) => Math.max(1, p - 1))
      return
    }
    await loadItems()
    alert('공지사항이 삭제되었습니다.')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 관리</h1>
        <button className={styles.addButton} onClick={openCreate}>
          + 공지사항 추가
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="제목/내용 검색..."
          />
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {isLoading && <div className={styles.loading}>로딩 중...</div>}

        {!isLoading && !error && (
          <>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>공지사항이 없습니다.</div>
            ) : (
              <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>제목</th>
                      <th>중요</th>
                      <th>상태</th>
                      <th>생성일</th>
                      <th>수정일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td className={styles.tagNameCell}>{item.title}</td>
                        <td>{item.isImportant ? '중요' : '-'}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${item.isActive ? styles.active : styles.inactive}`}>
                            {item.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.actionButton} onClick={() => setSelectedItem(item)}>상세</button>
                            <button className={styles.actionButton} onClick={() => void openEdit(item)} disabled={isSubmitting}>수정</button>
                            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => setDeleteId(item.id)} disabled={isSubmitting}>삭제</button>
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

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setShowModal(false))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingItem ? '공지사항 수정' : '공지사항 추가'}</h2>
              <button className={styles.modalCloseButton} onClick={() => setShowModal(false)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>제목 <span className={styles.required}>*</span></label>
                <input className={styles.input} value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>내용 <span className={styles.required}>*</span></label>
                <textarea className={styles.textarea} value={formData.content} onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>옵션</label>
                <div className={styles.toggleRow}>
                  <label className={styles.toggleLabel}>
                    <input type="checkbox" checked={formData.isImportant} onChange={(e) => setFormData((p) => ({ ...p, isImportant: e.target.checked }))} />
                    중요 공지
                  </label>
                  <label className={styles.toggleLabel}>
                    <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))} />
                    활성
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowModal(false)} disabled={isSubmitting}>취소</button>
              <button className={styles.saveButton} onClick={() => void handleSave()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className={styles.modalOverlay} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>공지사항 상세</h2>
              <button className={styles.modalCloseButton} onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}><span className={styles.detailLabel}>제목</span><span className={styles.detailValue}>{selectedItem.title}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>중요</span><span className={styles.detailValue}>{selectedItem.isImportant ? '중요' : '-'}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>상태</span><span className={styles.detailValue}>{selectedItem.isActive ? '활성' : '비활성'}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>생성일</span><span className={styles.detailValue}>{formatDate(selectedItem.createdAt)}</span></div>
                <div className={styles.detailItem}><span className={styles.detailLabel}>수정일</span><span className={styles.detailValue}>{formatDate(selectedItem.updatedAt)}</span></div>
              </div>
              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>내용</span>
                <div className={styles.detailValueBlock}>{selectedItem.content || '-'}</div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setSelectedItem(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={styles.modalOverlay} onClick={() => (isSubmitting ? undefined : setDeleteId(null))}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>공지사항 삭제</h2>
              <button className={styles.modalCloseButton} onClick={() => setDeleteId(null)} disabled={isSubmitting}>✕</button>
            </div>
            <div className={styles.modalBody}>정말 삭제하시겠습니까?</div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setDeleteId(null)} disabled={isSubmitting}>취소</button>
              <button className={styles.deleteConfirmButton} onClick={() => void handleDelete()} disabled={isSubmitting}>{isSubmitting ? '처리 중...' : '삭제'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
