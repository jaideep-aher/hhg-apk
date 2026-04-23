'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { Farmer, Ping } from '@/components/FarmerMap'
import { dotColor, hasGps } from '@/components/FarmerMap'

// Leaflet must not run on the server.
const FarmerMap = dynamic(() => import('@/components/FarmerMap'), { ssr: false })

type ApiResponse =
  | {
      farmers: Farmer[]
      total: number
      fetchedAt: string
      enriched: boolean
    }
  | { error: string }

type StatusFilter = 'all' | 'active1h' | 'active24h' | 'stale' | 'nogps'
type SortKey = 'recent' | 'oldest' | 'id' | 'name' | 'accuracy'

const REFRESH_MS = 30_000

function ago(iso: string | null): string {
  if (!iso) return 'never'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function displayName(f: Farmer): string {
  if (f.name && f.name.trim()) return f.name.trim()
  return `Farmer ${f.id}`
}

function matchesQuery(f: Farmer, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase().trim()
  const haystack = [
    f.id,
    f.name ?? '',
    f.phone ?? '',
    f.address ?? '',
    f.deviceModel,
    f.deviceManufacturer,
    f.lastSource,
    f.appVersion,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

function matchesStatus(f: Farmer, status: StatusFilter): boolean {
  if (status === 'all') return true
  if (status === 'nogps') return !hasGps(f)
  if (!f.lastSeenAt) return status === 'stale'
  const age = Date.now() - new Date(f.lastSeenAt).getTime()
  if (status === 'active1h') return age < 3_600_000
  if (status === 'active24h') return age < 86_400_000
  if (status === 'stale') return age >= 86_400_000
  return true
}

function compareFarmers(a: Farmer, b: Farmer, key: SortKey): number {
  switch (key) {
    case 'recent':
      return (
        (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0) -
        (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0)
      )
    case 'oldest':
      return (
        (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : Infinity) -
        (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : Infinity)
      )
    case 'id':
      return a.id.localeCompare(b.id, undefined, { numeric: true })
    case 'name':
      return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })
    case 'accuracy':
      // Lower accuracy value = tighter fix; -1 (unknown) sinks to bottom.
      const aAcc = a.lastAccuracyM < 0 ? Infinity : a.lastAccuracyM
      const bAcc = b.lastAccuracyM < 0 ? Infinity : b.lastAccuracyM
      return aAcc - bAcc
    default:
      return 0
  }
}

export default function Page() {
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [pings, setPings] = useState<Record<string, Ping[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [enrichSupported, setEnrichSupported] = useState<boolean | null>(null)
  const [tick, setTick] = useState(0) // forces re-render so "Xs ago" stays fresh

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/farmers?enrich=1', { cache: 'no-store' })
      const data = (await res.json()) as ApiResponse
      if ('error' in data) {
        setError(data.error)
        return
      }
      setFarmers(data.farmers)
      setEnrichSupported(data.enriched)
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
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  // Keep relative-time labels fresh without hammering the server.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  // Lazy-load pings for the selected farmer.
  const pingsRef = useRef(pings)
  pingsRef.current = pings

  useEffect(() => {
    if (!selectedId) return
    if (pingsRef.current[selectedId]) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/farmers/${encodeURIComponent(selectedId)}/pings?limit=50`, {
          cache: 'no-store',
        })
        if (!r.ok) return
        const data = (await r.json()) as { pings: Ping[] }
        if (!cancelled) {
          setPings((prev) => ({ ...prev, [selectedId]: data.pings }))
        }
      } catch {
        // ignore — map still renders the summary dot
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  // Merge ping history into farmers for the map component.
  const farmersWithPings = useMemo(
    () =>
      farmers.map((f) => ({
        ...f,
        pings: pings[f.id] ?? [],
      })),
    [farmers, pings]
  )

  // Filtered / sorted list for the sidebar.
  const visible = useMemo(() => {
    const filtered = farmers.filter(
      (f) => matchesQuery(f, query) && matchesStatus(f, status)
    )
    filtered.sort((a, b) => compareFarmers(a, b, sortKey))
    return filtered
  }, [farmers, query, status, sortKey])

  // Stats — computed from the entire dataset, not the filtered view.
  const stats = useMemo(() => {
    const now = Date.now()
    let mapped = 0
    let active1h = 0
    let active24h = 0
    let stale = 0
    let missing = 0
    for (const f of farmers) {
      if (hasGps(f)) mapped++
      if (!f.lastSeenAt) {
        missing++
        continue
      }
      const age = now - new Date(f.lastSeenAt).getTime()
      if (age < 3_600_000) active1h++
      else if (age < 86_400_000) active24h++
      else stale++
    }
    return { mapped, active1h, active24h, stale, missing }
  }, [farmers])

  const selected = useMemo(
    () => (selectedId ? farmers.find((f) => f.id === selectedId) ?? null : null),
    [selectedId, farmers]
  )

  function exportCsv() {
    const header = [
      'id',
      'name',
      'phone',
      'address',
      'lastSeenAt',
      'lastLat',
      'lastLng',
      'lastAccuracyM',
      'lastSource',
      'appVersion',
      'deviceManufacturer',
      'deviceModel',
      'androidSdk',
    ]
    const rows = visible.map((f) => [
      f.id,
      f.name ?? '',
      f.phone ?? '',
      f.address ?? '',
      f.lastSeenAt ?? '',
      f.lastLat,
      f.lastLng,
      f.lastAccuracyM,
      f.lastSource,
      f.appVersion,
      f.deviceManufacturer,
      f.deviceModel,
      f.androidSdk,
    ])
    const csv = [header, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? '')
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(',')
      )
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `farmers-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onSendPush(id: string) {
    window.location.href = `/send?farmerIds=${encodeURIComponent(id)}`
  }

  // void tick so React includes it in the dependency graph without lint noise
  void tick

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ fontSize: 20 }}>🌾</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>HHG Farmer Activity</span>
        </div>

        <div style={styles.statRow}>
          <Stat label="Total" value={farmers.length} />
          <Stat label="On map" value={stats.mapped} />
          <Stat label="Active 1h" value={stats.active1h} color="#22c55e" />
          <Stat label="Active 24h" value={stats.active24h} color="#f97316" />
          <Stat label="Stale" value={stats.stale} color="#ef4444" />
          <Stat label="No GPS" value={stats.missing} color="#94a3b8" />
        </div>

        <div style={styles.headerRight}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {lastRefresh ? `Updated ${ago(lastRefresh.toISOString())}` : 'Loading…'}
          </span>
          <button
            onClick={load}
            style={styles.ghostBtn}
            title="Refresh now (auto every 30s)"
          >
            ↻ Refresh
          </button>
          <button
            onClick={exportCsv}
            style={styles.ghostBtn}
            disabled={visible.length === 0}
            title="Download filtered rows as CSV"
          >
            ⬇ CSV
          </button>
          <Link href="/send" style={styles.primaryBtn}>
            Send push
          </Link>
        </div>
      </header>

      <div style={styles.toolbar}>
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 420 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, id, phone, village, device…"
            style={styles.search}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={styles.clearBtn}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div style={styles.chipRow}>
          <FilterChip label="All" active={status === 'all'} onClick={() => setStatus('all')} count={farmers.length} />
          <FilterChip label="< 1h" color="#22c55e" active={status === 'active1h'} onClick={() => setStatus('active1h')} count={stats.active1h} />
          <FilterChip label="< 24h" color="#f97316" active={status === 'active24h'} onClick={() => setStatus('active24h')} count={stats.active24h} />
          <FilterChip label="Stale" color="#ef4444" active={status === 'stale'} onClick={() => setStatus('stale')} count={stats.stale} />
          <FilterChip label="No GPS" color="#94a3b8" active={status === 'nogps'} onClick={() => setStatus('nogps')} count={farmers.length - stats.mapped} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={styles.select}
          >
            <option value="recent">Most recent</option>
            <option value="oldest">Oldest ping</option>
            <option value="id">Farmer ID</option>
            <option value="name">Name</option>
            <option value="accuracy">Best GPS accuracy</option>
          </select>
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            style={styles.ghostBtn}
            title={sidebarOpen ? 'Hide farmer list' : 'Show farmer list'}
          >
            {sidebarOpen ? '‹ List' : 'List ›'}
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {sidebarOpen && (
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Showing {visible.length} of {farmers.length}
              </span>
              {enrichSupported === false && (
                <span
                  title="BACKEND_URL env var not set — farmer names unavailable. Set BACKEND_URL on the dashboard deploy to enable name search."
                  style={{ fontSize: 10, color: '#fbbf24' }}
                >
                  ⚠ names disabled
                </span>
              )}
            </div>
            <div style={styles.list}>
              {visible.length === 0 && (
                <div style={{ padding: 20, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
                  {farmers.length === 0 ? 'No farmers yet.' : 'No matches.'}
                </div>
              )}
              {visible.map((f) => (
                <FarmerRow
                  key={f.id}
                  farmer={f}
                  selected={selectedId === f.id}
                  onClick={() => setSelectedId(f.id === selectedId ? null : f.id)}
                />
              ))}
            </div>
          </aside>
        )}

        <main style={styles.mapArea}>
          {loading && (
            <div style={styles.centered}>
              <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading farmer data…</span>
            </div>
          )}
          {error && (
            <div style={{ ...styles.centered, flexDirection: 'column', gap: 12, textAlign: 'center', padding: 32 }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <span style={{ color: '#f87171', fontSize: 14 }}>{error}</span>
              {error.includes('not configured') && (
                <pre style={styles.pre}>
                  cp .env.local.example .env.local{'\n'}# then fill in your Firebase service account credentials
                </pre>
              )}
            </div>
          )}
          {!loading && !error && (
            <FarmerMap
              farmers={farmersWithPings}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onSendPush={onSendPush}
            />
          )}

          <div style={styles.legend}>
            <LegendDot color="#22c55e" label="< 1h" />
            <LegendDot color="#f97316" label="< 24h" />
            <LegendDot color="#ef4444" label="older" />
            <LegendDot color="#64748b" label="past ping" />
            <span style={{ color: '#64748b', marginLeft: 'auto' }}>
              {selected ? `Selected: ${displayName(selected)}` : 'Click a dot or row for details'}
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <div style={{ fontWeight: 700, fontSize: 17, color: color ?? '#f1f5f9', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
    </div>
  )
}

function FilterChip({
  label,
  color,
  active,
  onClick,
  count,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
  count: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        border: `1px solid ${active ? '#f97316' : '#334155'}`,
        background: active ? '#431407' : '#1e293b',
        color: '#e2e8f0',
        fontSize: 12,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {color && (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
      )}
      {label}
      <span style={{ color: '#94a3b8', fontSize: 11 }}>({count})</span>
    </button>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
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
  const color = dotColor(farmer.lastSeenAt)
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.row,
        background: selected ? '#1e3a5f' : 'transparent',
        borderLeft: `3px solid ${selected ? '#fbbf24' : 'transparent'}`,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          marginTop: 5,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#f1f5f9',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName(farmer)}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 8 }}>
          <span>#{farmer.id}</span>
          <span>·</span>
          <span>{ago(farmer.lastSeenAt)}</span>
          {!hasGps(farmer) && <span style={{ color: '#fbbf24' }}>· no GPS</span>}
        </div>
        {(farmer.phone || farmer.address) && (
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {farmer.phone && <span>📞 {farmer.phone}</span>}
            {farmer.phone && farmer.address && <span> · </span>}
            {farmer.address && <span>📍 {farmer.address}</span>}
          </div>
        )}
      </div>
    </button>
  )
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0f172a',
  } as React.CSSProperties,
  header: {
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
    flexShrink: 0,
  } as React.CSSProperties,
  brand: { display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
  statRow: {
    display: 'flex',
    gap: 14,
    padding: '0 4px',
    borderLeft: '1px solid #334155',
    borderRight: '1px solid #334155',
    paddingLeft: 16,
    paddingRight: 16,
  } as React.CSSProperties,
  headerRight: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,
  ghostBtn: {
    background: '#334155',
    border: 'none',
    color: '#f1f5f9',
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
  } as React.CSSProperties,
  primaryBtn: {
    background: '#f97316',
    color: '#fff',
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    textDecoration: 'none',
    fontWeight: 600,
  } as React.CSSProperties,
  toolbar: {
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    flexShrink: 0,
  } as React.CSSProperties,
  search: {
    width: '100%',
    padding: '8px 32px 8px 12px',
    borderRadius: 8,
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f1f5f9',
    fontSize: 13,
  } as React.CSSProperties,
  clearBtn: {
    position: 'absolute',
    right: 6,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 6px',
  } as React.CSSProperties,
  chipRow: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  } as React.CSSProperties,
  select: {
    padding: '6px 10px',
    borderRadius: 6,
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f1f5f9',
    fontSize: 12,
    cursor: 'pointer',
  } as React.CSSProperties,
  body: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  } as React.CSSProperties,
  sidebar: {
    width: 320,
    background: '#0b1324',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  } as React.CSSProperties,
  sidebarHeader: {
    padding: '8px 12px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  list: {
    flex: 1,
    overflowY: 'auto',
  } as React.CSSProperties,
  row: {
    width: '100%',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    border: 'none',
    borderBottom: '1px solid #1e293b',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'inherit',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  mapArea: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  } as React.CSSProperties,
  centered: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    zIndex: 500,
  } as React.CSSProperties,
  legend: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    zIndex: 500,
    background: 'rgba(15, 23, 42, 0.9)',
    color: '#cbd5e1',
    border: '1px solid #334155',
    padding: '6px 10px',
    borderRadius: 6,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    fontSize: 11,
    maxWidth: 'calc(100% - 20px)',
  } as React.CSSProperties,
  pre: {
    background: '#1e293b',
    padding: 16,
    borderRadius: 8,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'left',
  } as React.CSSProperties,
}
