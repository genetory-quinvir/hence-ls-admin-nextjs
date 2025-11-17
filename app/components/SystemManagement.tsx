'use client'

import { useState } from 'react'
import { useMockData } from '../context/MockDataContext'
import { useAuth } from '../context/AuthContext'
import { Notice, FAQ, Operator } from '../data/mockData'
import Modal from './Modal'
import styles from './SystemManagement.module.css'

interface SystemManagementProps {
  menuId: string
}

export default function SystemManagement({ menuId }: SystemManagementProps) {
  const { appVersions, notices, faqs, operators, permissionLogs, feeds, comments, users, liveSpaces } = useMockData()
  const { user } = useAuth()
  
  // 현재 사용자가 SUPER_ADMIN인지 확인 (admin@quinvir.com은 SUPER_ADMIN으로 간주)
  const isSuperAdmin = user?.email === 'admin@quinvir.com'

  // 대상 정보 가져오기
  const getTargetInfo = (targetType: string, targetId: string) => {
    switch (targetType) {
      case 'feed':
        const feed = feeds.find(f => f.id === targetId)
        if (feed) {
          return {
            title: feed.content.length > 40 ? feed.content.substring(0, 40) + '...' : feed.content,
            fullContent: feed.content,
            author: feed.authorNickname,
            type: '피드'
          }
        }
        break
      case 'comment':
        const comment = comments.find(c => c.id === targetId)
        if (comment) {
          return {
            title: comment.content.length > 40 ? comment.content.substring(0, 40) + '...' : comment.content,
            fullContent: comment.content,
            author: comment.authorNickname,
            type: '댓글'
          }
        }
        break
      case 'user':
        const targetUser = users.find(u => u.id === targetId)
        if (targetUser) {
          return {
            title: targetUser.nickname,
            fullContent: targetUser.nickname,
            author: targetUser.nickname,
            type: '사용자'
          }
        }
        break
      case 'notice':
        const notice = notices.find(n => n.id === targetId)
        if (notice) {
          return {
            title: notice.title,
            fullContent: notice.title,
            author: '-',
            type: '공지사항'
          }
        }
        break
      case 'faq':
        const faq = faqs.find(f => f.id === targetId)
        if (faq) {
          return {
            title: faq.question,
            fullContent: faq.question,
            author: '-',
            type: 'FAQ'
          }
        }
        break
      case 'live-space':
        const liveSpace = liveSpaces.find(ls => ls.id === targetId)
        if (liveSpace) {
          return {
            title: liveSpace.title,
            fullContent: liveSpace.title,
            author: liveSpace.hostNickname,
            type: '라이브 스페이스'
          }
        }
        break
    }
    return null
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

  if (menuId === 'system-app-version') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>앱 버전 관리</h1>
        </div>
        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>플랫폼</th>
                  <th>버전</th>
                  <th>강제 업데이트</th>
                  <th>릴리즈 노트</th>
                  <th>릴리즈일</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {appVersions.map((version) => (
                  <tr key={version.id}>
                    <td>
                      <span className={styles.platform}>
                        {version.platform === 'ios' ? 'iOS' : 'Android'}
                      </span>
                    </td>
                    <td>{version.version}</td>
                    <td>
                      {version.forceUpdate ? (
                        <span className={`${styles.badge} ${styles.force}`}>강제</span>
                      ) : (
                        <span className={styles.badge}>선택</span>
                      )}
                    </td>
                    <td>{version.releaseNotes}</td>
                    <td>{formatDate(version.releasedAt)}</td>
                    <td>
                      {version.status === 'active' ? (
                        <span className={`${styles.badge} ${styles.active}`}>활성</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.inactive}`}>비활성</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn}>수정</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (menuId === 'system-notice') {
    return <NoticeManagement notices={notices} formatDate={formatDate} />
  }

  if (menuId === 'system-faq') {
    return <FAQManagement faqs={faqs} formatDate={formatDate} />
  }

  if (menuId === 'system-operators') {
    return <OperatorManagement operators={operators} formatDate={formatDate} isSuperAdmin={isSuperAdmin} />
  }

  if (menuId === 'system-logs') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Permission Log</h1>
        </div>
        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>운영자</th>
                  <th>액션</th>
                  <th>대상 타입</th>
                  <th>대상 ID</th>
                  <th>상세</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {permissionLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className={styles.operatorCell}>
                        <div>{log.operatorEmail}</div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.actionBadge}>{log.action}</span>
                    </td>
                    <td>{log.targetType}</td>
                    <td>
                      {(() => {
                        const targetInfo = getTargetInfo(log.targetType, log.targetId)
                        if (targetInfo) {
                          return (
                            <div className={styles.targetInfo}>
                              <div className={styles.targetContent}>
                                <span className={styles.targetTypeBadge}>{targetInfo.type}</span>
                                <span className={styles.targetText}>{targetInfo.title}</span>
                              </div>
                              <div className={styles.targetMeta}>
                                <code className={styles.targetId}>{log.targetId}</code>
                                {targetInfo.author !== '-' && (
                                  <span className={styles.targetAuthor}> · {targetInfo.author}</span>
                                )}
                              </div>
                            </div>
                          )
                        }
                        return <code className={styles.targetId}>{log.targetId}</code>
                      })()}
                    </td>
                    <td>{log.details}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// 공지사항 관리 컴포넌트
function NoticeManagement({ 
  notices, 
  formatDate 
}: { 
  notices: Notice[]
  formatDate: (date: string) => string 
}) {
  const { updateNotices } = useMockData()
  const [showModal, setShowModal] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isImportant: false
  })

  const handleAddClick = () => {
    setEditingNotice(null)
    setFormData({
      title: '',
      content: '',
      isImportant: false
    })
    setShowModal(true)
  }

  const handleEditClick = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      isImportant: notice.isImportant
    })
    setShowModal(true)
  }

  const handleDeleteClick = (noticeId: string) => {
    setDeleteNoticeId(noticeId)
  }

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    const now = new Date().toISOString()

    if (editingNotice) {
      // 수정
      updateNotices((prev) =>
        prev.map((notice) =>
          notice.id === editingNotice.id
            ? {
                ...notice,
                title: formData.title,
                content: formData.content,
                isImportant: formData.isImportant,
                updatedAt: now
              }
            : notice
        )
      )
      alert('공지사항이 수정되었습니다.')
    } else {
      // 새로 작성
      const newNotice: Notice = {
        id: `notice-${Date.now()}`,
        title: formData.title,
        content: formData.content,
        isImportant: formData.isImportant,
        createdAt: now,
        updatedAt: now
      }
      updateNotices((prev) => [newNotice, ...prev])
      alert('공지사항이 작성되었습니다.')
    }

    setShowModal(false)
    setEditingNotice(null)
    setFormData({
      title: '',
      content: '',
      isImportant: false
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteNoticeId) {
      updateNotices((prev) => prev.filter((notice) => notice.id !== deleteNoticeId))
      alert('공지사항이 삭제되었습니다.')
      setDeleteNoticeId(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>공지사항 관리</h1>
        <button className={styles.addButton} onClick={handleAddClick}>
          새 공지 작성
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>제목</th>
                <th>중요</th>
                <th>작성일</th>
                <th>수정일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((notice) => (
                <tr key={notice.id}>
                  <td>
                    <div className={styles.titleCell}>
                      {notice.isImportant && <span className={styles.importantBadge}>중요</span>}
                      {notice.title}
                    </div>
                  </td>
                  <td>
                    {notice.isImportant ? (
                      <span className={styles.badge}>✓</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>{formatDate(notice.createdAt)}</td>
                  <td>{formatDate(notice.updatedAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleEditClick(notice)}
                      >
                        수정
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteClick(notice.id)}
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
      </div>

      {/* 작성/수정 모달 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingNotice ? '공지사항 수정' : '새 공지사항 작성'}</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>제목 *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="공지사항 제목을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>내용 *</label>
                <textarea
                  className={styles.textarea}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="공지사항 내용을 입력하세요"
                  rows={8}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isImportant}
                    onChange={(e) => setFormData({ ...formData, isImportant: e.target.checked })}
                  />
                  <span>중요 공지로 설정</span>
                </label>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSave}
              >
                {editingNotice ? '수정' : '작성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteNoticeId !== null}
        onClose={() => setDeleteNoticeId(null)}
        title="공지사항 삭제"
        message="정말로 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        type="warning"
      />
    </div>
  )
}

// FAQ 관리 컴포넌트
function FAQManagement({ 
  faqs, 
  formatDate 
}: { 
  faqs: FAQ[]
  formatDate: (date: string) => string 
}) {
  const { updateFAQs } = useMockData()
  const [showModal, setShowModal] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null)
  const [deleteFAQId, setDeleteFAQId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    category: '',
    question: '',
    answer: '',
    order: 1
  })

  const handleAddClick = () => {
    setEditingFAQ(null)
    setFormData({
      category: '',
      question: '',
      answer: '',
      order: faqs.length > 0 ? Math.max(...faqs.map(f => f.order)) + 1 : 1
    })
    setShowModal(true)
  }

  const handleEditClick = (faq: FAQ) => {
    setEditingFAQ(faq)
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      order: faq.order
    })
    setShowModal(true)
  }

  const handleDeleteClick = (faqId: string) => {
    setDeleteFAQId(faqId)
  }

  const handleSave = () => {
    if (!formData.category.trim() || !formData.question.trim() || !formData.answer.trim()) {
      alert('카테고리, 질문, 답변을 모두 입력해주세요.')
      return
    }

    if (formData.order < 1) {
      alert('순서는 1 이상이어야 합니다.')
      return
    }

    const now = new Date().toISOString()

    if (editingFAQ) {
      // 수정
      updateFAQs((prev) =>
        prev.map((faq) =>
          faq.id === editingFAQ.id
            ? {
                ...faq,
                category: formData.category,
                question: formData.question,
                answer: formData.answer,
                order: formData.order,
                updatedAt: now
              }
            : faq
        )
      )
      alert('FAQ가 수정되었습니다.')
    } else {
      // 새로 작성
      const newFAQ: FAQ = {
        id: `faq-${Date.now()}`,
        category: formData.category,
        question: formData.question,
        answer: formData.answer,
        order: formData.order,
        createdAt: now,
        updatedAt: now
      }
      updateFAQs((prev) => [...prev, newFAQ].sort((a, b) => a.order - b.order))
      alert('FAQ가 작성되었습니다.')
    }

    setShowModal(false)
    setEditingFAQ(null)
    setFormData({
      category: '',
      question: '',
      answer: '',
      order: 1
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteFAQId) {
      updateFAQs((prev) => prev.filter((faq) => faq.id !== deleteFAQId))
      alert('FAQ가 삭제되었습니다.')
      setDeleteFAQId(null)
    }
  }

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const items = Array.from(faqs).sort((a, b) => a.order - b.order)
    const [reorderedItem] = items.splice(draggedIndex, 1)
    items.splice(dropIndex, 0, reorderedItem)

    // 순서 업데이트
    const now = new Date().toISOString()
    updateFAQs((prev) =>
      items.map((faq, index) => ({
        ...faq,
        order: index + 1,
        updatedAt: now
      }))
    )

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>FAQ 관리</h1>
        <button className={styles.addButton} onClick={handleAddClick}>
          새 FAQ 작성
        </button>
      </div>
      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>카테고리</th>
                <th>질문</th>
                <th>답변</th>
                <th>순서</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {faqs.sort((a, b) => a.order - b.order).map((faq, index) => (
                <tr
                  key={faq.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    ${draggedIndex === index ? styles.dragging : ''}
                    ${dragOverIndex === index ? styles.dragOver : ''}
                  `}
                >
                  <td 
                    className={styles.dragHandle}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span className={styles.dragIcon}>⋮⋮</span>
                  </td>
                  <td>
                    <span className={styles.category}>{faq.category}</span>
                  </td>
                  <td>{faq.question}</td>
                  <td>
                    <div className={styles.answerCell}>
                      {faq.answer.length > 50 
                        ? `${faq.answer.substring(0, 50)}...` 
                        : faq.answer}
                    </div>
                  </td>
                  <td>{faq.order}</td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.actionBtn}
                        onClick={() => handleEditClick(faq)}
                      >
                        수정
                      </button>
                      <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => handleDeleteClick(faq.id)}
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
      </div>

      {/* 작성/수정 모달 */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingFAQ ? 'FAQ 수정' : '새 FAQ 작성'}</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>카테고리 *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="예: 회원가입, 포인트, 라이브 스페이스"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>질문 *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="FAQ 질문을 입력하세요"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>답변 *</label>
                <textarea
                  className={styles.textarea}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="FAQ 답변을 입력하세요"
                  rows={6}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>순서 *</label>
                <input
                  type="number"
                  className={styles.input}
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  min="1"
                  placeholder="표시 순서"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSave}
              >
                {editingFAQ ? '수정' : '작성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteFAQId !== null}
        onClose={() => setDeleteFAQId(null)}
        title="FAQ 삭제"
        message="정말로 이 FAQ를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        type="warning"
      />
    </div>
  )
}

// 운영자 계정 관리 컴포넌트
function OperatorManagement({ 
  operators, 
  formatDate,
  isSuperAdmin
}: { 
  operators: Operator[]
  formatDate: (date: string) => string
  isSuperAdmin: boolean
}) {
  const { updateOperators } = useMockData()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false)
  const [roleChangeOperator, setRoleChangeOperator] = useState<Operator | null>(null)
  const [newRole, setNewRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN')
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    permissions: [] as string[]
  })

  const handleAddClick = () => {
    if (!isSuperAdmin) {
      alert('SUPER_ADMIN만 새 운영자를 추가할 수 있습니다.')
      return
    }
    setFormData({
      email: '',
      nickname: '',
      role: 'ADMIN',
      permissions: []
    })
    setShowAddModal(true)
  }

  const handleRoleChangeClick = (operator: Operator) => {
    if (!isSuperAdmin) {
      alert('SUPER_ADMIN만 역할을 변경할 수 있습니다.')
      return
    }
    setRoleChangeOperator(operator)
    setNewRole(operator.role === 'SUPER_ADMIN' ? 'ADMIN' : 'SUPER_ADMIN')
    setShowRoleChangeModal(true)
  }

  const handleSave = () => {
    if (!formData.email.trim() || !formData.nickname.trim()) {
      alert('이메일과 닉네임을 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert('올바른 이메일 형식을 입력해주세요.')
      return
    }

    const now = new Date().toISOString()

    // 중복 이메일 체크
    const emailExists = operators.some(op => op.email === formData.email)
    if (emailExists) {
      alert('이미 존재하는 이메일입니다.')
      return
    }

    const newOperator: Operator = {
      id: `op-${Date.now()}`,
      email: formData.email,
      nickname: formData.nickname,
      role: formData.role,
      permissions: formData.role === 'SUPER_ADMIN' ? ['all'] : ['moderate', 'view'],
      lastLoginAt: now,
      createdAt: now
    }
    updateOperators((prev) => [...prev, newOperator])
    alert('새 운영자가 추가되었습니다.')

    setShowAddModal(false)
    setFormData({
      email: '',
      nickname: '',
      role: 'ADMIN',
      permissions: []
    })
  }

  const handleRoleChangeConfirm = () => {
    if (!roleChangeOperator) return

    updateOperators((prev) =>
      prev.map((op) =>
        op.id === roleChangeOperator.id
          ? {
              ...op,
              role: newRole,
              permissions: newRole === 'SUPER_ADMIN' ? ['all'] : ['moderate', 'view']
            }
          : op
      )
    )
    alert('역할이 변경되었습니다.')
    setShowRoleChangeModal(false)
    setRoleChangeOperator(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>운영자 계정 관리</h1>
        {isSuperAdmin && (
          <button className={styles.addButton} onClick={handleAddClick}>
            새 운영자 추가
          </button>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이메일</th>
                <th>닉네임</th>
                <th>역할</th>
                <th>권한</th>
                <th>마지막 로그인</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op.id}>
                  <td>{op.email}</td>
                  <td>{op.nickname}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      op.role === 'SUPER_ADMIN' ? styles.superAdmin : styles.admin
                    }`}>
                      {op.role}
                    </span>
                  </td>
                  <td>
                    <div className={styles.permissions}>
                      {op.permissions.join(', ')}
                    </div>
                  </td>
                  <td>{formatDate(op.lastLoginAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      {isSuperAdmin && (
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleRoleChangeClick(op)}
                        >
                          역할 변경
                        </button>
                      )}
                      {!isSuperAdmin && (
                        <span style={{ color: '#999', fontSize: '12px' }}>변경 불가</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 새 운영자 추가 모달 */}
      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>새 운영자 추가</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>이메일 *</label>
                <input
                  type="email"
                  className={styles.input}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="operator@example.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>닉네임 *</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="운영자 닉네임"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>역할 *</label>
                <select
                  className={styles.input}
                  value={formData.role}
                  onChange={(e) => {
                    const role = e.target.value as 'ADMIN' | 'SUPER_ADMIN'
                    setFormData({ 
                      ...formData, 
                      role,
                      permissions: role === 'SUPER_ADMIN' ? ['all'] : ['moderate', 'view']
                    })
                  }}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>권한</label>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {formData.role === 'SUPER_ADMIN' 
                    ? 'SUPER_ADMIN은 모든 권한(all)을 가집니다.'
                    : 'ADMIN은 moderate, view 권한을 가집니다.'}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {formData.permissions.join(', ') || '자동 설정됨'}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleSave}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 역할 변경 모달 */}
      {showRoleChangeModal && roleChangeOperator && (
        <div className={styles.modalOverlay} onClick={() => setShowRoleChangeModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>역할 변경</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowRoleChangeModal(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label}>운영자</label>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>{roleChangeOperator.nickname}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{roleChangeOperator.email}</div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>현재 역할</label>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                  <span className={`${styles.badge} ${
                    roleChangeOperator.role === 'SUPER_ADMIN' ? styles.superAdmin : styles.admin
                  }`}>
                    {roleChangeOperator.role}
                  </span>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>변경할 역할 *</label>
                <select
                  className={styles.input}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'SUPER_ADMIN')}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>권한</label>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {newRole === 'SUPER_ADMIN' 
                    ? 'SUPER_ADMIN은 모든 권한(all)을 가집니다.'
                    : 'ADMIN은 moderate, view 권한을 가집니다.'}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton}
                onClick={() => setShowRoleChangeModal(false)}
              >
                취소
              </button>
              <button 
                className={styles.saveButton}
                onClick={handleRoleChangeConfirm}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

