'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Farmer } from '@/components/FarmerMap'

// Leaflet must not run on the server
const FarmerMap = dynamic(() => import('@/components/FarmerMap'), { ssr: false })

type FilterType = 'all' | 'active1h' | 'active24h' | 'inactive'

function ago(iso: string | null) {
  if (!iso) return '—'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function statusColor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '#94a3b8'
  const ms = Date.now() - new Date(lastSeenAt).getTime()
  if (ms < 3_600_000) return '#22c55e'
  if (ms < 86_400_000) return '#f97316'
  return '#ef4444'
}

function matchesFilter(f: Farmer, filter: FilterType): boolean {
  if (filter === 'all') return true
  if (!f.lastSeenAt) return filter === 'inactive'
  const ms = Date.now() - new Date(f.lastSeenAt).getTime()
  if (filter === 'active1h') return ms < 3_600_000
  if (filter === 'active24h') return ms < 86_400_000
  if (filter === 'inactive') return ms >= 86_400_000
  return true
}

export default function Page() {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showPanel, setShowPanel] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const res = await fetch('/api/farmers')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      setFarmers(data.farmers ?? [])
      setFetchedAt(new Date())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      if (manual) setRefreshing(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    load()
  }, [load])

  // Auto-refresh timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoRefresh) timerRef.current = setInterval(() => load(), 14_400_000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, load])

  // Derived counts
  const activeHour = farmers.filter(
    (f) => f.lastSeenAt && Date.now() - new Date(f.lastSeenAt).getTime() < 3_600_000
  ).length
  const activeDay = farmers.filter(
    (f) => f.lastSeenAt && Date.now() - new Date(f.lastSeenAt).getTime() < 86_400_000
  ).length
  const withGps = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0)).length

  // Side-panel list: filter + search + sort by recency
  const panelList = farmers
    .filter((f) => matchesFilter(f, filter))
    .filter(
      (f) =>
        !search.trim() ||
        f.id.toLowerCase().includes(search.toLowerCase().trim())
    )
    .sort((a, b) => {
      if (!a.lastSeenAt && !b.lastSeenAt) return 0
      if (!a.lastSeenAt) return 1
      if (!b.lastSeenAt) return -1
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    })

  // Map shows the filtered set; when searching, show only matched farmers
  const mapFarmers = search.trim()
    ? farmers.filter((f) =>
        f.id.toLowerCase().includes(search.toLowerCase().trim())
      )
    : farmers.filter((f) => matchesFilter(f, filter))

  // Auto-select when search narrows to exactly one farmer
  useEffect(() => {
    if (search.trim() && panelList.length === 1) {
      setSelectedId(panelList[0].id)
    }
  }, [search, panelList])

  const selectedFarmer = farmers.find((f) => f.id === selectedId) ?? null

  const filterLabels: Record<FilterType, string> = {
    all: `All (${farmers.length})`,
    active1h: `<1h (${activeHour})`,
    active24h: `<24h (${activeDay})`,
    inactive: `Old (${farmers.length - activeDay})`,
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0f172a',
        color: '#f1f5f9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexShrink: 0,
          flexWrap: 'wrap',
          rowGap: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
          🌾 HHG Farmer Activity
        </span>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <Stat label="Total" value={farmers.length} />
          <Stat label="On map" value={withGps} />
          <Stat label="Active 1h" value={activeHour} color="#22c55e" />
          <Stat label="Active 24h" value={activeDay} color="#f97316" />
          <Stat label="Inactive" value={farmers.length - activeDay} color="#ef4444" />
        </div>

        {/* Right-side controls */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {/* DB fetch timestamp */}
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              textAlign: 'right',
              lineHeight: 1.4,
              minWidth: 110,
            }}
          >
            {fetchedAt ? (
              <>
                <div style={{ color: '#64748b' }}>DB fetched</div>
                <div>
                  {fetchedAt.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                </div>
                <div style={{ color: '#475569' }}>{ago(fetchedAt.toISOString())}</div>
              </>
            ) : (
              <div>Not loaded</div>
            )}
          </div>

          <Btn
            active={autoRefresh}
            title={autoRefresh ? 'Auto-refresh ON (4 h) — click to pause' : 'Auto-refresh paused — click to resume'}
            onClick={() => setAutoRefresh((v) => !v)}
            activeColor="#166534"
          >
            {autoRefresh ? '⟳ Live' : '⏸ Paused'}
          </Btn>

          <Btn
            onClick={() => load(true)}
            disabled={refreshing}
            title="Pull latest data from Firestore now"
          >
            {refreshing ? '⟳ Fetching…' : '↻ Refresh DB'}
          </Btn>

          <Btn
            active={showHeatmap}
            activeColor="#7c3aed"
            title="Toggle density heatmap overlay"
            onClick={() => setShowHeatmap((v) => !v)}
          >
            🔥 Heatmap
          </Btn>

          <Btn
            title="Toggle farmer list panel"
            onClick={() => setShowPanel((v) => !v)}
          >
            {showPanel ? '◀ List' : '▶ List'}
          </Btn>

          <Link
            href="/send"
            style={{
              background: '#f97316',
              color: '#fff',
              padding: '5px 12px',
              borderRadius: 6,
              fontSize: 12,
              textDecoration: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            📢 Push
          </Link>
        </div>
      </header>

      {/* ── Legend ── */}
      <div
        style={{
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '5px 20px',
          display: 'flex',
          gap: 18,
          fontSize: 11,
          color: '#94a3b8',
          flexShrink: 0,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <LegendDot color="#22c55e" label="Active < 1h" />
        <LegendDot color="#f97316" label="Active < 24h" />
        <LegendDot color="#ef4444" label="Older" />
        <LegendDot color="#94a3b8" label="No GPS" />
        <LegendDot color="#64748b" label="Past ping" />
        <span style={{ color: '#475569', marginLeft: 4 }}>
          Click dot → select &amp; load trail · Search by ID in the panel
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Side panel */}
        {showPanel && (
          <div
            style={{
              width: 270,
              background: '#1e293b',
              borderRight: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Search */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search farmer ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  color: '#f1f5f9',
                  padding: '7px 10px',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              {search && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  {panelList.length} result{panelList.length !== 1 ? 's' : ''}
                  {panelList.length === 1 && ' — zooming…'}
                </div>
              )}
            </div>

            {/* Filter tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #334155',
                flexShrink: 0,
              }}
            >
              {(Object.keys(filterLabels) as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    background: filter === f ? '#263354' : 'transparent',
                    border: 'none',
                    borderBottom: filter === f ? '2px solid #f97316' : '2px solid transparent',
                    color: filter === f ? '#f1f5f9' : '#64748b',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: filter === f ? 700 : 400,
                  }}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>

            {/* Farmer list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {panelList.map((f) => (
                <FarmerRow
                  key={f.id}
                  farmer={f}
                  selected={selectedId === f.id}
                  onClick={() => setSelectedId(selectedId === f.id ? null : f.id)}
                />
              ))}
              {panelList.length === 0 && !loading && (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: 13,
                  }}
                >
                  No farmers match
                </div>
              )}
              {loading && (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: 13,
                  }}
                >
                  Loading…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={centeredStyle}>
              <span style={{ fontSize: 14, color: '#94a3b8' }}>Loading farmer data…</span>
            </div>
          )}
          {error && (
            <div
              style={{
                ...centeredStyle,
                flexDirection: 'column',
                gap: 12,
                textAlign: 'center',
                padding: 32,
              }}
            >
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ color: '#f87171', fontSize: 14 }}>{error}</span>
              {error.includes('not configured') && (
                <pre
                  style={{
                    background: '#1e293b',
                    padding: 16,
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#94a3b8',
                    textAlign: 'left',
                  }}
                >
                  cp .env.local.example .env.local{'\n'}
                  # then fill in your Firebase service account credentials
                </pre>
              )}
            </div>
          )}
          {!loading && !error && (
            <FarmerMap
              farmers={mapFarmers}
              selectedFarmerId={selectedId}
              onSelectFarmer={setSelectedId}
              showHeatmap={showHeatmap}
            />
          )}

          {/* Selected farmer info overlay (bottom-right) */}
          {selectedFarmer && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: '12px 16px',
                zIndex: 1000,
                minWidth: 210,
                fontSize: 12,
                color: '#f1f5f9',
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>
                    {selectedFarmer.id}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: statusColor(selectedFarmer.lastSeenAt),
                      marginTop: 1,
                    }}
                  >
                    {selectedFarmer.lastSeenAt
                      ? ago(selectedFarmer.lastSeenAt)
                      : 'No ping recorded'}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: 18,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 3,
                  color: '#64748b',
                  fontSize: 11,
                }}
              >
                <Row label="Source" value={selectedFarmer.lastSource || '—'} />
                <Row
                  label="Device"
                  value={`${selectedFarmer.deviceManufacturer} ${selectedFarmer.deviceModel}`.trim() || '—'}
                />
                <Row label="App" value={`v${selectedFarmer.appVersion} (SDK ${selectedFarmer.androidSdk})`} />
                {!(selectedFarmer.lastLat === 0 && selectedFarmer.lastLng === 0) && (
                  <Row
                    label="Coords"
                    value={`${selectedFarmer.lastLat.toFixed(4)}, ${selectedFarmer.lastLng.toFixed(4)}`}
                    mono
                  />
                )}
                {selectedFarmer.lastAccuracyM > 0 && (
                  <Row label="Accuracy" value={`±${Math.round(selectedFarmer.lastAccuracyM)}m`} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Small reusable components ── */

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: color ?? '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>{label}</div>
    </div>
  )
}

function Btn({
  children,
  onClick,
  disabled,
  title,
  active,
  activeColor = '#334155',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  active?: boolean
  activeColor?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? activeColor : '#334155',
        border: 'none',
        color: disabled ? '#94a3b8' : '#f1f5f9',
        padding: '5px 12px',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  )
}

function FarmerRow({
  farmer,
  selected,
  onClick,
}: {
  farmer: Farmer
  selected: boolean
  onClick: () => void
}) {
  const hasGps = !(farmer.lastLat === 0 && farmer.lastLng === 0)
  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderBottom: '1px solid #1a2540',
        cursor: 'pointer',
        background: selected ? '#263354' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.background = '#1e2d48'
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent'
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColor(farmer.lastSeenAt),
          flexShrink: 0,
          display: 'inline-block',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#f1f5f9',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {farmer.id}
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
          {farmer.lastSeenAt ? ago(farmer.lastSeenAt) : 'No ping'}
          {farmer.deviceManufacturer ? ` · ${farmer.deviceManufacturer}` : ''}
          {farmer.appVersion ? ` · v${farmer.appVersion}` : ''}
        </div>
      </div>
      {hasGps && (
        <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>📍</span>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <span style={{ color: '#475569' }}>{label}: </span>
      <span
        style={{
          color: '#cbd5e1',
          fontFamily: mono ? 'monospace' : undefined,
          fontSize: mono ? 10 : undefined,
        }}
      >
        {value}
      </span>
    </div>
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
