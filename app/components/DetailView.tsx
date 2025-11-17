'use client'

import Dashboard from './Dashboard'
import LiveSpaceList from './LiveSpaceList'
import UserList from './UserList'
import FeedList from './FeedList'
import ReportList from './ReportList'
import CommentList from './CommentList'
import RewardList from './RewardList'
import SystemManagement from './SystemManagement'
import { useAuth } from '../context/AuthContext'
import styles from './DetailView.module.css'

interface DetailViewProps {
  menuId: string | null
  menuLabel: string | null
}

export default function DetailView({ menuId, menuLabel }: DetailViewProps) {
  if (!menuId) {
    return (
      <div className={styles.detailView}>
        <div className={styles.emptyState}>
          <h2>메뉴를 선택해주세요</h2>
          <p>좌측 메뉴에서 항목을 선택하면 상세 내용이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  // 메뉴 ID에 따라 해당 컴포넌트 렌더링
  const renderContent = () => {
    switch (menuId) {
      case 'dashboard':
        return <Dashboard />
      
      // Live Space 관리
      case 'live-space-list':
      case 'live-space-force-close':
      case 'live-space-reported':
        return <LiveSpaceList menuId={menuId} />
      
      // 사용자 관리
      case 'users-list':
      case 'users-reported':
      case 'users-sanctions':
        return <UserList menuId={menuId} />
      
      // 피드/댓글
      case 'feed-all':
      case 'feed-reported':
        return <FeedList menuId={menuId} />
      case 'comment-all':
      case 'comment-reported':
        return <CommentList menuId={menuId} />
      
      // 신고/모더레이션
      case 'reports-all':
      case 'reports-pending':
      case 'reports-completed':
        return <ReportList menuId={menuId} />
      
      // 포인트 & 리워드
      case 'points-policy':
      case 'rewards-history':
      case 'rewards-payment':
      case 'phone-auth-log':
        return <RewardList menuId={menuId} />
      
      // 시스템 관리
      case 'system-app-version':
      case 'system-notice':
      case 'system-faq':
      case 'system-operators':
      case 'system-logs':
        return <SystemManagement menuId={menuId} />
      
      // 설정
      case 'settings-profile':
      case 'settings-permissions':
        return (
          <div className={styles.detailView}>
            <div className={styles.header}>
              <h1 className={styles.title}>{menuLabel}</h1>
            </div>
            <div className={styles.content}>
              <div className={styles.card}>
                <p>설정 화면은 추후 구현 예정입니다.</p>
              </div>
            </div>
          </div>
        )
      case 'settings-logout':
        return <LogoutView />
      
      default:
        return (
          <div className={styles.detailView}>
            <div className={styles.header}>
              <h1 className={styles.title}>{menuLabel}</h1>
            </div>
            <div className={styles.content}>
              <div className={styles.card}>
                <p>해당 메뉴는 추후 구현 예정입니다.</p>
              </div>
            </div>
          </div>
        )
    }
  }

  return renderContent()
}

function LogoutView() {
  const { logout, user } = useAuth()

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout()
    }
  }

  return (
    <div className={styles.detailView}>
      <div className={styles.header}>
        <h1 className={styles.title}>로그아웃</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ marginBottom: '24px', fontSize: '16px', color: '#666' }}>
              {user?.email && (
                <>
                  현재 로그인된 계정: <strong>{user.email}</strong>
                </>
              )}
            </p>
            <button
              onClick={handleLogout}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#d32f2f'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#f44336'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

