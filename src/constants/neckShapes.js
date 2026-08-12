// Fixed library of neck-cutout shapes for the 2D preview, keyed by a
// stable "shape" id. Admins can either pick one of these presets, or
// choose "custom" and draw their own polygon in the admin panel — see
// resolveNeckClipPath() below, which is the single source of truth
// both the admin panel and the Customize page use to turn a neck
// record into an actual clip-path.
export const NECK_SHAPES = {
  round: {
    label: "Round / Crew",
    clipPath:
      "polygon(0 18%, 15% 0, 38% 0, 45% 9%, 55% 9%, 62% 0, 85% 0, 100% 18%, 100% 100%, 0 100%)",
  },
  vneck: {
    label: "V-Neck",
    clipPath:
      "polygon(0 18%, 15% 0, 45% 0, 50% 16%, 55% 0, 85% 0, 100% 18%, 100% 100%, 0 100%)",
  },
  collar: {
    label: "Collar",
    clipPath: "polygon(0 18%, 15% 0, 85% 0, 100% 18%, 100% 100%, 0 100%)",
  },
  polo: {
    label: "Polo",
    clipPath:
      "polygon(0 18%, 15% 0, 85% 0, 100% 18%, 100% 100%, 58% 100%, 58% 30%, 42% 30%, 42% 100%, 0 100%)",
  },
  scoop: {
    label: "Scoop Neck",
    clipPath:
      "polygon(0 18%, 15% 0, 30% 0, 40% 14%, 50% 17%, 60% 14%, 70% 0, 85% 0, 100% 18%, 100% 100%, 0 100%)",
  },
  boat: {
    label: "Boat Neck",
    clipPath:
      "polygon(0 12%, 12% 4%, 30% 2%, 70% 2%, 88% 4%, 100% 12%, 100% 100%, 0 100%)",
  },
  turtleneck: {
    label: "Turtleneck",
    clipPath:
      "polygon(0 22%, 18% 0, 32% 6%, 68% 6%, 82% 0, 100% 22%, 100% 100%, 0 100%)",
  },
};

export const NECK_SHAPE_KEYS = Object.keys(NECK_SHAPES);

// Sensible starting polygon when an admin switches a style to
// "custom" and there's nothing to seed it from.
export const DEFAULT_CUSTOM_POINTS = [
  { x: 0, y: 18 },
  { x: 15, y: 0 },
  { x: 85, y: 0 },
  { x: 100, y: 18 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

// points: [{ x, y }, ...] in 0–100 percent space -> CSS polygon() string.
export function pointsToClipPath(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  return `polygon(${points.map((p) => `${p.x}% ${p.y}%`).join(", ")})`;
}

// Reverse of the above — lets the editor seed itself from any
// existing preset's clip-path (e.g. "start from Round, then tweak").
export function parseClipPathToPoints(clipPath) {
  if (!clipPath) return null;
  const match = clipPath.match(/polygon\(([^)]+)\)/);
  if (!match) return null;
  return match[1].split(",").map((pair) => {
    const [xStr, yStr] = pair.trim().split(/\s+/);
    return {
      x: Math.round((parseFloat(xStr) || 0) * 10) / 10,
      y: Math.round((parseFloat(yStr) || 0) * 10) / 10,
    };
  });
}

// SINGLE SOURCE OF TRUTH for turning a neck record into a clip-path.
// Used by both the admin panel and the Customize page so a custom
// shape looks identical everywhere. Resolution order:
//   1. Custom points on the record (admin-drawn shape)
//   2. A recognized preset key in NECK_SHAPES
//   3. "round" as the last-resort fallback — nothing ever renders
//      unclipped, even with missing/corrupt data.
export function resolveNeckClipPath(neck) {
  if (!neck) return NECK_SHAPES.round.clipPath;
  if (neck.shape === "custom" && Array.isArray(neck.points) && neck.points.length >= 3) {
    return pointsToClipPath(neck.points) || NECK_SHAPES.round.clipPath;
  }
  return NECK_SHAPES[neck.shape]?.clipPath || NECK_SHAPES.round.clipPath;
}