'use client'

import { useState, useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import { Comment } from '../data/mockData'
import Modal from './Modal'
import styles from './CommentList.module.css'

interface CommentListProps {
  menuId: string
}

export default function CommentList({ menuId }: CommentListProps) {
  const { comments, updateComments, feeds } = useMockData()
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'delete' | 'warn' | null
    comment: Comment | null
  }>({
    isOpen: false,
    type: null,
    comment: null,
  })

  // 피드 정보 가져오기
  const getFeedInfo = (feedId: string) => {
    const feed = feeds.find(f => f.id === feedId)
    if (feed) {
      return {
        content: feed.content.length > 40 ? feed.content.substring(0, 40) + '...' : feed.content,
        fullContent: feed.content,
        author: feed.authorNickname
      }
    }
    return null
  }

  // menuId에 따라 필터링
  const filteredComments = useMemo(() => {
    switch (menuId) {
      case 'comment-all':
        return comments
      case 'comment-reported':
        return comments.filter(comment => comment.reportedCount > 0)
      default:
        return comments
    }
  }, [comments, menuId])

  // 정렬: 신고 건수 많은 순, 그 다음 최신순
  const sortedComments = useMemo(() => {
    return [...filteredComments].sort((a, b) => {
      if (menuId === 'comment-reported') {
        // 신고된 댓글은 신고 건수 많은 순
        if (b.reportedCount !== a.reportedCount) {
          return b.reportedCount - a.reportedCount
        }
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [filteredComments, menuId])

  const getMenuTitle = () => {
    switch (menuId) {
      case 'comment-all':
        return '전체 댓글'
      case 'comment-reported':
        return '신고된 댓글'
      default:
        return '댓글 관리'
    }
  }

  const handleDelete = (comment: Comment) => {
    setModalState({
      isOpen: true,
      type: 'delete',
      comment,
    })
  }

  const handleWarn = (comment: Comment) => {
    setModalState({
      isOpen: true,
      type: 'warn',
      comment,
    })
  }

  const confirmAction = () => {
    if (!modalState.comment) return

    if (modalState.type === 'delete') {
      updateComments((prev) => prev.filter((c) => c.id !== modalState.comment!.id))
      alert('댓글이 삭제되었습니다.')
    } else if (modalState.type === 'warn') {
      alert('경고가 부여되었습니다.')
    }

    setModalState({ isOpen: false, type: null, comment: null })
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{getMenuTitle()}</h1>
        {menuId === 'comment-reported' && (
          <div className={styles.headerStats}>
            <span className={styles.statBadge}>
              신고된 댓글: {filteredComments.length}건
            </span>
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>댓글 내용</th>
                <th>작성자</th>
                <th>피드 ID</th>
                <th>신고 수</th>
                <th>작성일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedComments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedComments.map((comment) => (
                  <tr key={comment.id}>
                    <td>
                      <div className={styles.contentCell}>
                        {comment.content}
                        {comment.image && (
                          <span className={styles.hasImage}> [이미지]</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.authorCell}>
                        {comment.authorProfileImage ? (
                          <img 
                            src={comment.authorProfileImage} 
                            alt={comment.authorNickname}
                            className={styles.authorImage}
                          />
                        ) : (
                          <div className={styles.authorPlaceholder}>
                            {comment.authorNickname[0]}
                          </div>
                        )}
                        <span>{comment.authorNickname}</span>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const feedInfo = getFeedInfo(comment.feedId)
                        if (feedInfo) {
                          return (
                            <div className={styles.feedInfo}>
                              <div className={styles.feedContent}>{feedInfo.content}</div>
                              <div className={styles.feedMeta}>
                                <span className={styles.feedIdLabel}>피드 ID: </span>
                                <code className={styles.feedId}>{comment.feedId}</code>
                                <span className={styles.feedAuthor}> · {feedInfo.author}</span>
                              </div>
                            </div>
                          )
                        }
                        return <code className={styles.feedId}>{comment.feedId}</code>
                      })()}
                    </td>
                    <td>
                      {comment.reportedCount > 0 ? (
                        <span className={styles.reportedCountBadge}>
                          신고 {comment.reportedCount}건
                        </span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td>{formatDate(comment.createdAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleDelete(comment)}
                        >
                          삭제
                        </button>
                        <button 
                          className={styles.actionBtn}
                          onClick={() => handleWarn(comment)}
                        >
                          경고
                        </button>
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
        onClose={() => setModalState({ isOpen: false, type: null, comment: null })}
        title={
          modalState.type === 'delete'
            ? '댓글 삭제'
            : '경고 부여'
        }
        message={
          modalState.type === 'delete'
            ? `이 댓글을 삭제하시겠습니까?`
            : `작성자에게 경고를 부여하시겠습니까?`
        }
        confirmText="확인"
        cancelText="취소"
        onConfirm={confirmAction}
        type={modalState.type === 'delete' ? 'danger' : 'warning'}
      />
    </div>
  )
}

