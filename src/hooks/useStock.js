import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { runTransaction } from "firebase/firestore";


// Customer-initiated cancellation. Only valid while status is
// "Pending" — once an admin moves it past that, the shirt may already
// be in production and self-cancel should no longer be offered (the
// button that calls this should already be hidden by then; this is
// the server-side backstop).
export async function cancelOrder(orderId, orderItems) {
  const orderRef = doc(db, "orders", orderId);
  const snap = await getDoc(orderRef);

  if (!snap.exists()) {
    throw new Error("Order not found.");
  }

  if (snap.data().status !== "Pending") {
    throw new Error(
      "This order can no longer be cancelled — it's already being processed.",
    );
  }

  // Restock first. If this throws, the order status is untouched, so
  // there's no state where stock is silently lost.
  const stockItems = getStockItemsFromOrder(orderItems);
  if (stockItems.length > 0) {
    await restockForCancelledOrder(stockItems);
  }

  await updateDoc(orderRef, { status: "Cancelled" });
}

// Same shape-normalizing logic as Checkout.jsx's getStockItems —
// pulled out here so both files stay in sync. Only items carrying
// colorId are included (collection items don't yet store one).
function getStockItemsFromOrder(items) {
  return items
    .filter(
      (item) =>
        item.colorId && (item.size || item.sizeId) && (item.neck || item.neckId),
    )
    .map((item) => ({
      colorId: item.colorId,
      sizeId: item.sizeId || item.size,
      neckId: item.neckId || item.neck,
      quantity: Number(item.quantity) || 1,
    }));
}
// Call this when an order is placed. items is an array of
// { colorId, sizeId, neckId, quantity } — one per cart line that has
// a colorId (collection items without one are skipped by the caller).
// Runs as a single transaction so concurrent checkouts can't oversell
// the same combo — either the whole order's stock decrements
// successfully, or none of it does.
export async function decrementStockForOrder(items) {
  if (items.length === 0) return;

  await runTransaction(db, async (transaction) => {
    const refs = items.map((item) =>
      doc(db, "stock", stockDocId(item.colorId, item.sizeId, item.neckId)),
    );

    // All reads must happen before any writes in a Firestore transaction.
    const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return; // no stock entry = unlimited, skip
      const data = snap.data();
      const remaining = (data.quantity || 0) - items[i].quantity;

      if (!data.inStock || remaining < 0) {
        throw new Error(
          `"${items[i].colorId} / ${items[i].sizeId} / ${items[i].neckId}" doesn't have enough stock left.`,
        );
      }
    });

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remaining = data.quantity - items[i].quantity;
      transaction.update(refs[i], {
        quantity: remaining,
        // Auto-flip to out-of-stock if this order exactly empties it.
        inStock: remaining > 0 ? data.inStock : false,
      });
    });
  });
}

// Reverses decrementStockForOrder — call if order creation fails
// after stock was already decremented, or if an order is later
// cancelled/refunded.
export async function restockForCancelledOrder(items) {
  if (items.length === 0) return;

  await runTransaction(db, async (transaction) => {
    const refs = items.map((item) =>
      doc(db, "stock", stockDocId(item.colorId, item.sizeId, item.neckId)),
    );
    const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return;
      const data = snap.data();
      transaction.update(refs[i], {
        quantity: data.quantity + items[i].quantity,
        inStock: true,
      });
    });
  });
}
export const stockDocId = (colorId, sizeId, neckId) =>
  `${colorId}_${sizeId}_${neckId}`;

// Live-subscribes to the whole stock collection. Small enough for a
// storefront's catalog size — used by both the admin stock manager
// and the Customize page (to check the currently selected combo).
export function useStock() {
  const [stockMap, setStockMap] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "stock"),
      (snap) => {
        const map = {};
        snap.forEach((docSnap) => {
          map[docSnap.id] = docSnap.data();
        });
        setStockMap(map);
        setLoaded(true);
        setError(null);
      },
      (err) => {
        console.warn("Could not load stock:", err);
        setError(err);
        setLoaded(true);
      },
    );
    return () => unsub();
  }, []);

  return { stockMap, loaded, error };
}

export async function upsertStock(colorId, sizeId, neckId, quantity, inStock) {
  const id = stockDocId(colorId, sizeId, neckId);
  await setDoc(doc(db, "stock", id), {
    colorId,
    sizeId,
    neckId,
    quantity: Number(quantity) || 0,
    inStock: Boolean(inStock),
  });
}

export async function removeStockEntry(colorId, sizeId, neckId) {
  const id = stockDocId(colorId, sizeId, neckId);
  await deleteDoc(doc(db, "stock", id));
}

// Firestore batched writes cap at 500 ops — chunk to stay safely under.
const BATCH_CHUNK_SIZE = 450;

// Writes many stock entries in as few batches as possible. entries is
// an array of { colorId, sizeId, neckId, quantity, inStock }. Returns
// the number of entries written. Used by the bulk-generate and
// bulk-update-by-filter tools in AdminStockManager.
export async function bulkUpsertStock(entries) {
  for (let i = 0; i < entries.length; i += BATCH_CHUNK_SIZE) {
    const chunk = entries.slice(i, i + BATCH_CHUNK_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((entry) => {
      const id = stockDocId(entry.colorId, entry.sizeId, entry.neckId);
      batch.set(doc(db, "stock", id), {
        colorId: entry.colorId,
        sizeId: entry.sizeId,
        neckId: entry.neckId,
        quantity: Number(entry.quantity) || 0,
        inStock: Boolean(entry.inStock),
      });
    });

    await batch.commit();
  }

  return entries.length;
}