'use client'

import { useState, useMemo } from 'react'
import Modal from './Modal'
import styles from './CustomerVoice.module.css'

interface Inquiry {
  id: string
  userId: string
  userNickname: string
  userEmail: string
  title: string
  content: string
  category: string
  status: 'pending' | 'processing' | 'completed'
  createdAt: string
  updatedAt: string
  viewedAt?: string
  response?: string
  respondedAt?: string
  respondedBy?: string
}

// 목업 데이터 (500개 생성)
const generateMockInquiries = (): Inquiry[] => {
  const categories = ['서비스 칭찬', '서비스 불편/제안', '시스템 개선 의견', '시스템 오류 제보', '기타']
  const statuses: ('pending' | 'processing' | 'completed')[] = ['pending', 'processing', 'completed']
  const inquiries: Inquiry[] = []

  for (let i = 500; i >= 1; i--) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const createdAt = new Date(2023, 2, 30 - Math.floor(i / 20), Math.floor(Math.random() * 24), Math.floor(Math.random() * 60))
    const viewedAt = status !== 'pending' ? new Date(createdAt.getTime() + Math.random() * 86400000) : undefined

    inquiries.push({
      id: String(i),
      userId: `user-${i}`,
      userNickname: `사용자${i}`,
      userEmail: 'aaaa@gmail.com',
      title: `${category} 문의 ${i}`,
      content: '서비스가 지연되고 불가합니다. 서비스가 지연되고 불가 서비스가 지연되고 불가 서비스가 지연되고 불가 서비스가 지연되고 불가합니다.',
      category,
      status,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
      viewedAt: viewedAt?.toISOString(),
    })
  }

  return inquiries
}

export default function CustomerVoice() {
  const [inquiries] = useState<Inquiry[]>(generateMockInquiries())
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchType, setSearchType] = useState<string>('email')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [responseText, setResponseText] = useState('')

  // 필터링된 문의 목록
  const filteredInquiries = useMemo(() => {
    let filtered = [...inquiries]

    // 카테고리 필터
    if (filterCategory !== 'all') {
      filtered = filtered.filter(inquiry => inquiry.category === filterCategory)
    }

    // 접수 기간 필터
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(inquiry => new Date(inquiry.createdAt) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter(inquiry => new Date(inquiry.createdAt) <= end)
    }

    // 검색 필터
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      if (searchType === 'email') {
        filtered = filtered.filter(inquiry => 
          inquiry.userEmail.toLowerCase().includes(keyword) ||
          inquiry.userId.toLowerCase().includes(keyword)
        )
      } else {
        filtered = filtered.filter(inquiry => 
          inquiry.content.toLowerCase().includes(keyword) ||
          inquiry.title.toLowerCase().includes(keyword)
        )
      }
    }

    // 최신순 정렬 (번호 역순)
    return filtered.sort((a, b) => Number(b.id) - Number(a.id))
  }, [inquiries, filterCategory, startDate, endDate, searchType, searchKeyword])

  // 페이지네이션
  const totalPages = Math.ceil(filteredInquiries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInquiries = filteredInquiries.slice(startIndex, endIndex)

  // 날짜 포맷
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  // 내용 요약 (50자 제한)
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  // 필터 초기화
  const handleResetFilters = () => {
    setFilterCategory('all')
    setStartDate('')
    setEndDate('')
    setSearchType('email')
    setSearchKeyword('')
    setCurrentPage(1)
  }

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1)
  }

  // 문의 상세 보기
  const handleViewDetail = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setResponseText(inquiry.response || '')
    setIsModalOpen(true)
    
    // 조회 일시 업데이트 (실제로는 API 호출)
    if (!inquiry.viewedAt) {
      inquiry.viewedAt = new Date().toISOString()
    }
  }

  // 답변 저장
  const handleSaveResponse = () => {
    if (!selectedInquiry || !responseText.trim()) {
      alert('답변 내용을 입력해주세요.')
      return
    }

    // 실제로는 API 호출
    selectedInquiry.response = responseText
    selectedInquiry.respondedAt = new Date().toISOString()
    selectedInquiry.respondedBy = '운영자'
    selectedInquiry.status = selectedInquiry.status === 'pending' ? 'processing' : selectedInquiry.status
    selectedInquiry.updatedAt = new Date().toISOString()

    setIsModalOpen(false)
    setSelectedInquiry(null)
    setResponseText('')
    alert('답변이 저장되었습니다.')
  }

  // 카테고리 목록
  const categories = Array.from(new Set(inquiries.map(i => i.category)))

  // 페이지 번호 생성
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>고객의 소리</h1>
        <p className={styles.subtitle}>사용자 1:1 문의 관리</p>
      </div>

      <div className={styles.content}>
        {/* 필터 섹션 */}
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>카테고리</label>
              <select
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">카테고리 선택</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>접수 기간</label>
              <div className={styles.dateRange}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className={styles.dateSeparator}>~</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>검색</label>
              <div className={styles.searchGroup}>
                <select
                  className={styles.searchTypeSelect}
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                >
                  <option value="email">이메일(ID)</option>
                  <option value="content">내용</option>
                </select>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="내용을 입력해주세요"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div className={styles.filterActions}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={handleResetFilters}
              >
                초기화
              </button>
              <button
                type="button"
                className={styles.searchButton}
                onClick={handleSearch}
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* 테이블 요약 및 페이지당 항목 수 */}
        <div className={styles.tableHeader}>
          <div className={styles.totalCount}>
            총 {filteredInquiries.length}개의 항목
          </div>
          <div className={styles.itemsPerPage}>
            <select
              className={styles.itemsPerPageSelect}
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* 테이블 */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No.</th>
                <th>카테고리</th>
                <th>이메일(ID)</th>
                <th>내용</th>
                <th>접수 일시</th>
                <th>조회 일시</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    조건에 맞는 문의가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedInquiries.map((inquiry) => (
                  <tr key={inquiry.id} onClick={() => handleViewDetail(inquiry)} className={styles.tableRow}>
                    <td>{inquiry.id}</td>
                    <td>{inquiry.category}</td>
                    <td>{inquiry.userEmail}</td>
                    <td className={styles.contentCell}>{truncateContent(inquiry.content)}</td>
                    <td>{formatDate(inquiry.createdAt)}</td>
                    <td>{formatDate(inquiry.viewedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 0 && (
          <div className={styles.pagination}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              &lt;
            </button>
            {getPageNumbers().map((page, index) => (
              <button
                key={index}
                className={`${styles.paginationButton} ${page === currentPage ? styles.active : ''} ${page === '...' ? styles.ellipsis : ''}`}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
              >
                {page}
              </button>
            ))}
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedInquiry && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedInquiry(null)
            setResponseText('')
          }}
          title="문의 상세"
        >
          <div className={styles.modalContent}>
            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>문의 정보</h4>
              <div className={styles.modalInfoGrid}>
                <div className={styles.modalInfoItem}>
                  <label>No.</label>
                  <div>{selectedInquiry.id}</div>
                </div>
                <div className={styles.modalInfoItem}>
                  <label>카테고리</label>
                  <div>{selectedInquiry.category}</div>
                </div>
                <div className={styles.modalInfoItem}>
                  <label>이메일(ID)</label>
                  <div>{selectedInquiry.userEmail}</div>
                </div>
                <div className={styles.modalInfoItem}>
                  <label>접수 일시</label>
                  <div>{formatDate(selectedInquiry.createdAt)}</div>
                </div>
                <div className={styles.modalInfoItem}>
                  <label>조회 일시</label>
                  <div>{formatDate(selectedInquiry.viewedAt)}</div>
                </div>
              </div>
            </div>

            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>문의 내용</h4>
              <div className={styles.modalContentBox}>
                {selectedInquiry.content}
              </div>
            </div>

            {selectedInquiry.response && (
              <div className={styles.modalSection}>
                <h4 className={styles.modalSectionTitle}>기존 답변</h4>
                <div className={styles.modalContentBox}>
                  {selectedInquiry.response}
                  {selectedInquiry.respondedBy && selectedInquiry.respondedAt && (
                    <div className={styles.responseMeta}>
                      {selectedInquiry.respondedBy} · {formatDate(selectedInquiry.respondedAt)}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.modalSection}>
              <h4 className={styles.modalSectionTitle}>답변 작성</h4>
              <textarea
                className={styles.responseTextarea}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="답변 내용을 입력해주세요..."
                rows={6}
              />
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.saveButton}
                onClick={handleSaveResponse}
              >
                답변 저장
              </button>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedInquiry(null)
                  setResponseText('')
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
