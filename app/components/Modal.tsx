'use client'

import { ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  type?: 'danger' | 'warning' | 'info'
  children?: ReactNode
}

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  type = 'info',
  children
}: ModalProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm()
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div className={styles.body}>
          {children ? children : message && <p className={styles.message}>{message}</p>}
        </div>
        {onConfirm && (
          <div className={styles.footer}>
            <button 
              className={`${styles.button} ${styles.cancelButton}`}
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button 
              className={`${styles.button} ${styles.confirmButton} ${styles[type]}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

