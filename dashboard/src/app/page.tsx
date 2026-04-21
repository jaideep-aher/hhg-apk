'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useCallback } from 'react'
import type { Farmer } from '@/components/FarmerMap'

// Leaflet must not run on the server
const FarmerMap = dynamic(() => import('@/components/FarmerMap'), { ssr: false })

function ago(iso: string | null) {
  if (!iso) return '—'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function Page() {
  const [farmers, setFarmers]   = useState<Farmer[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/farmers')
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setFarmers(data.farmers)
      setLastRefresh(new Date())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000) // auto-refresh every 30s
    return () => clearInterval(id)
  }, [load])

  const activeToday = farmers.filter((f) => {
    if (!f.lastSeenAt) return false
    return Date.now() - new Date(f.lastSeenAt).getTime() < 86_400_000
  }).length

  const activeHour = farmers.filter((f) => {
    if (!f.lastSeenAt) return false
    return Date.now() - new Date(f.lastSeenAt).getTime() < 3_600_000
  }).length

  const mappable = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🌾 HHG Farmer Activity</span>

        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <Stat label="Total farmers" value={farmers.length} />
          <Stat label="On map" value={mappable.length} />
          <Stat label="Active (1h)" value={activeHour} color="#22c55e" />
          <Stat label="Active (24h)" value={activeToday} color="#f97316" />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94a3b8' }}>
          {lastRefresh && <span>Updated {ago(lastRefresh.toISOString())}</span>}
          <button
            onClick={load}
            style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* Legend */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '6px 20px',
        display: 'flex',
        gap: 20,
        fontSize: 12,
        color: '#94a3b8',
        flexShrink: 0,
      }}>
        <LegendDot color="#22c55e" label="Active < 1h" />
        <LegendDot color="#f97316" label="Active < 24h" />
        <LegendDot color="#ef4444" label="Older" />
        <LegendDot color="#64748b" label="Past ping" />
        <span style={{ marginLeft: 8 }}>Click any dot for details · Small dots = past locations · Line = movement trail</span>
      </div>

      {/* Map or states */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={centeredStyle}>
            <span style={{ fontSize: 14, color: '#94a3b8' }}>Loading farmer data…</span>
          </div>
        )}
        {error && (
          <div style={{ ...centeredStyle, flexDirection: 'column', gap: 12, textAlign: 'center', padding: 32 }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <span style={{ color: '#f87171', fontSize: 14 }}>{error}</span>
            {error.includes('not configured') && (
              <pre style={{ background: '#1e293b', padding: 16, borderRadius: 8, fontSize: 12, color: '#94a3b8', textAlign: 'left' }}>
                cp .env.local.example .env.local{'\n'}
                # then fill in your Firebase service account credentials
              </pre>
            )}
          </div>
        )}
        {!loading && !error && (
          <FarmerMap farmers={farmers} />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: color ?? '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}

const centeredStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f172a',
}
