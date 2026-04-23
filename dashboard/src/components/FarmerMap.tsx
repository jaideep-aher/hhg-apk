'use client'

import { useEffect, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type Ping = {
  lat: number
  lng: number
  at: string | null
  source: string
  appVersion: string
  accuracyM: number
}

export type Farmer = {
  id: string
  lastLat: number
  lastLng: number
  lastAccuracyM: number
  lastSeenAt: string | null
  lastSource: string
  appVersion: string
  appVersionCode?: number
  deviceModel: string
  deviceManufacturer: string
  androidSdk: number
  name?: string | null
  phone?: string | null
  address?: string | null
  // Ping history is fetched on demand, keyed by farmer id. Empty when unknown.
  pings?: Ping[]
}

export function dotColor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '#94a3b8'
  const ageMs = Date.now() - new Date(lastSeenAt).getTime()
  if (ageMs < 60 * 60 * 1000) return '#22c55e'
  if (ageMs < 24 * 60 * 60 * 1000) return '#f97316'
  return '#ef4444'
}

export function hasGps(f: Farmer): boolean {
  return !(f.lastLat === 0 && f.lastLng === 0)
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function sourceLabel(s: string) {
  if (s.includes('login')) return '🔑 Login'
  if (s.includes('app_open')) return '📱 App open'
  if (s.includes('foreground')) return '👁 Foreground'
  return s || '—'
}

function displayName(f: Farmer): string {
  if (f.name && f.name.trim()) return f.name.trim()
  return `Farmer ${f.id}`
}

/**
 * Internal: reacts to prop changes to re-center the map on the selected
 * farmer. Must live inside <MapContainer> so useMap() resolves.
 */
function MapController({
  farmers,
  selectedId,
}: {
  farmers: Farmer[]
  selectedId: string | null
}) {
  const map = useMap()

  // Fit bounds to all mapped farmers on first load / when the set changes.
  useEffect(() => {
    if (selectedId) return
    const mapped = farmers.filter(hasGps)
    if (mapped.length === 0) return
    if (mapped.length === 1) {
      map.setView([mapped[0].lastLat, mapped[0].lastLng], 13)
      return
    }
    const lats = mapped.map((f) => f.lastLat)
    const lngs = mapped.map((f) => f.lastLng)
    const south = Math.min(...lats)
    const north = Math.max(...lats)
    const west = Math.min(...lngs)
    const east = Math.max(...lngs)
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [40, 40], maxZoom: 12 }
    )
  }, [farmers, selectedId, map])

  // Fly to the selected farmer when one is picked.
  useEffect(() => {
    if (!selectedId) return
    const f = farmers.find((x) => x.id === selectedId)
    if (!f || !hasGps(f)) return
    map.flyTo([f.lastLat, f.lastLng], 15, { duration: 0.8 })
  }, [selectedId, farmers, map])

  return null
}

export default function FarmerMap({
  farmers,
  selectedId,
  onSelect,
  onSendPush,
}: {
  farmers: Farmer[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSendPush?: (id: string) => void
}) {
  useEffect(() => {}, [])

  const mapped = useMemo(() => farmers.filter(hasGps), [farmers])

  function trail(f: Farmer): [number, number][] {
    if (!f.pings || f.pings.length === 0) return []
    return f.pings
      .filter((p) => !(p.lat === 0 && p.lng === 0))
      .slice()
      .reverse()
      .map((p) => [p.lat, p.lng])
  }

  return (
    <MapContainer
      center={[19.7515, 75.7139]}
      zoom={7}
      style={{ height: '100%', width: '100%' }}
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController farmers={farmers} selectedId={selectedId} />

      {mapped.map((farmer) => {
        const color = dotColor(farmer.lastSeenAt)
        const t = trail(farmer)
        const isSelected = selectedId === farmer.id

        return (
          <div key={farmer.id}>
            {t.length > 1 && (
              <Polyline
                positions={t}
                pathOptions={{ color, weight: 2, opacity: isSelected ? 0.9 : 0.4 }}
              />
            )}

            {farmer.pings
              ?.filter((p) => !(p.lat === 0 && p.lng === 0))
              .map((p, i) => (
                <CircleMarker
                  key={`${farmer.id}-ping-${i}`}
                  center={[p.lat, p.lng]}
                  radius={4}
                  pathOptions={{
                    color: '#64748b',
                    fillColor: '#64748b',
                    fillOpacity: 0.5,
                    weight: 0,
                  }}
                >
                  <Popup>
                    <strong>{displayName(farmer)}</strong>
                    <br />
                    {sourceLabel(p.source)} — {fmt(p.at)}
                    <br />
                    App v{p.appVersion}
                  </Popup>
                </CircleMarker>
              ))}

            <CircleMarker
              center={[farmer.lastLat, farmer.lastLng]}
              radius={isSelected ? 14 : 10}
              pathOptions={{
                color: isSelected ? '#fbbf24' : '#fff',
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => onSelect(farmer.id),
              }}
            >
              <Popup
                minWidth={220}
                eventHandlers={{ remove: () => onSelect(null) }}
              >
                <div style={{ lineHeight: 1.6, minWidth: 200 }}>
                  <strong style={{ fontSize: 14 }}>{displayName(farmer)}</strong>
                  <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                    ID: {farmer.id}
                    {farmer.phone ? ` · 📞 ${farmer.phone}` : ''}
                  </div>
                  {farmer.address && (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                      📍 {farmer.address}
                    </div>
                  )}
                  <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#555' }}>Last seen:</span> {fmt(farmer.lastSeenAt)}
                    <br />
                    <span style={{ color: '#555' }}>Source:</span>{' '}
                    {sourceLabel(farmer.lastSource)}
                    <br />
                    <span style={{ color: '#555' }}>Device:</span>{' '}
                    {farmer.deviceManufacturer} {farmer.deviceModel}
                    <br />
                    <span style={{ color: '#555' }}>App:</span> v{farmer.appVersion} (SDK{' '}
                    {farmer.androidSdk})
                    <br />
                    <span style={{ color: '#555' }}>Accuracy:</span> ±
                    {Math.round(farmer.lastAccuracyM)}m
                    <br />
                    <span style={{ color: '#555' }}>Pings:</span>{' '}
                    {farmer.pings?.length ?? '—'}
                  </div>
                  {onSendPush && (
                    <button
                      onClick={() => onSendPush(farmer.id)}
                      style={{
                        marginTop: 10,
                        width: '100%',
                        background: '#f97316',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Send push to this farmer
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          </div>
        )
      })}
    </MapContainer>
  )
}
