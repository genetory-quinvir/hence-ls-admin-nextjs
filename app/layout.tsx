import type { Metadata } from 'next'
import { MockDataProvider } from './context/MockDataContext'
import { AuthProvider } from './context/AuthContext'
import { ApiBaseUrlProvider } from './context/ApiBaseUrlContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hence Live Space',
  description: 'Hence Live Space Admin Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <ApiBaseUrlProvider>
            <MockDataProvider>
              {children}
            </MockDataProvider>
          </ApiBaseUrlProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

