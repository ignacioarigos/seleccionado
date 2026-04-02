'use client'
import './globals.css'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { sb } from '@/lib/supabase'
import { useStore } from '@/lib/store'

const TABS = [
  { id: 'resumen',      label: '📊 Resumen' },
  { id: 'jugadores',    label: '👥 Jugadores' },
  { id: 'pagos',        label: '💰 Pagos' },
  { id: 'viaje',        label: '🚌 Viaje' },
  { id: 'habitaciones', label: '🏨 Hab.' },
  { id: 'buenafe',      label: '📋 Lista BF' },
  { id: 'indumentaria', label: '👕 Ropa' },
  { id: 'caja',         label: '💵 Caja' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const { syncState, toastMsg, toastTipo, jugadores, loadAll, syncFromDB } = useStore()
  const syncRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auth check + initial load
  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        loadAll()
      }
    })
  }, [])

  // Polling sync
  useEffect(() => {
    syncRef.current = setInterval(syncFromDB, 8000)
    const onVisible = () => { if (document.visibilityState === 'visible') syncFromDB() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      if (syncRef.current) clearInterval(syncRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const isLogin = pathname === '/login'
  if (isLogin) return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )

  const activeTab = TABS.find(t => pathname.startsWith('/' + t.id))?.id ?? 'resumen'
  const jugadores_list = jugadores.filter(j => (j.rol || 'jugador') === 'jugador')
  const comitiva_list  = jugadores.filter(j => j.rol === 'comitiva')

  return (
    <html lang="es">
      <body>
        {/* Header */}
        <div className="header">
          <div className="header-inner">
            <div>
              <h1>⚽ Catamarca 2026</h1>
              <div className="header-fecha">29 Abr — 3 May 2026</div>
            </div>
            <div className="header-right">
              <div className={`sync-dot ${syncState === 'syncing' ? 'syncing' : syncState === 'err' ? 'err' : ''}`} title="Estado conexión" />
              <div className="header-badge">
                {jugadores_list.length} jugs · {comitiva_list.length} com.
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <Link
              key={t.id}
              href={`/${t.id}`}
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Page content */}
        <div className="content">
          {children}
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className={`toast show ${toastTipo}`}>
            {toastMsg}
          </div>
        )}
      </body>
    </html>
  )
}
