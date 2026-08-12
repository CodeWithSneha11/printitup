import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const OPTIONS_DOC = ["settings", "productOptions"];

export const DEFAULT_OPTIONS = {
  colors: [
    { id: "white", name: "White", code: "#ffffff", active: true },
    { id: "black", name: "Black", code: "#111111", active: true },
    { id: "red", name: "Red", code: "#ef4444", active: true },
    { id: "navy", name: "Navy", code: "#1e3a8a", active: true },
    { id: "green", name: "Green", code: "#16a34a", active: true },
    { id: "grey", name: "Grey", code: "#9ca3af", active: true },
  ],
  // `shape` is either a key into NECK_SHAPES, or "custom" — in which
  // case `points` (an array of {x,y} percentages) holds the actual
  // polygon and NECK_SHAPES is ignored. `id` stays the stable
  // identifier used everywhere else (stock keys, saved designs) so it
  // must never change once designs/stock reference it.
  necks: [
    { id: "round", label: "Round", shape: "round", active: true },
    { id: "vneck", label: "V-Neck", shape: "vneck", active: true },
    { id: "collar", label: "Collar", shape: "collar", active: true },
  ],
  sizes: [
    { id: "XS", label: "XS", active: true },
    { id: "S", label: "S", active: true },
    { id: "M", label: "M", active: true },
    { id: "L", label: "L", active: true },
    { id: "XL", label: "XL", active: true },
    { id: "XXL", label: "XXL", active: true },
  ],
};

// Live-subscribes to settings/productOptions. Falls back to
// DEFAULT_OPTIONS if the doc is missing/empty/fails to load, so the
// Customize page never renders with zero choices.
export function useProductOptions() {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ref = doc(db, ...OPTIONS_DOC);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setOptions({
            colors: data.colors?.length ? data.colors : DEFAULT_OPTIONS.colors,
            // Normalize: a neck doc written before `shape` existed
            // falls back to using its own `id` as the shape key,
            // unless it already carries custom `points` (in which
            // case it's obviously meant to be "custom"). resolveNeckClipPath()
            // has its own final fallback to "round" on top of this.
            necks: data.necks?.length
              ? data.necks.map((n) => ({
                  ...n,
                  shape:
                    n.shape ||
                    (Array.isArray(n.points) && n.points.length >= 3 ? "custom" : n.id),
                }))
              : DEFAULT_OPTIONS.necks,
            sizes: data.sizes?.length ? data.sizes : DEFAULT_OPTIONS.sizes,
          });
        }
        setLoaded(true);
      },
      (err) => {
        console.warn("Could not load product options, using defaults:", err);
        setLoaded(true);
      },
    );
    return () => unsub();
  }, []);

  return { options, loaded };
}

export async function saveProductOptions(options) {
  const ref = doc(db, ...OPTIONS_DOC);
  // Full overwrite — the admin page always sends the complete
  // colors/necks/sizes arrays, so merge:false keeps it simple and
  // avoids stale array entries lingering after a delete.
  await setDoc(ref, options, { merge: false });
}