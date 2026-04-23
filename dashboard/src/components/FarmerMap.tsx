'use client'

import { Fragment, useEffect, useState, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
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
  deviceModel: string
  deviceManufacturer: string
  androidSdk: number
}

function dotColor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '#94a3b8'
  const ageMs = Date.now() - new Date(lastSeenAt).getTime()
  if (ageMs < 60 * 60 * 1000) return '#22c55e'
  if (ageMs < 3 * 24 * 60 * 60 * 1000) return '#f97316'
  return '#ef4444'
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function sourceLabel(s: string) {
  if (s.includes('login')) return 'Login'
  if (s.includes('app_open')) return 'App open'
  return s || '—'
}

// Flies the map to a farmer when selectedFarmerId changes
function MapController({
  selectedFarmerId,
  farmers,
}: {
  selectedFarmerId: string | null
  farmers: Farmer[]
}) {
  const map = useMap()
  useEffect(() => {
    if (!selectedFarmerId) return
    const f = farmers.find((x) => x.id === selectedFarmerId)
    if (f && !(f.lastLat === 0 && f.lastLng === 0)) {
      map.flyTo([f.lastLat, f.lastLng], Math.max(map.getZoom(), 12), { duration: 0.8 })
    }
  }, [selectedFarmerId, farmers, map])
  return null
}

export default function FarmerMap({
  farmers,
  selectedFarmerId,
  onSelectFarmer,
  showHeatmap,
}: {
  farmers: Farmer[]
  selectedFarmerId: string | null
  onSelectFarmer: (id: string | null) => void
  showHeatmap: boolean
}) {
  // Required for Leaflet SSR
  useEffect(() => {}, [])

  const [pingsCache, setPingsCache] = useState<Record<string, Ping[]>>({})
  const [loadingPings, setLoadingPings] = useState<string | null>(null)

  const loadPings = useCallback(async (farmerId: string) => {
    if (pingsCache[farmerId] !== undefined) return
    setLoadingPings(farmerId)
    try {
      const res = await fetch(`/api/farmers/${encodeURIComponent(farmerId)}`)
      const data = await res.json()
      if (Array.isArray(data.pings)) {
        setPingsCache((prev) => ({ ...prev, [farmerId]: data.pings }))
      }
    } catch {
      // silently mark as loaded with empty array so we don't retry on every click
      setPingsCache((prev) => ({ ...prev, [farmerId]: [] }))
    } finally {
      setLoadingPings(null)
    }
  }, [pingsCache])

  const mapped = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0))

  function trail(farmerId: string): [number, number][] {
    const pings = pingsCache[farmerId] ?? []
    return pings
      .filter((p) => !(p.lat === 0 && p.lng === 0))
      .slice()
      .reverse()
      .map((p) => [p.lat, p.lng] as [number, number])
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

      <MapController selectedFarmerId={selectedFarmerId} farmers={farmers} />

      {/* Heatmap: two stacked circles per farmer — outer glow + inner core */}
      {showHeatmap &&
        mapped.map((farmer) => (
          <Fragment key={`heat-${farmer.id}`}>
            <Circle
              center={[farmer.lastLat, farmer.lastLng]}
              radius={18000}
              pathOptions={{ weight: 0, fillColor: '#f97316', fillOpacity: 0.04 }}
            />
            <Circle
              center={[farmer.lastLat, farmer.lastLng]}
              radius={6000}
              pathOptions={{ weight: 0, fillColor: '#ef4444', fillOpacity: 0.10 }}
            />
          </Fragment>
        ))}

      {/* Farmer dots + trail */}
      {mapped.map((farmer) => {
        const color = dotColor(farmer.lastSeenAt)
        const isSelected = farmer.id === selectedFarmerId
        const pings = pingsCache[farmer.id] ?? []
        const t = trail(farmer.id)

        return (
          <Fragment key={farmer.id}>
            {/* Trail polyline */}
            {t.length > 1 && (
              <Polyline
                positions={t}
                pathOptions={{ color, weight: 2, opacity: 0.5 }}
              />
            )}

            {/* Historical ping dots */}
            {pings
              .filter((p) => !(p.lat === 0 && p.lng === 0))
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
                    <strong>Farmer {farmer.id}</strong>
                    <br />
                    {sourceLabel(p.source)} — {fmt(p.at)}
                    <br />
                    App v{p.appVersion}
                  </Popup>
                </CircleMarker>
              ))}

            {/* Selection ring */}
            {isSelected && (
              <CircleMarker
                center={[farmer.lastLat, farmer.lastLng]}
                radius={22}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillOpacity: 0,
                  opacity: 0.7,
                  dashArray: '5 4',
                }}
              />
            )}

            {/* Current location dot */}
            <CircleMarker
              center={[farmer.lastLat, farmer.lastLng]}
              radius={isSelected ? 13 : 9}
              pathOptions={{
                color: '#fff',
                weight: isSelected ? 3 : 2,
                fillColor: color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => {
                  const newId = isSelected ? null : farmer.id
                  onSelectFarmer(newId)
                  if (newId) loadPings(newId)
                },
              }}
            >
              <Popup minWidth={210}>
                <div style={{ lineHeight: 1.7, fontSize: 13 }}>
                  <strong style={{ fontSize: 14 }}>Farmer {farmer.id}</strong>
                  <br />
                  <span style={{ color: '#555' }}>Last seen:</span> {fmt(farmer.lastSeenAt)}
                  <br />
                  <span style={{ color: '#555' }}>Source:</span> {sourceLabel(farmer.lastSource)}
                  <br />
                  <span style={{ color: '#555' }}>Device:</span> {farmer.deviceManufacturer} {farmer.deviceModel}
                  <br />
                  <span style={{ color: '#555' }}>App:</span> v{farmer.appVersion} (SDK {farmer.androidSdk})
                  <br />
                  <span style={{ color: '#555' }}>Accuracy:</span> ±{Math.round(farmer.lastAccuracyM)}m
                  <br />
                  {loadingPings === farmer.id && (
                    <span style={{ color: '#f97316' }}>Loading trail…</span>
                  )}
                  {pings.length > 0 && (
                    <span style={{ color: '#555' }}>Pings: {pings.length}</span>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
