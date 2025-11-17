'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Feed } from '../data/mockData'
import Modal from './Modal'
import styles from './FeedList.module.css'

export default function FeedList() {
  const { feeds, updateFeeds } = useMockData()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'delete' | 'sanction' | null
    feed: Feed | null
  }>({
    isOpen: false,
    type: null,
    feed: null,
  })

  const handleDelete = (feed: Feed) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      feed,
    })
  }

  const handleSanction = (feed: Feed) => {
    setModalState({
      isOpen: true,
      type: 'sanction',
      feed,
    })
  }

  const confirmAction = () => {
    if (!modalState.feed) return

    if (modalState.type === 'delete') {
      updateFeeds((prev) => prev.filter((f) => f.id !== modalState.feed!.id))
      alert('피드가 삭제되었습니다.')
    } else if (modalState.type === 'sanction') {
      // 작성자 제재 로직은 UserList에서 처리
      alert('작성자 제재 처리가 요청되었습니다.')
    }

    setModalState({ isOpen: false, type: null, feed: null })
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

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>전체 피드</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>내용</th>
                <th>이미지</th>
                <th>작성자</th>
                <th>소속 Live Space</th>
                <th>작성일</th>
                <th>신고건수</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {feeds.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                feeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>
                      <div className={styles.contentCell}>
                        {truncateContent(feed.content)}
                      </div>
                    </td>
                    <td>
                      {feed.images.length > 0 ? (
                        <span className={styles.hasImage}>✓</span>
                      ) : (
                        <span className={styles.noImage}>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.authorCell}>
                        {feed.authorProfileImage ? (
                          <img 
                            src={feed.authorProfileImage} 
                            alt={feed.authorNickname}
                            className={styles.authorImage}
                          />
                        ) : (
                          <div className={styles.authorPlaceholder}>
                            {feed.authorNickname[0]}
                          </div>
                        )}
                        <span>{feed.authorNickname}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.liveSpaceCell}>
                        {feed.liveSpaceTitle}
                      </div>
                    </td>
                    <td>{formatDate(feed.createdAt)}</td>
                    <td>
                      {feed.reportedCount > 0 ? (
                        <span className={styles.reportedBadge}>
                          {feed.reportedCount}
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDelete(feed)}
                        >
                          삭제
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleSanction(feed)}
                        >
                          제재
                        </button>
                        <button className={styles.actionBtn}>신고처리</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, type: null, feed: null })}
        title={
          modalState.type === 'delete'
            ? '피드 삭제'
            : '작성자 제재'
        }
        message={
          modalState.type === 'delete'
            ? `이 피드를 삭제하시겠습니까?`
            : `작성자 "${modalState.feed?.authorNickname}"에게 제재를 부여하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type="danger"
      />
    </div>
  )
}

