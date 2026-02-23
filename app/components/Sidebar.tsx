'use client'

import { useState } from 'react'
import { useApiBaseUrl } from '../context/ApiBaseUrlContext'
import styles from './Sidebar.module.css'

export interface SubMenuItem {
  id: string
  label: string
}

export interface MenuItem {
  id: string
  label: string
  icon?: string
  children?: SubMenuItem[]
  requiredRole?: string
  disabled?: boolean
}

interface SidebarProps {
  menuItems: MenuItem[]
  activeMenuId: string | null
  onMenuClick: (menuId: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ menuItems, activeMenuId, onMenuClick, isOpen = true, onClose }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())
  const { environment } = useApiBaseUrl()

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus)
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId)
    } else {
      newExpanded.add(menuId)
    }
    setExpandedMenus(newExpanded)
  }

  const isMenuActive = (item: MenuItem): boolean => {
    if (activeMenuId === item.id) return true
    if (item.children) {
      return item.children.some(child => child.id === activeMenuId)
    }
    return false
  }

  const isSubMenuActive = (subItemId: string): boolean => {
    return activeMenuId === subItemId
  }

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.sidebarHeader}>
        <h1 className={styles.logo}>Hence Live Space</h1>
        <span className={`${styles.envBadge} ${environment === 'dev' ? styles.dev : styles.live}`}>
          {environment === 'dev' ? '개발' : '라이브'}
        </span>
        {onClose && (
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            ×
          </button>
        )}
      </div>
      <nav className={styles.nav}>
        <ul className={styles.menuList}>
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0
            const isDisabled = !!item.disabled
            const isExpanded = expandedMenus.has(item.id)
            const isActive = isMenuActive(item)

            return (
              <li key={item.id}>
                <div className={styles.menuItemWrapper}>
                  <button
                    className={`${styles.menuItem} ${isActive ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return
                      if (hasChildren) {
                        toggleMenu(item.id)
                      } else {
                        onMenuClick(item.id)
                      }
                    }}
                  >
                    {item.icon && <span className={styles.icon}>{item.icon}</span>}
                    <span className={styles.label}>{item.label}</span>
                    {item.requiredRole && (
                      <span className={styles.roleBadge}>{item.requiredRole}</span>
                    )}
                    {hasChildren && (
                      <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>
                        ▼
                      </span>
                    )}
                  </button>
                </div>
                {hasChildren && !isDisabled && isExpanded && (
                  <ul className={styles.subMenuList}>
                    {item.children!.map((subItem) => (
                      <li key={subItem.id}>
                        <button
                          className={`${styles.subMenuItem} ${
                            isSubMenuActive(subItem.id) ? styles.active : ''
                          }`}
                          onClick={() => onMenuClick(subItem.id)}
                        >
                          <span className={styles.subMenuLabel}>{subItem.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
