export interface VehicleRoute {
  id: string
  name: string
  color: string
  vehicle: string
  waypoints: Array<{ lat: number; lng: number }>
  createdAt: string
  active: boolean
}

export interface GapCluster {
  centroidLat: number
  centroidLng: number
  farmerIds: string[]
  nearestRouteDistKm: number
}

export interface GapResult {
  coveredIds: Set<string>
  uncoveredIds: Set<string>
  clusters: GapCluster[]
  totalMapped: number
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Minimum distance (km) from point P to line segment A→B using flat-earth approx
function pointToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dx = bLng - aLng
  const dy = bLat - aLat
  if (dx === 0 && dy === 0) return haversineKm(pLat, pLng, aLat, aLng)
  const t = Math.max(
    0,
    Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy))
  )
  return haversineKm(pLat, pLng, aLat + t * dy, aLng + t * dx)
}

export function runGapAnalysis(
  farmers: Array<{ id: string; lastLat: number; lastLng: number }>,
  routes: VehicleRoute[],
  coverageRadiusKm: number
): GapResult {
  const coveredIds = new Set<string>()
  const uncoveredIds = new Set<string>()
  const mappedFarmers = farmers.filter((f) => !(f.lastLat === 0 && f.lastLng === 0))

  for (const farmer of mappedFarmers) {
    let isCovered = false
    outer: for (const route of routes) {
      if (route.waypoints.length === 0) continue
      if (route.waypoints.length === 1) {
        const wp = route.waypoints[0]
        if (haversineKm(farmer.lastLat, farmer.lastLng, wp.lat, wp.lng) <= coverageRadiusKm) {
          isCovered = true
          break
        }
        continue
      }
      for (let i = 0; i < route.waypoints.length - 1; i++) {
        const a = route.waypoints[i]
        const b = route.waypoints[i + 1]
        const dist = pointToSegmentKm(
          farmer.lastLat,
          farmer.lastLng,
          a.lat,
          a.lng,
          b.lat,
          b.lng
        )
        if (dist <= coverageRadiusKm) {
          isCovered = true
          break outer
        }
      }
    }
    if (isCovered) coveredIds.add(farmer.id)
    else uncoveredIds.add(farmer.id)
  }

  const uncoveredFarmers = mappedFarmers
    .filter((f) => uncoveredIds.has(f.id))
    .map((f) => ({ id: f.id, lat: f.lastLat, lng: f.lastLng }))
  const clusters = clusterPoints(uncoveredFarmers, 8)

  for (const cluster of clusters) {
    let minDist = Infinity
    for (const route of routes) {
      for (const wp of route.waypoints) {
        const d = haversineKm(cluster.centroidLat, cluster.centroidLng, wp.lat, wp.lng)
        if (d < minDist) minDist = d
      }
      for (let i = 0; i < route.waypoints.length - 1; i++) {
        const a = route.waypoints[i]
        const b = route.waypoints[i + 1]
        const d = pointToSegmentKm(cluster.centroidLat, cluster.centroidLng, a.lat, a.lng, b.lat, b.lng)
        if (d < minDist) minDist = d
      }
    }
    cluster.nearestRouteDistKm = minDist === Infinity ? 0 : Math.round(minDist * 10) / 10
  }

  clusters.sort((a, b) => b.farmerIds.length - a.farmerIds.length)

  return { coveredIds, uncoveredIds, clusters, totalMapped: mappedFarmers.length }
}

function clusterPoints(
  points: Array<{ id: string; lat: number; lng: number }>,
  radiusKm: number
): GapCluster[] {
  const visited = new Set<string>()
  const clusters: GapCluster[] = []

  for (const p of points) {
    if (visited.has(p.id)) continue
    const group = points.filter(
      (q) => !visited.has(q.id) && haversineKm(p.lat, p.lng, q.lat, q.lng) <= radiusKm
    )
    group.forEach((q) => visited.add(q.id))
    const centLat = group.reduce((s, q) => s + q.lat, 0) / group.length
    const centLng = group.reduce((s, q) => s + q.lng, 0) / group.length
    clusters.push({
      centroidLat: centLat,
      centroidLng: centLng,
      farmerIds: group.map((q) => q.id),
      nearestRouteDistKm: 0,
    })
  }

  return clusters
}
