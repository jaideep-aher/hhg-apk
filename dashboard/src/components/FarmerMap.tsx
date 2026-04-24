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
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { VehicleRoute, GapCluster } from '@/lib/geo'

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
  if (ageMs < 24 * 60 * 60 * 1000) return '#f97316'
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

// Handles map clicks in draw mode and sets crosshair cursor
function DrawHandler({
  active,
  onMapClick,
}: {
  active: boolean
  onMapClick?: (lat: number, lng: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = active ? 'crosshair' : ''
    return () => {
      container.style.cursor = ''
    }
  }, [active, map])

  useMapEvents({
    click(e) {
      if (active && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })

  return null
}

const ROUTE_COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#a855f7',
  '#ec4899', '#14b8a6', '#eab308', '#ef4444',
]

export default function FarmerMap({
  farmers,
  selectedFarmerId,
  onSelectFarmer,
  showHeatmap,
  // Routes
  routes = [],
  showRoutes = false,
  drawMode = false,
  drawingWaypoints = [],
  onMapClick,
  // Gap analysis
  showGapAnalysis = false,
  gapCoveredIds,
  gapUncoveredIds,
  gapClusters = [],
  coverageRadiusKm = 5,
}: {
  farmers: Farmer[]
  selectedFarmerId: string | null
  onSelectFarmer: (id: string | null) => void
  showHeatmap: boolean
  routes?: VehicleRoute[]
  showRoutes?: boolean
  drawMode?: boolean
  drawingWaypoints?: Array<{ lat: number; lng: number }>
  onMapClick?: (lat: number, lng: number) => void
  showGapAnalysis?: boolean
  gapCoveredIds?: Set<string>
  gapUncoveredIds?: Set<string>
  gapClusters?: GapCluster[]
  coverageRadiusKm?: number
}) {
  useEffect(() => {}, [])

  const [pingsCache, setPingsCache] = useState<Record<string, Ping[]>>({})
  const [loadingPings, setLoadingPings] = useState<string | null>(null)

  const loadPings = useCallback(
    async (farmerId: string) => {
      if (pingsCache[farmerId] !== undefined) return
      setLoadingPings(farmerId)
      try {
        const res = await fetch(`/api/farmers/${encodeURIComponent(farmerId)}`)
        const data = await res.json()
        if (Array.isArray(data.pings)) {
          setPingsCache((prev) => ({ ...prev, [farmerId]: data.pings }))
        }
      } catch {
        setPingsCache((prev) => ({ ...prev, [farmerId]: [] }))
      } finally {
        setLoadingPings(null)
      }
    },
    [pingsCache]
  )

  const mapped = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0))

  function trail(farmerId: string): [number, number][] {
    const pings = pingsCache[farmerId] ?? []
    return pings
      .filter((p) => !(p.lat === 0 && p.lng === 0))
      .slice()
      .reverse()
      .map((p) => [p.lat, p.lng] as [number, number])
  }

  const drawingPositions: [number, number][] = drawingWaypoints.map(
    (w) => [w.lat, w.lng] as [number, number]
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

      <MapController selectedFarmerId={selectedFarmerId} farmers={farmers} />
      <DrawHandler active={drawMode} onMapClick={onMapClick} />

      {/* ── Vehicle routes ── */}
      {showRoutes &&
        routes.map((route) => {
          const positions: [number, number][] = route.waypoints.map(
            (w) => [w.lat, w.lng] as [number, number]
          )
          if (positions.length < 2) return null
          return (
            <Fragment key={`route-${route.id}`}>
              {/* Glow/halo under the route line */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: route.color,
                  weight: 18,
                  opacity: 0.12,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Main route line */}
              <Polyline
                positions={positions}
                pathOptions={{
                  color: route.color,
                  weight: 4,
                  opacity: 0.85,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              >
                <Popup minWidth={160}>
                  <div style={{ lineHeight: 1.8, fontSize: 13 }}>
                    <strong style={{ fontSize: 14 }}>{route.name}</strong>
                    {route.vehicle && (
                      <>
                        <br />
                        <span style={{ color: '#555' }}>Vehicle:</span> {route.vehicle}
                      </>
                    )}
                    <br />
                    <span style={{ color: '#555' }}>Stops:</span> {route.waypoints.length}
                  </div>
                </Popup>
              </Polyline>
              {/* Waypoint dots */}
              {route.waypoints.map((wp, i) => (
                <CircleMarker
                  key={`${route.id}-wp-${i}`}
                  center={[wp.lat, wp.lng]}
                  radius={i === 0 || i === route.waypoints.length - 1 ? 6 : 4}
                  pathOptions={{
                    color: '#fff',
                    weight: 2,
                    fillColor: route.color,
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <span style={{ fontSize: 12 }}>
                      {route.name} — stop {i + 1}/{route.waypoints.length}
                    </span>
                  </Popup>
                </CircleMarker>
              ))}
            </Fragment>
          )
        })}

      {/* ── Route being drawn ── */}
      {drawMode && drawingPositions.length > 0 && (
        <Fragment>
          {drawingPositions.length > 1 && (
            <Polyline
              positions={drawingPositions}
              pathOptions={{
                color: '#60a5fa',
                weight: 3,
                opacity: 0.9,
                dashArray: '8 5',
              }}
            />
          )}
          {drawingWaypoints.map((wp, i) => (
            <CircleMarker
              key={`drawing-${i}`}
              center={[wp.lat, wp.lng]}
              radius={i === 0 ? 7 : 5}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <span style={{ fontSize: 12 }}>
                  Stop {i + 1} — {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                </span>
              </Popup>
            </CircleMarker>
          ))}
        </Fragment>
      )}

      {/* ── Gap analysis: coverage corridors along routes ── */}
      {showGapAnalysis &&
        showRoutes &&
        routes.map((route) =>
          route.waypoints.map((wp, i) => (
            <Circle
              key={`cov-${route.id}-${i}`}
              center={[wp.lat, wp.lng]}
              radius={coverageRadiusKm * 1000}
              pathOptions={{
                color: route.color,
                weight: 0,
                fillColor: route.color,
                fillOpacity: 0.06,
              }}
            />
          ))
        )}

      {/* ── Gap analysis: cluster suggestions ── */}
      {showGapAnalysis &&
        gapClusters.map((cluster, i) => (
          <Fragment key={`cluster-${i}`}>
            <Circle
              center={[cluster.centroidLat, cluster.centroidLng]}
              radius={8000}
              pathOptions={{
                color: '#a855f7',
                weight: 2,
                opacity: 0.7,
                fillColor: '#a855f7',
                fillOpacity: 0.12,
                dashArray: '6 4',
              }}
            >
              <Popup minWidth={180}>
                <div style={{ lineHeight: 1.8, fontSize: 13 }}>
                  <strong style={{ color: '#7c3aed' }}>
                    Suggested stop #{i + 1}
                  </strong>
                  <br />
                  <span style={{ color: '#555' }}>Farmers here:</span>{' '}
                  {cluster.farmerIds.length}
                  <br />
                  <span style={{ color: '#555' }}>Distance to nearest route:</span>{' '}
                  {cluster.nearestRouteDistKm > 0
                    ? `${cluster.nearestRouteDistKm} km`
                    : 'No route yet'}
                </div>
              </Popup>
            </Circle>
            {/* Cluster centre marker */}
            <CircleMarker
              center={[cluster.centroidLat, cluster.centroidLng]}
              radius={10}
              pathOptions={{
                color: '#fff',
                weight: 2,
                fillColor: '#a855f7',
                fillOpacity: 0.9,
              }}
            >
              <Popup minWidth={180}>
                <div style={{ lineHeight: 1.8, fontSize: 13 }}>
                  <strong style={{ color: '#7c3aed' }}>
                    Cluster #{i + 1}
                  </strong>
                  <br />
                  {cluster.farmerIds.length} farmers uncovered
                  <br />
                  {cluster.nearestRouteDistKm > 0 &&
                    `~${cluster.nearestRouteDistKm} km from nearest route`}
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        ))}

      {/* ── Heatmap ── */}
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
              pathOptions={{ weight: 0, fillColor: '#ef4444', fillOpacity: 0.1 }}
            />
          </Fragment>
        ))}

      {/* ── Farmer dots + trails ── */}
      {mapped.map((farmer) => {
        const isUncovered = showGapAnalysis && gapUncoveredIds?.has(farmer.id)
        const isCovered = showGapAnalysis && gapCoveredIds?.has(farmer.id)
        const baseColor = dotColor(farmer.lastSeenAt)
        // When gap analysis is on, colour-code coverage status
        const fillColor = showGapAnalysis
          ? isUncovered
            ? '#facc15'
            : isCovered
            ? '#22c55e'
            : baseColor
          : baseColor

        const isSelected = farmer.id === selectedFarmerId
        const pings = pingsCache[farmer.id] ?? []
        const t = trail(farmer.id)

        return (
          <Fragment key={farmer.id}>
            {t.length > 1 && (
              <Polyline
                positions={t}
                pathOptions={{ color: fillColor, weight: 2, opacity: 0.5 }}
              />
            )}

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

            <CircleMarker
              center={[farmer.lastLat, farmer.lastLng]}
              radius={isSelected ? 13 : 9}
              pathOptions={{
                color: '#fff',
                weight: isSelected ? 3 : 2,
                fillColor: fillColor,
                fillOpacity: 0.95,
              }}
              eventHandlers={{
                click: (e) => {
                  if (!drawMode) {
                    // @ts-ignore
                    e.originalEvent?.stopPropagation?.()
                    const newId = isSelected ? null : farmer.id
                    onSelectFarmer(newId)
                    if (newId) loadPings(newId)
                  }
                },
              }}
            >
              <Popup minWidth={210}>
                <div style={{ lineHeight: 1.7, fontSize: 13 }}>
                  <strong style={{ fontSize: 14 }}>Farmer {farmer.id}</strong>
                  {showGapAnalysis && (
                    <>
                      <br />
                      <span
                        style={{
                          color: isUncovered ? '#ca8a04' : '#16a34a',
                          fontWeight: 600,
                        }}
                      >
                        {isUncovered ? '⚠ Not on any route' : '✓ Covered by route'}
                      </span>
                    </>
                  )}
                  <br />
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

export { ROUTE_COLORS }
