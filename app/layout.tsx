import type { Metadata } from 'next'
import { MockDataProvider } from './context/MockDataContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hence LS Admin',
  description: 'Hence LS Admin Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <MockDataProvider>
          {children}
        </MockDataProvider>
      </body>
    </html>
  )
}

