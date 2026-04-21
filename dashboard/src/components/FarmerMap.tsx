'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet'
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
  pings: Ping[]
}

function dotColor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '#94a3b8'
  const ageMs = Date.now() - new Date(lastSeenAt).getTime()
  if (ageMs < 60 * 60 * 1000)       return '#22c55e'  // < 1 hour  → green
  if (ageMs < 24 * 60 * 60 * 1000)  return '#f97316'  // < 24 hours → orange
  return '#ef4444'                                      // older       → red
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function sourceLabel(s: string) {
  if (s.includes('login'))    return '🔑 Login'
  if (s.includes('app_open')) return '📱 App open'
  return s
}

export default function FarmerMap({ farmers }: { farmers: Farmer[] }) {
  // Leaflet SSR fix — suppress missing window error
  useEffect(() => {}, [])

  // Only render farmers that have a real GPS fix (skip lat=0/lng=0 sentinel)
  const mapped = farmers.filter(
    (f) => !(f.lastLat === 0 && f.lastLng === 0)
  )

  // Trail: all pings with a real GPS fix, sorted oldest→newest for polyline
  function trail(f: Farmer): [number, number][] {
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

      {mapped.map((farmer) => {
        const color = dotColor(farmer.lastSeenAt)
        const t = trail(farmer)

        return (
          <div key={farmer.id}>
            {/* Trail line connecting all pings */}
            {t.length > 1 && (
              <Polyline
                positions={t}
                pathOptions={{ color, weight: 1.5, opacity: 0.4 }}
              />
            )}

            {/* Historical ping dots (smaller, semi-transparent) */}
            {farmer.pings
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
                    <strong>Farmer {farmer.id}</strong><br />
                    {sourceLabel(p.source)} — {fmt(p.at)}<br />
                    App v{p.appVersion}
                  </Popup>
                </CircleMarker>
              ))}

            {/* Latest location dot (larger, solid) */}
            <CircleMarker
              center={[farmer.lastLat, farmer.lastLng]}
              radius={10}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.95,
              }}
            >
              <Popup minWidth={200}>
                <div style={{ lineHeight: 1.6 }}>
                  <strong style={{ fontSize: 14 }}>Farmer {farmer.id}</strong><br />
                  <span style={{ color: '#555' }}>Last seen:</span> {fmt(farmer.lastSeenAt)}<br />
                  <span style={{ color: '#555' }}>Source:</span> {sourceLabel(farmer.lastSource)}<br />
                  <span style={{ color: '#555' }}>Device:</span> {farmer.deviceManufacturer} {farmer.deviceModel}<br />
                  <span style={{ color: '#555' }}>App:</span> v{farmer.appVersion} (SDK {farmer.androidSdk})<br />
                  <span style={{ color: '#555' }}>Accuracy:</span> ±{Math.round(farmer.lastAccuracyM)}m<br />
                  <span style={{ color: '#555' }}>Pings tracked:</span> {farmer.pings.length}
                </div>
              </Popup>
            </CircleMarker>
          </div>
        )
      })}
    </MapContainer>
  )
}
