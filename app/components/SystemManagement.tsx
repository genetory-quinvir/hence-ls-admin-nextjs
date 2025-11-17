'use client'

import { useMemo } from 'react'
import { useMockData } from '../context/MockDataContext'
import styles from './SystemManagement.module.css'

interface SystemManagementProps {
  menuId: string
}

export default function SystemManagement({ menuId }: SystemManagementProps) {
  const { appVersions, notices, faqs, operators, permissionLogs } = useMockData()

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
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>공지사항 관리</h1>
          <button className={styles.addButton}>새 공지 작성</button>
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
                        <button className={styles.actionBtn}>수정</button>
                        <button className={styles.actionBtn}>삭제</button>
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

  if (menuId === 'system-faq') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>FAQ 관리</h1>
          <button className={styles.addButton}>새 FAQ 작성</button>
        </div>
        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>카테고리</th>
                  <th>질문</th>
                  <th>답변</th>
                  <th>순서</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq) => (
                  <tr key={faq.id}>
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
                        <button className={styles.actionBtn}>수정</button>
                        <button className={styles.actionBtn}>삭제</button>
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

  if (menuId === 'system-operators') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>운영자 계정 관리</h1>
          <button className={styles.addButton}>새 운영자 추가</button>
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
                        <button className={styles.actionBtn}>수정</button>
                        <button className={styles.actionBtn}>비활성화</button>
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
                      <code className={styles.targetId}>{log.targetId}</code>
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

