'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useApiBaseUrl } from '../context/ApiBaseUrlContext'
import styles from './Login.module.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { environment, setEnvironment } = useApiBaseUrl()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (!result.success) {
        setError(result.error || '이메일 또는 비밀번호가 올바르지 않습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>Hence Live Space Admin</h1>
          <p className={styles.loginSubtitle}>관리자 로그인</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="admin@quinvir.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className={styles.environmentSelect}>
          <span className={styles.envTitle}>환경 선택</span>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioLabel} ${environment === 'live' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="environment"
                value="live"
                checked={environment === 'live'}
                onChange={() => setEnvironment('live', true)}
                disabled={isLoading}
                className={styles.radioInput}
              />
              <span className={styles.radioButton}></span>
              <span className={styles.radioText}>라이브</span>
            </label>
            <label className={`${styles.radioLabel} ${environment === 'dev' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="environment"
                value="dev"
                checked={environment === 'dev'}
                onChange={() => setEnvironment('dev', true)}
                disabled={isLoading}
                className={styles.radioInput}
              />
              <span className={styles.radioButton}></span>
              <span className={styles.radioText}>개발</span>
            </label>
          </div>
        </div>

        <div className={styles.loginFooter}>
          <p className={styles.footerText}>
            Quinvir 직원 이메일(@quinvir.com)로 로그인 가능
          </p>
        </div>
      </div>
    </div>
  )
}

