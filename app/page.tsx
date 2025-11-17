'use client'

import { useState, useMemo, useEffect } from 'react'
import Sidebar, { MenuItem } from './components/Sidebar'
import DetailView from './components/DetailView'
import Login from './components/Login'
import { useAuth } from './context/AuthContext'
import styles from './page.module.css'

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    id: 'live-space',
    label: 'Live Space 관리',
    icon: '🎥',
    children: [
      { id: 'live-space-list', label: '전체 목록' },
      { id: 'live-space-force-close', label: '강제 종료 큐' },
      { id: 'live-space-reported', label: '신고 접수된 스페이스' },
    ],
  },
  {
    id: 'users',
    label: '사용자 관리',
    icon: '👥',
    children: [
      { id: 'users-list', label: '전체 사용자 리스트' },
      { id: 'users-reported', label: '신고 접수된 사용자' },
      { id: 'users-sanctions', label: '제재/정지 관리' },
    ],
  },
  {
    id: 'feed-comment',
    label: '피드/댓글 관리',
    icon: '💬',
    children: [
      { id: 'feed-all', label: '전체 피드' },
      { id: 'comment-all', label: '전체 댓글' },
      { id: 'feed-reported', label: '신고된 피드' },
      { id: 'comment-reported', label: '신고된 댓글' },
    ],
  },
  {
    id: 'reports',
    label: '신고/모더레이션',
    icon: '🚨',
    children: [
      { id: 'reports-all', label: '전체 신고 내역' },
      { id: 'reports-pending', label: '처리 대기(미처리)' },
      { id: 'reports-completed', label: '처리 완료' },
    ],
  },
  {
    id: 'points-rewards',
    label: '포인트 & 리워드',
    icon: '🎁',
    children: [
      { id: 'points-policy', label: '포인트 정책(읽기)' },
      { id: 'rewards-history', label: '리워드 내역' },
      { id: 'rewards-payment', label: '리워드 지급 관리' },
      { id: 'phone-auth-log', label: '전화번호 인증 로그' },
    ],
  },
  {
    id: 'system',
    label: '시스템 관리',
    icon: '⚙️',
    requiredRole: 'SUPER',
    children: [
      { id: 'system-app-version', label: '앱 버전 관리' },
      { id: 'system-notice', label: '공지사항 관리' },
      { id: 'system-faq', label: 'FAQ 관리' },
      { id: 'system-operators', label: '운영자 계정 관리' },
      { id: 'system-logs', label: '로그(Permission Log)' },
    ],
  },
  {
    id: 'settings',
    label: '설정',
    icon: '🔧',
    children: [
      { id: 'settings-profile', label: '내 정보' },
      { id: 'settings-permissions', label: '권한 안내' },
      { id: 'settings-logout', label: '로그아웃' },
    ],
  },
]

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // 로그인 시 대시보드를 기본으로 표시
  useEffect(() => {
    if (isAuthenticated && !activeMenuId) {
      setActiveMenuId('dashboard')
    } else if (!isAuthenticated) {
      setActiveMenuId(null)
    }
  }, [isAuthenticated, activeMenuId])

  const handleMenuClick = (menuId: string) => {
    setActiveMenuId(menuId)
  }

  const activeMenuLabel = useMemo(() => {
    // 메인 메뉴인 경우
    const mainMenu = menuItems.find(item => item.id === activeMenuId)
    if (mainMenu) return mainMenu.label

    // 서브메뉴인 경우
    for (const item of menuItems) {
      if (item.children) {
        const subMenu = item.children.find(child => child.id === activeMenuId)
        if (subMenu) {
          return `${item.label} > ${subMenu.label}`
        }
      }
    }

    return null
  }, [activeMenuId])

  // 로딩 중이면 아무것도 표시하지 않음 (또는 로딩 스피너)
  if (isLoading) {
    return null
  }

  // 로그인되지 않았으면 로그인 화면 표시
  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div className={styles.container}>
      <Sidebar
        menuItems={menuItems}
        activeMenuId={activeMenuId}
        onMenuClick={handleMenuClick}
      />
      <div className={styles.mainContent}>
        <DetailView
          menuId={activeMenuId}
          menuLabel={activeMenuLabel}
        />
      </div>
    </div>
  )
}

