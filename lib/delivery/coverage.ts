type Coordinates = { lat: number; lon: number };
export function pointDistance(a: Coordinates, b: Coordinates) {
  const rad = Math.PI / 180;
  const x = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(x, (b.lat - a.lat) * rad) * 6371;
}
const capitals = [{ lat: 55.75, lon: 37.62 }, { lat: 59.94, lon: 30.32 }];
/** В столичных регионах ищем до 300 км от введённого города; в других — 25 км. */
export function pointSearchRadius(center: Coordinates) {
  return capitals.some((c) => pointDistance(c, center) <= 300) ? 300 : 25;
}
