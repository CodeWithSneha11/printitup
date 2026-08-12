import React, { useEffect, useState } from "react";
import {
  useProductOptions,
  saveProductOptions,
  DEFAULT_OPTIONS,
} from "../../hooks/useProductOptions";
import "../../styles/AdminProductOptions.css";

const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const AdminProductOptions = () => {
  const { options, loaded } = useProductOptions();
  const [draft, setDraft] = useState(DEFAULT_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // "success" | "error"

  const [newColor, setNewColor] = useState({ name: "", code: "#ffffff" });
  const [newNeck, setNewNeck] = useState("");
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    if (loaded) setDraft(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const flash = (text, type = "success", timeout = 2500) => {
    setMessage(text);
    setMessageType(type);
    if (timeout) setTimeout(() => setMessage(""), timeout);
  };

  const persist = async (next) => {
    setDraft(next);
    setSaving(true);
    setMessage("");
    try {
      await saveProductOptions(next);
      flash("Saved", "success");
    } catch (err) {
      console.error(err);
      flash("Failed to save: " + (err.message || "unknown error"), "error", 4000);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Colors ----------
  const addColor = () => {
    const name = newColor.name.trim();
    if (!name) return;
    const id = slugify(name);
    if (!id) {
      flash("That name doesn't contain any letters or numbers — try a different name.", "error", 4000);
      return;
    }
    if (draft.colors.some((c) => c.id === id)) {
      flash("A color with that name already exists.", "error");
      return;
    }
    persist({
      ...draft,
      colors: [...draft.colors, { id, name, code: newColor.code, active: true }],
    });
    setNewColor({ name: "", code: "#ffffff" });
  };

  const toggleColorActive = (id) =>
    persist({
      ...draft,
      colors: draft.colors.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c,
      ),
    });

  const updateColorCode = (id, code) =>
    setDraft((d) => ({
      ...d,
      colors: d.colors.map((c) => (c.id === id ? { ...c, code } : c)),
    }));

  const commitColorCode = () => persist(draft);

  const deleteColor = (id) => {
    if (
      !window.confirm(
        "Delete this color permanently? It will no longer be selectable on the Customize page.",
      )
    )
      return;
    persist({ ...draft, colors: draft.colors.filter((c) => c.id !== id) });
  };

  // ---------- Neck styles ----------
  const addNeck = () => {
    const label = newNeck.trim();
    if (!label) return;
    const id = slugify(label);
    if (!id) {
      flash("That name doesn't contain any letters or numbers — try a different name.", "error", 4000);
      return;
    }
    if (draft.necks.some((n) => n.id === id)) {
      flash("That neck style already exists.", "error");
      return;
    }
    persist({ ...draft, necks: [...draft.necks, { id, label, active: true }] });
    setNewNeck("");
  };

  const toggleNeckActive = (id) =>
    persist({
      ...draft,
      necks: draft.necks.map((n) =>
        n.id === id ? { ...n, active: !n.active } : n,
      ),
    });

  const deleteNeck = (id) => {
    if (!window.confirm("Delete this neck style permanently?")) return;
    persist({ ...draft, necks: draft.necks.filter((n) => n.id !== id) });
  };

  // ---------- Sizes ----------
  const addSize = () => {
    const label = newSize.trim().toUpperCase();
    if (!label) return;
    if (draft.sizes.some((s) => s.id === label)) {
      flash("That size already exists.", "error");
      return;
    }
    persist({ ...draft, sizes: [...draft.sizes, { id: label, label, active: true }] });
    setNewSize("");
  };

  const toggleSizeActive = (id) =>
    persist({
      ...draft,
      sizes: draft.sizes.map((s) =>
        s.id === id ? { ...s, active: !s.active } : s,
      ),
    });

  const deleteSize = (id) => {
    if (!window.confirm("Delete this size permanently?")) return;
    persist({ ...draft, sizes: draft.sizes.filter((s) => s.id !== id) });
  };

  const onEnter = (fn) => (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  if (!loaded) {
    return (
      <div className="admin-options-page">
        <div className="admin-options-loading">Loading product options…</div>
      </div>
    );
  }

  return (
    <div className="admin-options-page">
      <h2>Product Options</h2>
      <p className="admin-options-subtitle">
        Manage the colors, neck styles and sizes customers can choose on the
        Customize page. Deactivating hides an option from customers without
        deleting it.
      </p>

      {message && (
        <p className={`admin-options-message ${messageType === "error" ? "is-error" : ""}`}>
          {message}
        </p>
      )}

      {/* COLORS */}
      <section className="admin-options-section">
        <div className="admin-options-section-head">
          <h3>T-Shirt Colors</h3>
          <span className="admin-options-count">{draft.colors.length}</span>
        </div>

        {draft.colors.length === 0 ? (
          <p className="admin-options-empty">No colors yet — add one below.</p>
        ) : (
          <div className="admin-options-list">
            {draft.colors.map((c) => (
              <div
                key={c.id}
                className={`admin-option-row ${c.active ? "" : "inactive"}`}
              >
                <input
                  type="color"
                  value={c.code}
                  aria-label={`Color swatch for ${c.name}`}
                  onChange={(e) => updateColorCode(c.id, e.target.value)}
                  onBlur={commitColorCode}
                />
                <span className="admin-option-name">{c.name}</span>
                <span className={`admin-status-pill ${c.active ? "active" : "inactive"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => toggleColorActive(c.id)}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={saving}
                  onClick={() => deleteColor(c.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Color name (e.g. Maroon)"
            aria-label="New color name"
            value={newColor.name}
            onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={onEnter(addColor)}
          />
          <input
            type="color"
            aria-label="New color swatch"
            value={newColor.code}
            onChange={(e) => setNewColor((p) => ({ ...p, code: e.target.value }))}
          />
          <button type="button" disabled={saving || !newColor.name.trim()} onClick={addColor}>
            + Add Color
          </button>
        </div>
      </section>

      {/* NECK STYLES */}
      <section className="admin-options-section">
        <div className="admin-options-section-head">
          <h3>Neck Styles</h3>
          <span className="admin-options-count">{draft.necks.length}</span>
        </div>

        {draft.necks.length === 0 ? (
          <p className="admin-options-empty">No neck styles yet — add one below.</p>
        ) : (
          <div className="admin-options-list">
            {draft.necks.map((n) => (
              <div
                key={n.id}
                className={`admin-option-row ${n.active ? "" : "inactive"}`}
              >
                <span className="admin-option-name">{n.label}</span>
                <span className={`admin-status-pill ${n.active ? "active" : "inactive"}`}>
                  {n.active ? "Active" : "Inactive"}
                </span>
                <button type="button" disabled={saving} onClick={() => toggleNeckActive(n.id)}>
                  {n.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={saving}
                  onClick={() => deleteNeck(n.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Neck style (e.g. Polo)"
            aria-label="New neck style"
            value={newNeck}
            onChange={(e) => setNewNeck(e.target.value)}
            onKeyDown={onEnter(addNeck)}
          />
          <button type="button" disabled={saving || !newNeck.trim()} onClick={addNeck}>
            + Add Neck Style
          </button>
        </div>
      </section>

      {/* SIZES */}
      <section className="admin-options-section">
        <div className="admin-options-section-head">
          <h3>Sizes</h3>
          <span className="admin-options-count">{draft.sizes.length}</span>
        </div>

        {draft.sizes.length === 0 ? (
          <p className="admin-options-empty">No sizes yet — add one below.</p>
        ) : (
          <div className="admin-options-list">
            {draft.sizes.map((s) => (
              <div
                key={s.id}
                className={`admin-option-row ${s.active ? "" : "inactive"}`}
              >
                <span className="admin-option-name">{s.label}</span>
                <span className={`admin-status-pill ${s.active ? "active" : "inactive"}`}>
                  {s.active ? "Active" : "Inactive"}
                </span>
                <button type="button" disabled={saving} onClick={() => toggleSizeActive(s.id)}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={saving}
                  onClick={() => deleteSize(s.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Size (e.g. 3XL)"
            aria-label="New size"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={onEnter(addSize)}
          />
          <button type="button" disabled={saving || !newSize.trim()} onClick={addSize}>
            + Add Size
          </button>
        </div>
      </section>
    </div>
  );
};

export default AdminProductOptions;