'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Farmer, MapMode, Ping } from '@/components/FarmerMap'

const FarmerMap = dynamic(() => import('@/components/FarmerMap'), { ssr: false })

type ActivityFilter = 'all' | '1h' | '24h' | '7d' | 'stale' | 'nogps'

type FetchMeta = {
  count: number
  pingFailures: number
  fetchedAt: string | null
  tookMs: number | null
}

function ago(iso: string | null) {
  if (!iso) return '—'
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 5)    return 'just now'
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function fmtAbs(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

export default function Page() {
  const [farmers, setFarmers]   = useState<Farmer[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [meta, setMeta] = useState<FetchMeta>({ count: 0, pingFailures: 0, fetchedAt: null, tookMs: null })
  const [nowTick, setNowTick] = useState(Date.now())

  const [query, setQuery] = useState('')
  const [activity, setActivity] = useState<ActivityFilter>('all')
  const [mode, setMode] = useState<MapMode>('markers')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const inFlight = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    inFlight.current?.abort()
    const ctrl = new AbortController()
    inFlight.current = ctrl
    setRefreshing(true)
    try {
      const res = await fetch('/api/farmers?withPings=1', { signal: ctrl.signal, cache: 'no-store' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setFarmers(data.farmers ?? [])
      setMeta({
        count: data.count ?? (data.farmers?.length ?? 0),
        pingFailures: data.pingFailures ?? 0,
        fetchedAt: data.fetchedAt ?? new Date().toISOString(),
        tookMs: data.tookMs ?? null,
      })
      setError(null)
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load, autoRefresh])

  // Re-render the "Updated Xs ago" label once a second without re-fetching.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const loadPingsFor = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/farmers/${encodeURIComponent(id)}/pings?limit=50`, { cache: 'no-store' })
      const data = await res.json()
      if (data.error) return
      setFarmers((prev) => prev.map((f) => (f.id === id ? { ...f, pings: data.pings as Ping[] } : f)))
    } catch {
      // Swallow — popup just shows "Pings loaded: 0" until refresh.
    }
  }, [])

  const filtered = useMemo(
    () => applyFilters(farmers, query, activity),
    [farmers, query, activity]
  )

  const activeHour = farmers.filter((f) => withinMs(f.lastSeenAt, 3_600_000)).length
  const activeToday = farmers.filter((f) => withinMs(f.lastSeenAt, 86_400_000)).length
  const mappable = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0)).length

  const exportCsv = () => {
    const rows = [
      ['id','lastSeenAt','lastLat','lastLng','lastAccuracyM','lastSource','appVersion','deviceManufacturer','deviceModel','androidSdk'],
      ...filtered.map((f) => [
        f.id, f.lastSeenAt ?? '', f.lastLat, f.lastLng, f.lastAccuracyM,
        f.lastSource, f.appVersion, f.deviceManufacturer, f.deviceModel, f.androidSdk,
      ]),
    ]
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `farmers-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={headerStyle}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🌾 HHG Farmer Activity</span>

        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <Stat label="Total" value={farmers.length} />
          <Stat label="On map" value={mappable} />
          <Stat label="Matches" value={filtered.length} />
          <Stat label="Active 1h" value={activeHour} color="#22c55e" />
          <Stat label="Active 24h" value={activeToday} color="#f97316" />
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#94a3b8' }}>
          <RefreshStatus meta={meta} refreshing={refreshing} nowTick={nowTick} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: '#f97316' }}
            />
            Auto
          </label>
          <button onClick={load} disabled={refreshing} style={btnStyle(refreshing)}>
            {refreshing ? '…' : '↻'} Refresh now
          </button>
          <button onClick={exportCsv} style={btnSecondaryStyle}>⇩ CSV</button>
          <Link href="/send" style={btnPrimaryStyle}>Send push</Link>
        </div>
      </header>

      <div style={toolbarStyle}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by farmer ID…"
          style={searchStyle}
        />

        <FilterChips activity={activity} onChange={setActivity} counts={{
          all: farmers.length,
          '1h': activeHour,
          '24h': activeToday,
          '7d': farmers.filter((f) => withinMs(f.lastSeenAt, 7 * 86_400_000)).length,
          stale: farmers.filter((f) => f.lastSeenAt && !withinMs(f.lastSeenAt, 7 * 86_400_000)).length,
          nogps: farmers.filter((f) => f.lastLat === 0 && f.lastLng === 0).length,
        }} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setMode('markers')} style={toggleBtn(mode === 'markers')}>Markers</button>
          <button onClick={() => setMode('heatmap')} style={toggleBtn(mode === 'heatmap')}>Heatmap</button>
          <button onClick={() => setSidebarOpen((v) => !v)} style={toggleBtn(sidebarOpen)}>
            {sidebarOpen ? '⟩ Hide list' : '⟨ Show list'}
          </button>
        </div>
      </div>

      <div style={legendStyle}>
        <LegendDot color="#22c55e" label="< 1h" />
        <LegendDot color="#f97316" label="< 24h" />
        <LegendDot color="#ef4444" label="Older" />
        <LegendDot color="#64748b" label="Past ping" />
        <span style={{ marginLeft: 8 }}>
          {mode === 'markers'
            ? 'Click any dot for details · Click an empty area for density count'
            : 'Heatmap: color = relative density in grid cell · Click any area for count'}
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && <div style={centeredStyle}><span style={{ color: '#94a3b8' }}>Loading farmer data…</span></div>}
          {error && (
            <div style={{ ...centeredStyle, flexDirection: 'column', gap: 12, padding: 32, textAlign: 'center' }}>
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
            <FarmerMap
              farmers={filtered}
              mode={mode}
              focusFarmerId={focusId}
              onLoadPings={loadPingsFor}
            />
          )}
        </div>

        {sidebarOpen && (
          <FarmerSidebar
            farmers={filtered}
            onFocus={(id) => setFocusId(id)}
            focusId={focusId}
          />
        )}
      </div>
    </div>
  )
}

function RefreshStatus({ meta, refreshing, nowTick }: { meta: FetchMeta; refreshing: boolean; nowTick: number }) {
  // nowTick is intentionally read to force a re-render each second.
  void nowTick
  if (refreshing) return <span style={{ color: '#fbbf24' }}>⟳ fetching…</span>
  if (!meta.fetchedAt) return <span>—</span>
  return (
    <span title={`Fetched at ${fmtAbs(meta.fetchedAt)}${meta.tookMs != null ? ` in ${meta.tookMs}ms` : ''}`}>
      Updated {ago(meta.fetchedAt)} · {meta.count} docs
      {meta.pingFailures > 0 && (
        <span style={{ color: '#f87171', marginLeft: 4 }}>({meta.pingFailures} ping errors)</span>
      )}
    </span>
  )
}

function FilterChips({
  activity,
  onChange,
  counts,
}: {
  activity: ActivityFilter
  onChange: (f: ActivityFilter) => void
  counts: Record<ActivityFilter, number>
}) {
  const chips: { key: ActivityFilter; label: string }[] = [
    { key: 'all',   label: 'All' },
    { key: '1h',    label: 'Active 1h' },
    { key: '24h',   label: 'Active 24h' },
    { key: '7d',    label: 'Active 7d' },
    { key: 'stale', label: 'Stale' },
    { key: 'nogps', label: 'No GPS' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {chips.map((c) => (
        <button key={c.key} onClick={() => onChange(c.key)} style={toggleBtn(activity === c.key)}>
          {c.label} <span style={{ opacity: 0.6 }}>({counts[c.key]})</span>
        </button>
      ))}
    </div>
  )
}

function FarmerSidebar({
  farmers,
  onFocus,
  focusId,
}: {
  farmers: Farmer[]
  onFocus: (id: string) => void
  focusId: string | null
}) {
  const sorted = useMemo(
    () => farmers.slice().sort((a, b) => seenMs(b.lastSeenAt) - seenMs(a.lastSeenAt)),
    [farmers]
  )
  return (
    <aside style={sidebarStyle}>
      <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8', borderBottom: '1px solid #334155' }}>
        {sorted.length} farmer{sorted.length === 1 ? '' : 's'} · most recent first
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {sorted.map((f) => {
          const color = f.lastSeenAt
            ? Date.now() - new Date(f.lastSeenAt).getTime() < 3_600_000
              ? '#22c55e'
              : Date.now() - new Date(f.lastSeenAt).getTime() < 86_400_000
                ? '#f97316'
                : '#ef4444'
            : '#94a3b8'
          const noGps = f.lastLat === 0 && f.lastLng === 0
          const selected = f.id === focusId
          return (
            <button
              key={f.id}
              onClick={() => onFocus(f.id)}
              style={{
                ...sidebarRowStyle,
                background: selected ? '#1e293b' : 'transparent',
              }}
              title={noGps ? 'No GPS fix yet — map will not pan to this farmer' : 'Click to center map'}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.id}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  {f.lastSeenAt ? ago(f.lastSeenAt) : 'never seen'}
                  {noGps && <span style={{ color: '#f87171' }}> · no GPS</span>}
                </div>
              </div>
            </button>
          )
        })}
        {sorted.length === 0 && (
          <div style={{ padding: 20, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
            No farmers match these filters.
          </div>
        )}
      </div>
    </aside>
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

function withinMs(iso: string | null, windowMs: number): boolean {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() < windowMs
}

function seenMs(iso: string | null): number {
  if (!iso) return 0
  return new Date(iso).getTime()
}

function applyFilters(farmers: Farmer[], query: string, activity: ActivityFilter): Farmer[] {
  const q = query.trim().toLowerCase()
  return farmers.filter((f) => {
    if (q && !f.id.toLowerCase().includes(q)) return false
    if (activity === '1h'    && !withinMs(f.lastSeenAt, 3_600_000)) return false
    if (activity === '24h'   && !withinMs(f.lastSeenAt, 86_400_000)) return false
    if (activity === '7d'    && !withinMs(f.lastSeenAt, 7 * 86_400_000)) return false
    if (activity === 'stale' && (!f.lastSeenAt || withinMs(f.lastSeenAt, 7 * 86_400_000))) return false
    if (activity === 'nogps' && !(f.lastLat === 0 && f.lastLng === 0)) return false
    return true
  })
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

const headerStyle: React.CSSProperties = {
  background: '#1e293b',
  borderBottom: '1px solid #334155',
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  flexShrink: 0,
  flexWrap: 'wrap',
}

const toolbarStyle: React.CSSProperties = {
  background: '#1e293b',
  borderBottom: '1px solid #334155',
  padding: '8px 16px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
  flexWrap: 'wrap',
}

const legendStyle: React.CSSProperties = {
  background: '#1e293b',
  borderBottom: '1px solid #334155',
  padding: '6px 16px',
  display: 'flex',
  gap: 16,
  fontSize: 12,
  color: '#94a3b8',
  flexShrink: 0,
  flexWrap: 'wrap',
}

const sidebarStyle: React.CSSProperties = {
  width: 260,
  background: '#0f172a',
  borderLeft: '1px solid #334155',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
}

const sidebarRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  color: '#f1f5f9',
  cursor: 'pointer',
  borderBottom: '1px solid #1e293b',
}

const searchStyle: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid #334155',
  color: '#f1f5f9',
  padding: '6px 10px',
  borderRadius: 6,
  fontSize: 13,
  minWidth: 240,
  outline: 'none',
}

const centeredStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0f172a',
  zIndex: 400,
}

const btnPrimaryStyle: React.CSSProperties = {
  background: '#f97316',
  color: '#fff',
  padding: '4px 12px',
  borderRadius: 6,
  fontSize: 12,
  textDecoration: 'none',
  fontWeight: 600,
}

const btnSecondaryStyle: React.CSSProperties = {
  background: '#334155',
  border: 'none',
  color: '#f1f5f9',
  padding: '4px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? '#1e293b' : '#334155',
    border: 'none',
    color: disabled ? '#64748b' : '#f1f5f9',
    padding: '4px 12px',
    borderRadius: 6,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 12,
  }
}

function toggleBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? '#f97316' : '#334155',
    border: 'none',
    color: active ? '#fff' : '#cbd5e1',
    padding: '4px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
  }
}
