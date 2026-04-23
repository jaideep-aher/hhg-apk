'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap, useMapEvents, Circle } from 'react-leaflet'
import type { LatLngExpression, Map as LeafletMap, Circle as LCircle } from 'leaflet'
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

export type MapMode = 'markers' | 'heatmap'

function dotColor(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '#94a3b8'
  const ageMs = Date.now() - new Date(lastSeenAt).getTime()
  if (ageMs < 60 * 60 * 1000)       return '#22c55e'
  if (ageMs < 24 * 60 * 60 * 1000)  return '#f97316'
  return '#ef4444'
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function sourceLabel(s: string) {
  if (s.includes('login'))    return '🔑 Login'
  if (s.includes('app_open')) return '📱 App open'
  if (s.includes('foreground')) return '👀 Foreground'
  return s || '—'
}

type Props = {
  farmers: Farmer[]
  mode: MapMode
  focusFarmerId?: string | null
  onLoadPings?: (farmerId: string) => void | Promise<void>
}

export default function FarmerMap({ farmers, mode, focusFarmerId, onLoadPings }: Props) {
  const mapped = useMemo(
    () => farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0)),
    [farmers]
  )

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

      <FocusController farmers={mapped} focusFarmerId={focusFarmerId ?? null} />
      <ClickAreaDensity farmers={mapped} />

      {mode === 'heatmap' ? (
        <HeatmapLayer farmers={mapped} />
      ) : (
        <MarkerLayer farmers={mapped} onLoadPings={onLoadPings} />
      )}
    </MapContainer>
  )
}

function MarkerLayer({ farmers, onLoadPings }: { farmers: Farmer[]; onLoadPings?: Props['onLoadPings'] }) {
  return (
    <>
      {farmers.map((farmer) => {
        const color = dotColor(farmer.lastSeenAt)
        const trailPoints: [number, number][] = farmer.pings
          .filter((p) => !(p.lat === 0 && p.lng === 0))
          .slice()
          .reverse()
          .map((p) => [p.lat, p.lng])

        return (
          <Fragment key={farmer.id}>
            {trailPoints.length > 1 && (
              <Polyline
                positions={trailPoints}
                pathOptions={{ color, weight: 1.5, opacity: 0.4 }}
              />
            )}

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

            <CircleMarker
              center={[farmer.lastLat, farmer.lastLng]}
              radius={10}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: color,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: () => {
                  if (farmer.pings.length === 0 && onLoadPings) {
                    void onLoadPings(farmer.id)
                  }
                },
              }}
            >
              <Popup minWidth={220}>
                <div style={{ lineHeight: 1.6 }}>
                  <strong style={{ fontSize: 14 }}>Farmer {farmer.id}</strong><br />
                  <span style={{ color: '#555' }}>Last seen:</span> {fmt(farmer.lastSeenAt)}<br />
                  <span style={{ color: '#555' }}>Source:</span> {sourceLabel(farmer.lastSource)}<br />
                  <span style={{ color: '#555' }}>Device:</span> {farmer.deviceManufacturer} {farmer.deviceModel}<br />
                  <span style={{ color: '#555' }}>App:</span> v{farmer.appVersion} (SDK {farmer.androidSdk})<br />
                  <span style={{ color: '#555' }}>Accuracy:</span> ±{Math.round(farmer.lastAccuracyM)}m<br />
                  <span style={{ color: '#555' }}>Pings loaded:</span> {farmer.pings.length}
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        )
      })}
    </>
  )
}

/**
 * Lightweight grid-based density visualization — renders a Circle per
 * populated cell, alpha-weighted by farmer count. Built without a plugin so
 * we don't add a runtime dep. The cell size shrinks as the map zooms in, so
 * the visual density stays readable at city, district and state levels.
 */
function HeatmapLayer({ farmers }: { farmers: Farmer[] }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  const cells = useMemo(() => aggregateGrid(farmers, zoom), [farmers, zoom])
  const max = cells.reduce((m, c) => Math.max(m, c.count), 1)
  const cellSizeMeters = gridSizeMeters(zoom)

  return (
    <>
      {cells.map((c) => {
        const intensity = c.count / max
        const color = heatColor(intensity)
        return (
          <Circle
            key={`${c.latKey},${c.lngKey}`}
            center={[c.lat, c.lng]}
            radius={cellSizeMeters * 0.55}
            pathOptions={{
              color,
              weight: 0,
              fillColor: color,
              fillOpacity: 0.15 + 0.55 * intensity,
            }}
          >
            <Popup>
              <strong>{c.count} farmer{c.count === 1 ? '' : 's'}</strong><br />
              in this {(cellSizeMeters / 1000).toFixed(1)} km cell<br />
              <span style={{ color: '#555' }}>
                {c.farmers.slice(0, 5).map((f) => f.id).join(', ')}
                {c.farmers.length > 5 ? `, +${c.farmers.length - 5} more` : ''}
              </span>
            </Popup>
          </Circle>
        )
      })}
    </>
  )
}

type Cell = {
  latKey: number
  lngKey: number
  lat: number
  lng: number
  count: number
  farmers: Farmer[]
}

function aggregateGrid(farmers: Farmer[], zoom: number): Cell[] {
  const step = gridStepDegrees(zoom)
  const byKey = new Map<string, Cell>()
  for (const f of farmers) {
    const latKey = Math.floor(f.lastLat / step)
    const lngKey = Math.floor(f.lastLng / step)
    const key = `${latKey}:${lngKey}`
    const existing = byKey.get(key)
    if (existing) {
      existing.count += 1
      existing.farmers.push(f)
    } else {
      byKey.set(key, {
        latKey,
        lngKey,
        lat: (latKey + 0.5) * step,
        lng: (lngKey + 0.5) * step,
        count: 1,
        farmers: [f],
      })
    }
  }
  return Array.from(byKey.values())
}

function gridStepDegrees(zoom: number): number {
  if (zoom <= 5)  return 1.0
  if (zoom <= 7)  return 0.25
  if (zoom <= 9)  return 0.1
  if (zoom <= 11) return 0.04
  if (zoom <= 13) return 0.015
  return 0.005
}

function gridSizeMeters(zoom: number): number {
  return gridStepDegrees(zoom) * 111_000
}

function heatColor(t: number): string {
  if (t < 0.25) return '#22d3ee'
  if (t < 0.5)  return '#eab308'
  if (t < 0.75) return '#f97316'
  return '#ef4444'
}

/**
 * Click-anywhere-on-map → show count & list of farmers within a radius of
 * the click point. Lets an ops user answer "how dense is this area?" without
 * needing to zoom in to count markers.
 */
function ClickAreaDensity({ farmers }: { farmers: Farmer[] }) {
  const [click, setClick] = useState<{ lat: number; lng: number } | null>(null)
  const circleRef = useRef<LCircle | null>(null)
  const map = useMapEvents({
    click: (e) => {
      // Ignore clicks that landed on a marker (leaflet bubbles those too).
      const target = e.originalEvent.target as HTMLElement | null
      if (target && target.closest && target.closest('.leaflet-interactive')) return
      setClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  // Open the bound popup automatically after each new click.
  useEffect(() => {
    if (click && circleRef.current) {
      circleRef.current.openPopup()
    }
  }, [click])

  if (!click) return null

  const radiusMeters = radiusForZoom(map.getZoom())
  const inside = farmers.filter(
    (f) => haversine(click.lat, click.lng, f.lastLat, f.lastLng) <= radiusMeters
  )

  return (
    <Circle
      ref={circleRef}
      center={[click.lat, click.lng]}
      radius={radiusMeters}
      pathOptions={{
        color: '#60a5fa',
        weight: 2,
        dashArray: '6 4',
        fillColor: '#60a5fa',
        fillOpacity: 0.08,
      }}
    >
      <Popup>
        <div style={{ lineHeight: 1.5, minWidth: 180 }}>
          <strong>{inside.length} farmer{inside.length === 1 ? '' : 's'}</strong>
          {' '}within {(radiusMeters / 1000).toFixed(1)} km<br />
          <span style={{ color: '#555', fontSize: 12 }}>
            of {click.lat.toFixed(4)}, {click.lng.toFixed(4)}
          </span>
          {inside.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, maxHeight: 140, overflowY: 'auto' }}>
              {inside.slice(0, 20).map((f) => (
                <div key={f.id}>• {f.id} <span style={{ color: '#888' }}>({fmt(f.lastSeenAt)})</span></div>
              ))}
              {inside.length > 20 && <div style={{ color: '#888' }}>+{inside.length - 20} more</div>}
            </div>
          )}
        </div>
      </Popup>
    </Circle>
  )
}

function radiusForZoom(zoom: number): number {
  if (zoom <= 5)  return 200_000
  if (zoom <= 7)  return 50_000
  if (zoom <= 9)  return 15_000
  if (zoom <= 11) return 5_000
  if (zoom <= 13) return 1_500
  return 500
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function FocusController({ farmers, focusFarmerId }: { farmers: Farmer[]; focusFarmerId: string | null }) {
  const map = useMap()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!focusFarmerId || focusFarmerId === last.current) return
    const f = farmers.find((x) => x.id === focusFarmerId)
    if (f && !(f.lastLat === 0 && f.lastLng === 0)) {
      const target: LatLngExpression = [f.lastLat, f.lastLng]
      const m = map as LeafletMap
      m.flyTo(target, Math.max(m.getZoom(), 13), { duration: 0.8 })
      last.current = focusFarmerId
    }
  }, [focusFarmerId, farmers, map])
  return null
}
