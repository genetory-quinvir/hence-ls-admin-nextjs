'use client'

import { useState } from 'react'
import Dashboard from './Dashboard'
import BannerManagement from './BannerManagement'
import LiveSpaceList from './LiveSpaceList'
import LiveSpaceCreate from './LiveSpaceCreate'
import LiveSpaceAutomation from './LiveSpaceAutomation'
import KoreanFestivalEvent from './KoreanFestivalEvent'
import UserList from './UserList'
import FeedList from './FeedList'
import CommentList from './CommentList'
import SystemManagement from './SystemManagement'
import PushNotification from './PushNotification'
import TagManagement from './TagManagement'
import ThemeManagement from './ThemeManagement'
import PlaceManagement from './PlaceManagement'
import PlaceReportManagement from './PlaceReportManagement'
import UserReportManagement from './UserReportManagement'
import NoticeManagement from './NoticeManagement'
import FAQManagement from './FAQManagement'
import { useAuth } from '../context/AuthContext'
import { useApiBaseUrl } from '../context/ApiBaseUrlContext'
import { API_BASE_URLS, type ApiEnvironment } from '../lib/api-base-url'
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
      
      // 피쳐드 관리
      case 'featured-banner':
        return <BannerManagement />
      
      // Live Space 관리
      case 'live-space-list':
        return <LiveSpaceList menuId={menuId} />
      case 'live-space-create':
        return <LiveSpaceCreate />
      case 'live-space-automation':
        return <LiveSpaceAutomation />
      case 'live-space-festival':
        return <KoreanFestivalEvent />
      case 'live-space-tags':
        return <TagManagement />
      
      // 사용자 관리
      case 'users-list':
        return <UserList />
      
      // 피드/댓글
      case 'feed-all':
      case 'feed-reported':
        return <FeedList menuId={menuId} />
      case 'comment-all':
      case 'comment-reported':
        return <CommentList menuId={menuId} />
      
      // 신고 관리
      case 'user-report-management':
        return <UserReportManagement />
      case 'place-report-management':
        return <PlaceReportManagement />
      
      // 앱 푸시
      case 'push-all':
      case 'push-role':
      case 'push-individual':
      case 'push-schedules':
        return <PushNotification menuId={menuId} />
      
      // 시스템 관리
      case 'system-app-version':
        return <SystemManagement menuId={menuId} />
      case 'system-notice':
        return <NoticeManagement />
      case 'system-faq':
        return <FAQManagement />
      
      // 설정
      case 'settings-profile':
        return <SettingsProfileView />
      case 'settings-api-environment':
        return <ApiEnvironmentSettingsView />
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

      case 'category-management':
        return <TagManagement />
      case 'theme-management':
        return <ThemeManagement />
      case 'place-management':
        return <PlaceManagement />
      
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

function SettingsProfileView() {
  const { user } = useAuth()

  return (
    <div className={styles.detailView}>
      <div className={styles.header}>
        <h1 className={styles.title}>내 정보</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>계정 정보</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '4px' }}>이메일</label>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{user?.email || '-'}</p>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '4px' }}>닉네임</label>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{user?.nickname || '-'}</p>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '4px' }}>역할</label>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{user?.role || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApiEnvironmentSettingsView() {
  const { environment, setEnvironment } = useApiBaseUrl()
  const [selectedEnvironment, setSelectedEnvironment] = useState<ApiEnvironment>(environment)
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = () => {
    setEnvironment(selectedEnvironment)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const hasChanges = selectedEnvironment !== environment

  return (
    <div className={styles.detailView}>
      <div className={styles.header}>
        <h1 className={styles.title}>API 환경 설정</h1>
      </div>
      <div className={styles.content}>
        <div className={styles.card}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>환경 선택</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '8px' }}>
                환경 선택
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="radio"
                    name="environment"
                    value="dev"
                    checked={selectedEnvironment === 'dev'}
                    onChange={() => setSelectedEnvironment('dev')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>개발</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                  <input
                    type="radio"
                    name="environment"
                    value="live"
                    checked={selectedEnvironment === 'live'}
                    onChange={() => setSelectedEnvironment('live')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>라이브</span>
                </label>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '4px' }}>
                선택한 환경의 API Base URL
              </label>
              <p style={{ fontSize: '14px', fontFamily: 'monospace', color: '#333', background: '#f5f5f5', padding: '8px 12px', borderRadius: '4px' }}>
                {API_BASE_URLS[selectedEnvironment]}
              </p>
            </div>
            <div>
              <label style={{ fontSize: '14px', color: '#666', display: 'block', marginBottom: '4px' }}>
                현재 적용된 API Base URL
              </label>
              <p style={{ fontSize: '14px', fontFamily: 'monospace', color: '#333', background: '#e8f5e9', padding: '8px 12px', borderRadius: '4px' }}>
                {API_BASE_URLS[environment]}
              </p>
            </div>
            <div style={{ padding: '12px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '13px', color: '#856404' }}>
              <strong>주의:</strong> 환경을 변경하면 모든 API 요청이 선택한 환경으로 전송됩니다.
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                style={{
                  padding: '10px 20px',
                  background: hasChanges ? '#4a9eff' : '#ccc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (hasChanges) {
                    e.currentTarget.style.background = '#3a8eef'
                  }
                }}
                onMouseLeave={(e) => {
                  if (hasChanges) {
                    e.currentTarget.style.background = '#4a9eff'
                  }
                }}
              >
                {isSaved ? '저장 완료!' : '저장'}
              </button>
              {hasChanges && (
                <button
                  onClick={() => setSelectedEnvironment(environment)}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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
          <div className={styles.logoutContent}>
            <p className={styles.logoutMessage}>
              {user?.email ? (
                <>
                  현재 로그인된 계정:
                  <strong>{user.email}</strong>
                </>
              ) : (
                '로그아웃 하시겠습니까?'
              )}
            </p>
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
