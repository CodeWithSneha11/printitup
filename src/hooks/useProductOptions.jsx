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
  necks: [
    { id: "round", label: "Round", active: true },
    { id: "vneck", label: "V-Neck", active: true },
    { id: "collar", label: "Collar", active: true },
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
            necks: data.necks?.length ? data.necks : DEFAULT_OPTIONS.necks,
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