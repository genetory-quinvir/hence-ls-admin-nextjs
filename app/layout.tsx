import type { Metadata } from 'next'
import { MockDataProvider } from './context/MockDataContext'
import { AuthProvider } from './context/AuthContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hence Live Space Admin',
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
          <MockDataProvider>
            {children}
          </MockDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

