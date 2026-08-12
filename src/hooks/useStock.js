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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { runTransaction } from "firebase/firestore";

export const stockDocId = (colorId, sizeId, neckId) =>
  `${colorId}_${sizeId}_${neckId}`;

// Statuses a customer can still self-cancel from. MIRRORS
// canCancelOrder in MyOrders.jsx — keep both in sync. Once an order
// passes "Confirmed" (e.g. into "Printing"), the shirt may already be
// in production and self-cancel should no longer be offered.
const CANCELLABLE_STATUSES = ["pending", "confirmed"];

// Collapses multiple order lines that resolve to the same stock combo
// (same colorId + sizeId + neckId) into a single entry with a summed
// quantity. Without this, a transaction that reads/writes the same
// stock doc twice from two separate lines would only apply one line's
// worth of change, silently under-decrementing or under-restocking.
function mergeQuantitiesByCombo(items) {
  const map = new Map();
  items.forEach((item) => {
    const key = stockDocId(item.colorId, item.sizeId, item.neckId);
    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(key, { ...item });
    }
  });
  return Array.from(map.values());
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

// Customer-initiated cancellation. Only valid while status is
// "Pending" or "Confirmed" — once an order moves past that (e.g. to
// "Printing"), the shirt may already be in production and self-cancel
// should no longer be offered (the button that calls this should
// already be hidden by then; this is the server-side backstop).
//
// Runs as a single transaction so the stock restock and the order
// status change either both happen or neither does. (Previously these
// were two separate operations — if the status update failed after
// the restock had already committed, the order would stay in its
// prior status while stock had already been returned, and a retry
// would restock a second time.) The status check also happens inside
// the transaction, against the live document — not against whatever
// status the caller's UI last had cached — so a status change made by
// another tab/admin between the user opening the cancel dialog and
// confirming it is still caught correctly.
//
// Restock quantities come from the order document's own `items` field
// (as persisted by Checkout.jsx), not from the orderItems argument —
// that way a stale or mismatched caller-supplied array can't cause an
// incorrect restock. orderItems is kept only as a fallback for any
// legacy order docs that predate the `items` field.
export async function cancelOrder(orderId, orderItems, reason) {
  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error("Order not found.");
    }

    const status = (orderSnap.data().status || "").toLowerCase();
    if (!CANCELLABLE_STATUSES.includes(status)) {
      throw new Error(
        "This order can no longer be cancelled — it's already being processed.",
      );
    }

    const persistedItems = orderSnap.data().items || orderItems || [];
    const stockItems = mergeQuantitiesByCombo(
      getStockItemsFromOrder(persistedItems),
    );
    const stockRefs = stockItems.map((item) =>
      doc(db, "stock", stockDocId(item.colorId, item.sizeId, item.neckId)),
    );

    // All reads must happen before any writes in a Firestore transaction.
    const stockSnaps = await Promise.all(
      stockRefs.map((ref) => transaction.get(ref)),
    );

    stockSnaps.forEach((snap, i) => {
      if (!snap.exists()) return; // no stock entry = unlimited, nothing to restock
      const data = snap.data();
      transaction.update(stockRefs[i], {
        quantity: (data.quantity || 0) + stockItems[i].quantity,
        inStock: true,
      });
    });

    transaction.update(orderRef, {
      status: "Cancelled",
      cancelledAt: serverTimestamp(),
      cancelledBy: "user",
      cancellationReason: reason || "No reason provided",
    });
  });
}

// Call this when an order is placed. items is an array of
// { colorId, sizeId, neckId, quantity } — one per cart line that has
// a colorId (collection items without one are skipped by the caller).
// Runs as a single transaction so concurrent checkouts can't oversell
// the same combo — either the whole order's stock decrements
// successfully, or none of it does.
//
// Lines are merged by combo first — two cart lines for the same
// color/size/neck are treated as one combined quantity, both for the
// availability check and the actual decrement (see
// mergeQuantitiesByCombo above).
export async function decrementStockForOrder(items) {
  if (items.length === 0) return;

  const merged = mergeQuantitiesByCombo(items);

  await runTransaction(db, async (transaction) => {
    const refs = merged.map((item) =>
      doc(db, "stock", stockDocId(item.colorId, item.sizeId, item.neckId)),
    );

    // All reads must happen before any writes in a Firestore transaction.
    const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return; // no stock entry = unlimited, skip
      const data = snap.data();
      const remaining = (data.quantity || 0) - merged[i].quantity;

      if (!data.inStock || remaining < 0) {
        throw new Error(
          `"${merged[i].colorId} / ${merged[i].sizeId} / ${merged[i].neckId}" doesn't have enough stock left.`,
        );
      }
    });

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remaining = (data.quantity || 0) - merged[i].quantity;
      transaction.update(refs[i], {
        quantity: remaining,
        // Auto-flip to out-of-stock if this order exactly empties it.
        inStock: remaining > 0 ? data.inStock : false,
      });
    });
  });
}

// Reverses decrementStockForOrder — call if order creation fails
// after stock was already decremented. (cancelOrder above has its own
// inline restock logic, sourced from the order doc, so it doesn't
// call this.)
export async function restockForCancelledOrder(items) {
  if (items.length === 0) return;

  const merged = mergeQuantitiesByCombo(items);

  await runTransaction(db, async (transaction) => {
    const refs = merged.map((item) =>
      doc(db, "stock", stockDocId(item.colorId, item.sizeId, item.neckId)),
    );
    const snaps = await Promise.all(refs.map((ref) => transaction.get(ref)));

    snaps.forEach((snap, i) => {
      if (!snap.exists()) return;
      const data = snap.data();
      transaction.update(refs[i], {
        quantity: (data.quantity || 0) + merged[i].quantity,
        inStock: true,
      });
    });
  });
}

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
    quantity: Math.max(0, Number(quantity) || 0),
    inStock: Boolean(inStock),
  });
}

export async function removeStockEntry(colorId, sizeId, neckId) {
  const id = stockDocId(colorId, sizeId, neckId);
  await deleteDoc(doc(db, "stock", id));
}

// Firestore batched writes cap at 500 ops — chunk to stay safely under.
// Note: each chunk commits independently, so a bulk write of more than
// BATCH_CHUNK_SIZE entries isn't atomic end-to-end — if a later chunk
// fails, earlier chunks have already been applied. Acceptable for an
// admin bulk tool; not suitable if you ever need all-or-nothing across
// more than ~450 entries.
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
        quantity: Math.max(0, Number(entry.quantity) || 0),
        inStock: Boolean(entry.inStock),
      });
    });

    await batch.commit();
  }

  return entries.length;
}