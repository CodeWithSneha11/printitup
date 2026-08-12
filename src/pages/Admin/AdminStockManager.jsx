import React, { useState } from "react";
import { useProductOptions } from "../../hooks/useProductOptions";
import {
  useStock,
  upsertStock,
  removeStockEntry,
  bulkUpsertStock,
  stockDocId,
} from "../../hooks/useStock";
import "../../styles/AdminStock.css";

const clampNonNegative = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return n < 0 ? 0 : Math.floor(n);
};

const pluralize = (count, singular, plural = `${singular}s`) =>
  count === 1 ? singular : plural;

const AdminStockManager = () => {
  const { options, loaded: optionsLoaded } = useProductOptions();
  const { stockMap, loaded: stockLoaded, error: stockError } = useStock();

  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [neckId, setNeckId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingKey, setEditingKey] = useState(null); // stockDocId of entry being edited, or null

  // --- Bulk generate ---
  const [bulkQuantity, setBulkQuantity] = useState(50);
  const [bulkInStock, setBulkInStock] = useState(true);
  const [bulkSkipExisting, setBulkSkipExisting] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  // Replaces window.confirm(). Holds the exact combo list (and how
  // many were skipped as already-existing) frozen at the moment
  // "Generate" was clicked, so what the admin sees and confirms
  // against can't silently drift if stock data changes elsewhere
  // while this panel is open. A native confirm() dialog can only
  // repeat a generic sentence — this shows the real numbers.
  //
  // IMPORTANT: quantity/inStock are also frozen into this object
  // (not re-read from bulkQuantity/bulkInStock at render time),
  // because those live form fields stay visible/editable while the
  // panel is open. Rendering from live state would let the preview
  // text drift away from what `combos` actually contains.
  const [pendingBulkGenerate, setPendingBulkGenerate] = useState(null);

  // --- Bulk update by filter ---
  const [filterColorId, setFilterColorId] = useState("");
  const [filterSizeId, setFilterSizeId] = useState("");
  const [filterNeckId, setFilterNeckId] = useState("");
  const [filterQuantity, setFilterQuantity] = useState(50);
  const [filterInStock, setFilterInStock] = useState(true);
  const [filterRunning, setFilterRunning] = useState(false);
  // Same rule as pendingBulkGenerate: quantity/inStock frozen inside.
  const [pendingBulkFilter, setPendingBulkFilter] = useState(null);

  // ---------- Search ----------
const [searchTerm, setSearchTerm] = useState("");
const [searchField, setSearchField] = useState("all");
const [statusFilter, setStatusFilter] = useState("all");

  const activeColors = options.colors.filter((c) => c.active);
  const activeSizes = options.sizes.filter((s) => s.active);
  const activeNecks = options.necks.filter((n) => n.active);

  const totalCombinations =
    activeColors.length * activeSizes.length * activeNecks.length;

  const hasActiveOptions =
    activeColors.length > 0 && activeSizes.length > 0 && activeNecks.length > 0;

  // How many of the currently-active combinations already have a
  // stock doc vs. how many are missing — computed live (not just at
  // click time) so the panel can tell the admin up front what
  // "Generate" will actually do, instead of the label just claiming
  // "All Combinations" regardless of what's already there.
  let existingActiveCombosCount = 0;
  activeColors.forEach((color) => {
    activeSizes.forEach((size) => {
      activeNecks.forEach((neck) => {
        if (stockMap[stockDocId(color.id, size.id, neck.id)]) {
          existingActiveCombosCount += 1;
        }
      });
    });
  });
  const missingCombosCount = totalCombinations - existingActiveCombosCount;

  // Live preview of how many combos the current filter selection
  // matches, so "Apply to Matching" can be disabled/labelled
  // accurately before the admin even clicks it.
  const filterHasSelection = Boolean(
    filterColorId || filterSizeId || filterNeckId,
  );
  let filterMatchCount = 0;
  activeColors.forEach((color) => {
    if (filterColorId && color.id !== filterColorId) return;
    activeSizes.forEach((size) => {
      if (filterSizeId && size.id !== filterSizeId) return;
      activeNecks.forEach((neck) => {
        if (filterNeckId && neck.id !== filterNeckId) return;
        filterMatchCount += 1;
      });
    });
  });

  const resetForm = () => {
    setColorId("");
    setSizeId("");
    setNeckId("");
    setQuantity(0);
    setInStock(true);
    setEditingKey(null);
  };

  const flashMessage = (text, timeout = 2500) => {
    setMessage(text);
    if (timeout) setTimeout(() => setMessage(""), timeout);
  };

  // Resolves a display name for an id, even if that option is now
  // inactive or has been deleted (falls back to the raw id so stale
  // entries are still visible instead of showing a blank cell).
  const nameFor = (list, id) => {
    const match = list.find((x) => x.id === id);
    if (!match) return { label: id, stale: true };
    return { label: match.name || match.label || id, stale: false };
  };

  // ---------- Single entry save/edit/delete ----------

  const handleSave = async (e) => {
    e.preventDefault();
    if (!colorId || !sizeId || !neckId) {
      flashMessage("❌ Pick a color, size and neck style.");
      return;
    }

    const key = stockDocId(colorId, sizeId, neckId);
    const existing = stockMap[key];

    // If this combo already has a stock entry and the admin didn't
    // get here via "Edit" on that row, they're about to silently
    // overwrite it. Ask first — mirrors the confirm() already used
    // for delete, so the guard is consistent across the page.
    if (existing && editingKey !== key) {
      const proceed = window.confirm(
        `This combination already has a stock entry (quantity ${existing.quantity}, ` +
          `${existing.inStock ? "in stock" : "out of stock"}). Overwrite it?`,
      );
      if (!proceed) return;
    }

    try {
      setSaving(true);
      setMessage("");
      await upsertStock(colorId, sizeId, neckId, clampNonNegative(quantity), inStock);
      flashMessage("✅ Stock saved");
      resetForm();
    } catch (err) {
      console.error(err);
      flashMessage("❌ " + (err.message || "Failed to save stock."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setColorId(entry.colorId);
    setSizeId(entry.sizeId);
    setNeckId(entry.neckId);
    setQuantity(entry.quantity);
    setInStock(entry.inStock);
    setEditingKey(stockDocId(entry.colorId, entry.sizeId, entry.neckId));
  };

  const handleCancelEdit = () => resetForm();

  const handleDelete = async (entry) => {
    if (
      !window.confirm(
        "Remove this stock entry? The combo will fall back to 'always available'.",
      )
    )
      return;
    try {
      await removeStockEntry(entry.colorId, entry.sizeId, entry.neckId);
      if (editingKey === stockDocId(entry.colorId, entry.sizeId, entry.neckId)) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
      flashMessage("❌ Failed to delete: " + (err.message || "unknown error"));
    }
  };

  // ---------- Bulk generate ----------
  // Step 1: build the combo list this run would touch (frozen at
  // click time) and open the inline confirmation panel — instead of
  // running immediately — so the admin sees exactly how many entries
  // are new vs. skipped-as-already-existing before anything is
  // written to Firestore.
  const openBulkGenerateConfirm = () => {
    const combos = [];
    let skipped = 0;
    const snapshotQuantity = clampNonNegative(bulkQuantity);
    const snapshotInStock = bulkInStock;

    activeColors.forEach((color) => {
      activeSizes.forEach((size) => {
        activeNecks.forEach((neck) => {
          const id = stockDocId(color.id, size.id, neck.id);
          if (bulkSkipExisting && stockMap[id]) {
            skipped += 1;
            return;
          }

          combos.push({
            colorId: color.id,
            sizeId: size.id,
            neckId: neck.id,
            quantity: snapshotQuantity,
            inStock: snapshotInStock,
          });
        });
      });
    });

    if (combos.length === 0) {
      flashMessage(
        "Nothing to generate — every combination already has a stock entry.",
        3000,
      );
      return;
    }

    setPendingBulkGenerate({
      combos,
      skipped,
      quantity: snapshotQuantity,
      inStock: snapshotInStock,
    });
  };

  // Step 2: actually write, once the admin confirms the panel.
  const confirmBulkGenerate = async () => {
    if (!pendingBulkGenerate) return;
    const { combos, skipped } = pendingBulkGenerate;

    try {
      setBulkRunning(true);
      setMessage("");
      const count = await bulkUpsertStock(combos);
      flashMessage(
        skipped > 0
          ? `✅ Created ${count} new stock ${pluralize(count, "entry", "entries")}. ${skipped} existing ${pluralize(skipped, "entry", "entries")} left unchanged.`
          : `✅ Generated ${count} stock ${pluralize(count, "entry", "entries")}.`,
        4000,
      );
    } catch (err) {
      console.error(err);
      flashMessage("❌ " + (err.message || "Bulk generate failed."), 3000);
    } finally {
      setBulkRunning(false);
      setPendingBulkGenerate(null);
    }
  };

  const cancelBulkGenerate = () => setPendingBulkGenerate(null);

  // ---------- Bulk update by filter ----------
  const openBulkFilterConfirm = () => {
    if (!filterHasSelection) {
      flashMessage(
        "❌ Pick at least one filter (color, size, or neck) before bulk updating.",
        3000,
      );
      return;
    }

    const combos = [];
    const snapshotQuantity = clampNonNegative(filterQuantity);
    const snapshotInStock = filterInStock;

    activeColors.forEach((color) => {
      if (filterColorId && color.id !== filterColorId) return;
      activeSizes.forEach((size) => {
        if (filterSizeId && size.id !== filterSizeId) return;
        activeNecks.forEach((neck) => {
          if (filterNeckId && neck.id !== filterNeckId) return;
          combos.push({
            colorId: color.id,
            sizeId: size.id,
            neckId: neck.id,
            quantity: snapshotQuantity,
            inStock: snapshotInStock,
          });
        });
      });
    });

    if (combos.length === 0) {
      flashMessage("No combinations match that filter.", 3000);
      return;
    }

    const existingCount = combos.filter((c) =>
      stockMap[stockDocId(c.colorId, c.sizeId, c.neckId)],
    ).length;

    setPendingBulkFilter({
      combos,
      existingCount,
      newCount: combos.length - existingCount,
      quantity: snapshotQuantity,
      inStock: snapshotInStock,
      colorLabel: filterColorId
        ? nameFor(options.colors, filterColorId).label
        : "All colors",
      sizeLabel: filterSizeId
        ? nameFor(options.sizes, filterSizeId).label
        : "All sizes",
      neckLabel: filterNeckId
        ? nameFor(options.necks, filterNeckId).label
        : "All neck styles",
    });
  };

  const confirmBulkFilter = async () => {
    if (!pendingBulkFilter) return;
    const { combos } = pendingBulkFilter;

    try {
      setFilterRunning(true);
      setMessage("");
      const count = await bulkUpsertStock(combos);
      flashMessage(
        `✅ Updated ${count} matching stock ${pluralize(count, "entry", "entries")}.`,
        3000,
      );
    } catch (err) {
      console.error(err);
      flashMessage("❌ " + (err.message || "Bulk update failed."), 3000);
    } finally {
      setFilterRunning(false);
      setPendingBulkFilter(null);
    }
  };

  const cancelBulkFilter = () => setPendingBulkFilter(null);

  const entries = Object.values(stockMap).sort((a, b) =>
    stockDocId(a.colorId, a.sizeId, a.neckId).localeCompare(
      stockDocId(b.colorId, b.sizeId, b.neckId),
    ),
  );

  const filteredEntries = entries.filter((entry) => {
  const color = nameFor(options.colors, entry.colorId).label.toLowerCase();
  const size = nameFor(options.sizes, entry.sizeId).label.toLowerCase();
  const neck = nameFor(options.necks, entry.neckId).label.toLowerCase();

  const status =
    entry.inStock && entry.quantity > 0 ? "in stock" : "out of stock";

  const qty = String(entry.quantity);
  const search = searchTerm.toLowerCase().trim();

  let matchesSearch = true;

  if (search) {
    switch (searchField) {
      case "color":
        matchesSearch = color.includes(search);
        break;

      case "size":
        matchesSearch = size.includes(search);
        break;

      case "neck":
        matchesSearch = neck.includes(search);
        break;

      case "quantity":
        matchesSearch = qty.includes(search);
        break;

      case "status":
        matchesSearch = status.includes(search);
        break;

      case "all":
      default:
        matchesSearch =
          color.includes(search) ||
          size.includes(search) ||
          neck.includes(search) ||
          qty.includes(search) ||
          status.includes(search);
        break;
    }
  }

  const matchesStatus =
    statusFilter === "all" ||
    (statusFilter === "instock" &&
      entry.inStock &&
      entry.quantity > 0) ||
    (statusFilter === "outofstock" &&
      (!entry.inStock || entry.quantity <= 0));

  return matchesSearch && matchesStatus;
});

  if (!optionsLoaded || !stockLoaded) {
    return <div className="admin-stock-page">Loading...</div>;
  }

  if (stockError) {
    return (
      <div className="admin-stock-page">
        <h2>Stock &amp; Availability</h2>
        <p className="admin-stock-message admin-stock-message-error">
          ❌ You don't have permission to view stock data. Make sure you're
          logged in with an admin account.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-stock-page">
      <h2>Stock &amp; Availability</h2>
      <p className="admin-stock-subtitle">
        Set stock quantity and availability for a specific color + size +
        neck combination. Combinations with no entry here are treated as
        always in stock.
      </p>

      {message && <p className="admin-stock-message">{message}</p>}

      {!hasActiveOptions && (
        <p className="admin-stock-warning">
          You need at least one active color, size and neck style before you
          can manage stock. Add or activate some in Product Options first.
        </p>
      )}

      {/* BULK GENERATE — create stock rows for every combination at once */}
      <section className="admin-bulk-panel">
        <h3>Bulk Generate</h3>
        <p className="admin-bulk-hint">
          Every active color × size × neck combination ({activeColors.length}{" "}
          × {activeSizes.length} × {activeNecks.length} = {totalCombinations}{" "}
          combinations).
        </p>

        {hasActiveOptions && (
          <p className="admin-bulk-status">
            {existingActiveCombosCount} of {totalCombinations} already{" "}
            {pluralize(existingActiveCombosCount, "has", "have")} a stock
            entry — <strong>{missingCombosCount}</strong>{" "}
            {pluralize(missingCombosCount, "is", "are")} missing.
          </p>
        )}

        <div className="admin-bulk-row">
          <label>
            Quantity
            <input
              type="number"
              min="0"
              value={bulkQuantity}
              disabled={Boolean(pendingBulkGenerate)}
              onChange={(e) => setBulkQuantity(e.target.value)}
            />
          </label>

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={bulkInStock}
              disabled={Boolean(pendingBulkGenerate)}
              onChange={(e) => setBulkInStock(e.target.checked)}
            />
            In stock
          </label>

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={bulkSkipExisting}
              disabled={Boolean(pendingBulkGenerate)}
              onChange={(e) => setBulkSkipExisting(e.target.checked)}
            />
            Skip combos that already have an entry
          </label>

          <button
            type="button"
            onClick={openBulkGenerateConfirm}
            disabled={
              bulkRunning ||
              Boolean(pendingBulkGenerate) ||
              !hasActiveOptions ||
              (bulkSkipExisting && missingCombosCount === 0)
            }
          >
            {bulkSkipExisting
              ? missingCombosCount === 0
                ? "All Combinations Already Exist"
                : `Generate ${missingCombosCount} Missing ${pluralize(missingCombosCount, "Combination")}`
              : `Regenerate All ${totalCombinations} ${pluralize(totalCombinations, "Combination")}`}
          </button>
        </div>

        {!bulkSkipExisting && hasActiveOptions && (
          <p className="admin-bulk-warning">
            ⚠️ "Skip combos that already have an entry" is off — this will
            overwrite every existing entry's quantity and status too, not
            just create the missing ones.
          </p>
        )}

        {pendingBulkGenerate && (
          <div className="admin-bulk-confirm">
            <p>
              {pendingBulkGenerate.skipped > 0 ? (
                <>
                  This creates{" "}
                  <strong>{pendingBulkGenerate.combos.length}</strong> new
                  stock{" "}
                  {pluralize(pendingBulkGenerate.combos.length, "entry", "entries")}{" "}
                  at quantity <strong>{pendingBulkGenerate.quantity}</strong>{" "}
                  ({pendingBulkGenerate.skipped} existing{" "}
                  {pluralize(pendingBulkGenerate.skipped, "entry", "entries")}{" "}
                  left unchanged).
                </>
              ) : (
                <>
                  This overwrites{" "}
                  <strong>{pendingBulkGenerate.combos.length}</strong> stock{" "}
                  {pluralize(pendingBulkGenerate.combos.length, "entry", "entries")}{" "}
                  (including any that already exist) to quantity{" "}
                  <strong>{pendingBulkGenerate.quantity}</strong>,{" "}
                  {pendingBulkGenerate.inStock ? "in stock" : "out of stock"}.
                </>
              )}
            </p>
            <div className="admin-bulk-confirm-actions">
              <button
                type="button"
                onClick={cancelBulkGenerate}
                disabled={bulkRunning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={confirmBulkGenerate}
                disabled={bulkRunning}
              >
                {bulkRunning ? "Generating..." : "Confirm & Generate"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* BULK UPDATE BY FILTER — e.g. "set every White shirt to 50" */}
      <section className="admin-bulk-panel">
        <h3>Bulk Update by Filter</h3>
        <p className="admin-bulk-hint">
          Set a quantity/status for every combination matching the filters
          below. Leave a filter as "All" to match every value for that
          field.
        </p>

        <div className="admin-bulk-row">
          <select
            value={filterColorId}
            aria-label="Filter by color"
            disabled={Boolean(pendingBulkFilter)}
            onChange={(e) => setFilterColorId(e.target.value)}
          >
            <option value="">All Colors</option>
            {activeColors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterSizeId}
            aria-label="Filter by size"
            disabled={Boolean(pendingBulkFilter)}
            onChange={(e) => setFilterSizeId(e.target.value)}
          >
            <option value="">All Sizes</option>
            {activeSizes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={filterNeckId}
            aria-label="Filter by neck style"
            disabled={Boolean(pendingBulkFilter)}
            onChange={(e) => setFilterNeckId(e.target.value)}
          >
            <option value="">All Neck Styles</option>
            {activeNecks.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            placeholder="Quantity"
            aria-label="Bulk update quantity"
            value={filterQuantity}
            disabled={Boolean(pendingBulkFilter)}
            onChange={(e) => setFilterQuantity(e.target.value)}
          />

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={filterInStock}
              disabled={Boolean(pendingBulkFilter)}
              onChange={(e) => setFilterInStock(e.target.checked)}
            />
            In stock
          </label>

          <button
            type="button"
            onClick={openBulkFilterConfirm}
            disabled={
              filterRunning ||
              Boolean(pendingBulkFilter) ||
              !hasActiveOptions ||
              !filterHasSelection ||
              filterMatchCount === 0
            }
          >
            {filterRunning
              ? "Updating..."
              : filterHasSelection
                ? `Apply to ${filterMatchCount} Matching ${pluralize(filterMatchCount, "Combination")}`
                : "Apply to Matching"}
          </button>
        </div>

        {filterHasSelection && hasActiveOptions && (
          <p className="admin-bulk-status">
            This filter matches <strong>{filterMatchCount}</strong>{" "}
            {pluralize(filterMatchCount, "combination")}.
          </p>
        )}

        {pendingBulkFilter && (
          <div className="admin-bulk-confirm">
            <p>
              This overwrites{" "}
              <strong>{pendingBulkFilter.combos.length}</strong> stock{" "}
              {pluralize(pendingBulkFilter.combos.length, "entry", "entries")}{" "}
              matching{" "}
              <strong>
                {pendingBulkFilter.colorLabel} / {pendingBulkFilter.sizeLabel} /{" "}
                {pendingBulkFilter.neckLabel}
              </strong>{" "}
              to quantity{" "}
              <strong>{pendingBulkFilter.quantity}</strong>,{" "}
              {pendingBulkFilter.inStock ? "in stock" : "out of stock"}
              {pendingBulkFilter.existingCount > 0 && (
                <>
                  {" "}
                  ({pendingBulkFilter.existingCount} already existed and will
                  be overwritten, {pendingBulkFilter.newCount} are new).
                </>
              )}
            </p>
            <div className="admin-bulk-confirm-actions">
              <button
                type="button"
                onClick={cancelBulkFilter}
                disabled={filterRunning}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={confirmBulkFilter}
                disabled={filterRunning}
              >
                {filterRunning ? "Updating..." : "Confirm & Apply"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* SINGLE ENTRY FORM */}
      {editingKey && (
        <div className="admin-editing-banner">
          <span>Editing existing stock entry</span>
          <button type="button" onClick={handleCancelEdit}>
            Cancel
          </button>
        </div>
      )}

      <form className="admin-stock-form" onSubmit={handleSave}>
        <select
          value={colorId}
          aria-label="Color"
          onChange={(e) => setColorId(e.target.value)}
        >
          <option value="">Color</option>
          {activeColors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {colorId && !activeColors.some((c) => c.id === colorId) && (
            <option value={colorId}>
              {nameFor(options.colors, colorId).label} (inactive)
            </option>
          )}
        </select>

        <select
          value={sizeId}
          aria-label="Size"
          onChange={(e) => setSizeId(e.target.value)}
        >
          <option value="">Size</option>
          {activeSizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
          {sizeId && !activeSizes.some((s) => s.id === sizeId) && (
            <option value={sizeId}>
              {nameFor(options.sizes, sizeId).label} (inactive)
            </option>
          )}
        </select>

        <select
          value={neckId}
          aria-label="Neck style"
          onChange={(e) => setNeckId(e.target.value)}
        >
          <option value="">Neck Style</option>
          {activeNecks.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
          {neckId && !activeNecks.some((n) => n.id === neckId) && (
            <option value={neckId}>
              {nameFor(options.necks, neckId).label} (inactive)
            </option>
          )}
        </select>

        <input
          type="number"
          min="0"
          placeholder="Quantity"
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        <label className="admin-stock-checkbox">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          In stock
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : editingKey ? "Update Stock Entry" : "Save Stock Entry"}
        </button>
      </form>

     {/* SEARCH BAR */}
<div className="admin-stock-search">
  <div className="admin-stock-search-box">

    

    <select
      className="search-field-select"
      value={searchField}
      onChange={(e) => setSearchField(e.target.value)}
      aria-label="Search field"
    >
      <option value="all">All Fields</option>
      <option value="color">Color</option>
      <option value="size">Size</option>
      <option value="neck">Neck Style</option>
      <option value="quantity">Quantity</option>
      
    </select>

    <input
      type="text"
      placeholder={
        searchField === "all"
          ? "Search stock entries..."
          : `Search by ${searchField === "neck" ? "neck style" : searchField}...`
      }
      aria-label="Search stock entries"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />

    {searchTerm && (
      <button
        type="button"
        className="clear-search-btn"
        aria-label="Clear search"
        onClick={() => setSearchTerm("")}
      >
        ✕
      </button>
    )}
  </div>

  <div className="search-result-count">
    Showing <strong>{filteredEntries.length}</strong> of{" "}
    <strong>{entries.length}</strong> stock entries
  </div>
</div>

      <div className="admin-stock-stats">
        <div className="stock-stat-card">
          <h4>Total Entries</h4>
          <span>{entries.length}</span>
        </div>

        <div className="stock-stat-card success">
          <h4>In Stock</h4>
          <span>{entries.filter((e) => e.inStock && e.quantity > 0).length}</span>
        </div>

        <div className="stock-stat-card danger">
          <h4>Out of Stock</h4>
          <span>{entries.filter((e) => !e.inStock || e.quantity <= 0).length}</span>
        </div>

        <div className="stock-stat-card primary">
          <h4>Total Quantity</h4>
          <span>{entries.reduce((sum, e) => sum + Number(e.quantity || 0), 0)}</span>
        </div>
      </div>

      <div className="admin-stock-filter-row">
        <label htmlFor="stock-status-filter">Status</label>
        <select
          id="stock-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="instock">In Stock</option>
          <option value="outofstock">Out of Stock</option>
        </select>
      </div>

      <table className="admin-stock-table searchable-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Size</th>
            <th>Neck</th>
            <th>Quantity</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredEntries.map((entry) => {
            const key = stockDocId(entry.colorId, entry.sizeId, entry.neckId);
            const color = nameFor(options.colors, entry.colorId);
            const size = nameFor(options.sizes, entry.sizeId);
            const neck = nameFor(options.necks, entry.neckId);
            return (
              <tr key={key} className={editingKey === key ? "is-editing" : ""}>
                <td>
                  {color.label}
                  {color.stale && <span className="stale-tag">deleted</span>}
                </td>
                <td>
                  {size.label}
                  {size.stale && <span className="stale-tag">deleted</span>}
                </td>
                <td>
                  {neck.label}
                  {neck.stale && <span className="stale-tag">deleted</span>}
                </td>
                <td>{entry.quantity}</td>
                <td>
                  <span
                    className={
                      entry.inStock && entry.quantity > 0 ? "in-stock" : "out-of-stock"
                    }
                  >
                    {entry.inStock && entry.quantity > 0 ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleEdit(entry)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(entry)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-stock-empty">
                No stock entries yet — all combinations are treated as in stock.
              </td>
            </tr>
          ) : filteredEntries.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-stock-empty">
                🔍 No stock entries match "<strong>{searchTerm}</strong>"
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

export default AdminStockManager;