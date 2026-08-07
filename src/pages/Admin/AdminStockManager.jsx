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

const AdminStockManager = () => {
  const { options, loaded: optionsLoaded } = useProductOptions();
  const {
    stockMap,
    loaded: stockLoaded,
    error: stockError,
  } = useStock();

  const [colorId, setColorId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [neckId, setNeckId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [inStock, setInStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // --- Bulk generate ---
  const [bulkQuantity, setBulkQuantity] = useState(50);
  const [bulkInStock, setBulkInStock] = useState(true);
  const [bulkSkipExisting, setBulkSkipExisting] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);

  // --- Bulk update by filter ---
  const [filterColorId, setFilterColorId] = useState("");
  const [filterSizeId, setFilterSizeId] = useState("");
  const [filterNeckId, setFilterNeckId] = useState("");
  const [filterQuantity, setFilterQuantity] = useState(50);
  const [filterInStock, setFilterInStock] = useState(true);
  const [filterRunning, setFilterRunning] = useState(false);
  // ---------- Search ----------
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
  const activeColors = options.colors.filter((c) => c.active);
  const activeSizes = options.sizes.filter((s) => s.active);
  const activeNecks = options.necks.filter((n) => n.active);

  const totalCombinations =
    activeColors.length * activeSizes.length * activeNecks.length;

  const resetForm = () => {
    setColorId("");
    setSizeId("");
    setNeckId("");
    setQuantity(0);
    setInStock(true);
  };

  const flashMessage = (text, timeout = 2500) => {
    setMessage(text);
    if (timeout) setTimeout(() => setMessage(""), timeout);
  };

  // ---------- Single entry save/edit/delete ----------

  const handleSave = async (e) => {
    e.preventDefault();
    if (!colorId || !sizeId || !neckId) {
      flashMessage("❌ Pick a color, size and neck style.");
      return;
    }
    try {
      setSaving(true);
      setMessage("");
      await upsertStock(colorId, sizeId, neckId, quantity, inStock);
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
  };

  const handleDelete = async (entry) => {
    if (
      !window.confirm(
        "Remove this stock entry? The combo will fall back to 'always available'.",
      )
    )
      return;
    try {
      await removeStockEntry(entry.colorId, entry.sizeId, entry.neckId);
    } catch (err) {
      console.error(err);
      flashMessage("❌ Failed to delete: " + (err.message || "unknown error"));
    }
  };

  // ---------- Bulk generate ----------
  // Generates one stock doc for every active color × size × neck
  // combination in a single set of batched writes. With
  // bulkSkipExisting on, combos that already have a stock entry are
  // left untouched (so re-running this never clobbers manual edits).

  const handleBulkGenerate = async () => {
    const combos = [];

    activeColors.forEach((color) => {
      activeSizes.forEach((size) => {
        activeNecks.forEach((neck) => {
          const id = stockDocId(color.id, size.id, neck.id);
          if (bulkSkipExisting && stockMap[id]) return;

          combos.push({
            colorId: color.id,
            sizeId: size.id,
            neckId: neck.id,
            quantity: bulkQuantity,
            inStock: bulkInStock,
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

    if (
      !window.confirm(
        `This will create ${combos.length} stock ${
          combos.length === 1 ? "entry" : "entries"
        } with quantity ${bulkQuantity}. Continue?`,
      )
    )
      return;

    try {
      setBulkRunning(true);
      setMessage("");
      const count = await bulkUpsertStock(combos);
      flashMessage(`✅ Generated ${count} stock entries.`, 3000);
    } catch (err) {
      console.error(err);
      flashMessage("❌ " + (err.message || "Bulk generate failed."), 3000);
    } finally {
      setBulkRunning(false);
    }
  };

  // ---------- Bulk update by filter ----------
  // Applies a quantity/status to every combo matching the chosen
  // filters (any field left as "All" matches everything). Useful for
  // e.g. "set every White shirt to 50" or "mark every XXL out of
  // stock" without touching combos outside that filter.

  const handleBulkUpdateByFilter = async () => {
    if (!filterColorId && !filterSizeId && !filterNeckId) {
      flashMessage(
        "❌ Pick at least one filter (color, size, or neck) before bulk updating.",
        3000,
      );
      return;
    }

    const combos = [];

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
            quantity: filterQuantity,
            inStock: filterInStock,
          });
        });
      });
    });

    if (combos.length === 0) {
      flashMessage("No combinations match that filter.", 3000);
      return;
    }

    if (
      !window.confirm(
        `This will overwrite ${combos.length} matching stock ${
          combos.length === 1 ? "entry" : "entries"
        } with quantity ${filterQuantity}. Continue?`,
      )
    )
      return;

    try {
      setFilterRunning(true);
      setMessage("");
      const count = await bulkUpsertStock(combos);
      flashMessage(`✅ Updated ${count} matching stock entries.`, 3000);
    } catch (err) {
      console.error(err);
      flashMessage("❌ " + (err.message || "Bulk update failed."), 3000);
    } finally {
      setFilterRunning(false);
    }
  };

  const nameFor = (list, id) =>
    list.find((x) => x.id === id)?.name ||
    list.find((x) => x.id === id)?.label ||
    id;
const entries = Object.values(stockMap)
  .sort((a, b) =>
    stockDocId(a.colorId, a.sizeId, a.neckId).localeCompare(
      stockDocId(b.colorId, b.sizeId, b.neckId)
    )
  );

const filteredEntries = entries.filter((entry) => {
  const color = (nameFor(options.colors, entry.colorId) || "").toLowerCase();
  const size = (nameFor(options.sizes, entry.sizeId) || "").toLowerCase();
  const neck = (nameFor(options.necks, entry.neckId) || "").toLowerCase();

  const status =
    entry.inStock && entry.quantity > 0
      ? "in stock"
      : "out of stock";

  const qty = String(entry.quantity);

  const search = searchTerm.toLowerCase().trim();

  const matchesSearch =
    !search ||
    color.includes(search) ||
    size.includes(search) ||
    neck.includes(search) ||
    qty.includes(search) ||
    status.includes(search);

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

      {/* BULK GENERATE — create stock rows for every combination at once */}
      <section className="admin-bulk-panel">
        <h3>Bulk Generate</h3>
        <p className="admin-bulk-hint">
          Creates a stock entry for every active color × size × neck
          combination ({activeColors.length} × {activeSizes.length} ×{" "}
          {activeNecks.length} = {totalCombinations} combinations) in one go.
        </p>

        <div className="admin-bulk-row">
          <label>
            Quantity
            <input
              type="number"
              min="0"
              value={bulkQuantity}
              onChange={(e) => setBulkQuantity(Number(e.target.value))}
            />
          </label>

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={bulkInStock}
              onChange={(e) => setBulkInStock(e.target.checked)}
            />
            In stock
          </label>

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={bulkSkipExisting}
              onChange={(e) => setBulkSkipExisting(e.target.checked)}
            />
            Skip combos that already have an entry
          </label>

          <button
            type="button"
            onClick={handleBulkGenerate}
            disabled={bulkRunning}
          >
            {bulkRunning ? "Generating..." : "Generate All Combinations"}
          </button>
        </div>
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
            value={filterQuantity}
            onChange={(e) => setFilterQuantity(Number(e.target.value))}
          />

          <label className="admin-stock-checkbox">
            <input
              type="checkbox"
              checked={filterInStock}
              onChange={(e) => setFilterInStock(e.target.checked)}
            />
            In stock
          </label>

          <button
            type="button"
            onClick={handleBulkUpdateByFilter}
            disabled={filterRunning}
          >
            {filterRunning ? "Updating..." : "Apply to Matching"}
          </button>
        </div>
      </section>

      {/* SINGLE ENTRY FORM */}
      <form className="admin-stock-form" onSubmit={handleSave}>
        <select value={colorId} onChange={(e) => setColorId(e.target.value)}>
          <option value="">Color</option>
          {activeColors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select value={sizeId} onChange={(e) => setSizeId(e.target.value)}>
          <option value="">Size</option>
          {activeSizes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <select value={neckId} onChange={(e) => setNeckId(e.target.value)}>
          <option value="">Neck Style</option>
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
          {saving ? "Saving..." : "Save Stock Entry"}
        </button>
      </form>
          {/* SEARCH BAR */}

<div className="admin-stock-search">
  <div className="admin-stock-search-box">

    <span className="search-icon">
      🔍
    </span>

    <input
      type="text"
      placeholder="Search by color, size, neck, quantity or status..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />

    {searchTerm && (
      <button
        type="button"
        className="clear-search-btn"
        onClick={() => setSearchTerm("")}
      >
        ✕
      </button>
    )}

  </div>

  <div className="search-result-count">

    Showing

    <strong>
      {" "}
      {filteredEntries.length}
      {" "}
    </strong>

    of

    <strong>
      {" "}
      {entries.length}
      {" "}
    </strong>

    stock entries

  </div>
</div>
<div className="admin-stock-stats">

  <div className="stock-stat-card">
    <h4>Total Entries</h4>
    <span>{entries.length}</span>
  </div>

  <div className="stock-stat-card success">
    <h4>In Stock</h4>
    <span>
      {
        entries.filter(
          (e) => e.inStock && e.quantity > 0
        ).length
      }
    </span>
  </div>

  <div className="stock-stat-card danger">
    <h4>Out of Stock</h4>
    <span>
      {
        entries.filter(
          (e) => !e.inStock || e.quantity <= 0
        ).length
      }
    </span>
  </div>

  <div className="stock-stat-card primary">
    <h4>Total Quantity</h4>
    <span>
      {entries.reduce(
        (sum, e) => sum + Number(e.quantity || 0),
        0
      )}
    </span>
  </div>

</div>
<div className="admin-stock-filter-row">

  <label>Status</label>

  <select
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
          {filteredEntries.map((entry) => (
            <tr key={stockDocId(entry.colorId, entry.sizeId, entry.neckId)}>
              <td>{nameFor(options.colors, entry.colorId)}</td>
              <td>{nameFor(options.sizes, entry.sizeId)}</td>
              <td>{nameFor(options.necks, entry.neckId)}</td>
              <td>{entry.quantity}</td>
              <td>
                <span
                  className={
                    entry.inStock && entry.quantity > 0
                      ? "in-stock"
                      : "out-of-stock"
                  }
                >
                  {entry.inStock && entry.quantity > 0
                    ? "In stock"
                    : "Out of stock"}
                </span>
              </td>
              <td>
                <button onClick={() => handleEdit(entry)}>Edit</button>
                <button className="danger" onClick={() => handleDelete(entry)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
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