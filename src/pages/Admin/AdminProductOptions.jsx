import React, { useEffect, useState } from "react";
import {
  useProductOptions,
  saveProductOptions,
  DEFAULT_OPTIONS,
} from "../../hooks/useProductOptions";
import {
  NECK_SHAPES,
  NECK_SHAPE_KEYS,
  DEFAULT_CUSTOM_POINTS,
  parseClipPathToPoints,
  resolveNeckClipPath,
} from "../../constants/neckShapes";
import NeckShapeEditor from "../../components/NeckShapeEditor";
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
  const [newNeck, setNewNeck] = useState({
    label: "",
    shape: NECK_SHAPE_KEYS[0],
    points: DEFAULT_CUSTOM_POINTS,
  });
  const [newSize, setNewSize] = useState("");

  // Which existing neck row currently has its point-editor open. Only
  // one at a time — keeps the list from turning into a wall of SVGs.
  const [editingNeckId, setEditingNeckId] = useState(null);

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
    const label = newNeck.label.trim();
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
    const entry = { id, label, shape: newNeck.shape, active: true };
    if (newNeck.shape === "custom") entry.points = newNeck.points;
    persist({ ...draft, necks: [...draft.necks, entry] });
    setNewNeck({ label: "", shape: NECK_SHAPE_KEYS[0], points: DEFAULT_CUSTOM_POINTS });
  };

  const toggleNeckActive = (id) =>
    persist({
      ...draft,
      necks: draft.necks.map((n) =>
        n.id === id ? { ...n, active: !n.active } : n,
      ),
    });

  // Switches an existing neck to a different shape. Moving TO
  // "custom" seeds the point set from whatever shape it currently
  // resolves to (so the admin edits a familiar starting outline
  // instead of a blank slate). Moving AWAY from "custom" drops the
  // now-irrelevant `points` field.
  const updateNeckShape = (id, shape) => {
    const necks = draft.necks.map((n) => {
      if (n.id !== id) return n;
      if (shape === "custom") {
        const seed =
          Array.isArray(n.points) && n.points.length >= 3
            ? n.points
            : parseClipPathToPoints(resolveNeckClipPath(n)) || DEFAULT_CUSTOM_POINTS;
        return { ...n, shape: "custom", points: seed };
      }
      const { points, ...rest } = n;
      return { ...rest, shape };
    });
    persist({ ...draft, necks });
    if (shape === "custom") setEditingNeckId(id);
  };

  // Live point updates while dragging — local only, no Firestore
  // write per pixel. commitNeckPoints() below saves once the drag
  // ends, mirroring the color-swatch edit/commit pattern.
  const updateNeckPointsLive = (id, points) =>
    setDraft((d) => ({
      ...d,
      necks: d.necks.map((n) => (n.id === id ? { ...n, points } : n)),
    }));

  const commitNeckPoints = () => persist(draft);

  const deleteNeck = (id) => {
    if (!window.confirm("Delete this neck style permanently?")) return;
    if (editingNeckId === id) setEditingNeckId(null);
    persist({ ...draft, necks: draft.necks.filter((n) => n.id !== id) });
  };

  // ---------- New-neck draft shape handling ----------
  const handleNewNeckShapeChange = (shape) => {
    setNewNeck((p) => {
      if (shape === "custom") {
        const seed =
          p.points && p.points.length >= 3
            ? p.points
            : parseClipPathToPoints(NECK_SHAPES[p.shape]?.clipPath) || DEFAULT_CUSTOM_POINTS;
        return { ...p, shape: "custom", points: seed };
      }
      return { ...p, shape };
    });
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
              <div key={n.id} className="admin-neck-row-wrap">
                <div className={`admin-option-row ${n.active ? "" : "inactive"}`}>
                  {/* Live shape swatch — resolveNeckClipPath() means this
                      renders custom polygons exactly the same way the
                      Customize page will. */}
                  <div
                    className="admin-neck-shape-swatch"
                    style={{ clipPath: resolveNeckClipPath(n) }}
                    title={n.shape === "custom" ? "Custom shape" : NECK_SHAPES[n.shape]?.label || "Unknown shape"}
                  />
                  <span className="admin-option-name">{n.label}</span>

                  <select
                    className="admin-neck-shape-select"
                    value={n.shape || "round"}
                    disabled={saving}
                    onChange={(e) => updateNeckShape(n.id, e.target.value)}
                    aria-label={`Cutout shape for ${n.label}`}
                  >
                    {NECK_SHAPE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {NECK_SHAPES[key].label}
                      </option>
                    ))}
                    <option value="custom">Custom shape…</option>
                  </select>

                  {n.shape === "custom" && (
                    <button
                      type="button"
                      className="admin-neck-edit-toggle"
                      onClick={() =>
                        setEditingNeckId((cur) => (cur === n.id ? null : n.id))
                      }
                    >
                      {editingNeckId === n.id ? "Close editor" : "Edit points"}
                    </button>
                  )}

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

                {n.shape === "custom" && editingNeckId === n.id && (
                  <NeckShapeEditor
                    points={n.points && n.points.length >= 3 ? n.points : DEFAULT_CUSTOM_POINTS}
                    onChange={(points) => updateNeckPointsLive(n.id, points)}
                    onCommit={commitNeckPoints}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="admin-option-add admin-option-add-neck">
          <div className="admin-option-add-row">
            <input
              type="text"
              placeholder="Neck style (e.g. Henley)"
              aria-label="New neck style"
              value={newNeck.label}
              onChange={(e) => setNewNeck((p) => ({ ...p, label: e.target.value }))}
              onKeyDown={onEnter(addNeck)}
            />

            <select
              aria-label="New neck style cutout shape"
              value={newNeck.shape}
              onChange={(e) => handleNewNeckShapeChange(e.target.value)}
            >
              {NECK_SHAPE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {NECK_SHAPES[key].label}
                </option>
              ))}
              <option value="custom">Custom shape…</option>
            </select>

            {/* Live preview of the shape about to be added */}
            <div
              className="admin-neck-shape-swatch admin-neck-shape-swatch-new"
              style={{ clipPath: resolveNeckClipPath(newNeck) }}
              title={newNeck.shape === "custom" ? "Custom shape" : NECK_SHAPES[newNeck.shape].label}
            />

            <button type="button" disabled={saving || !newNeck.label.trim()} onClick={addNeck}>
              + Add Neck Style
            </button>
          </div>

          {newNeck.shape === "custom" && (
            <NeckShapeEditor
              points={newNeck.points}
              onChange={(points) => setNewNeck((p) => ({ ...p, points }))}
              // Nothing's saved yet for a not-yet-added style, so no
              // onCommit needed — "+ Add Neck Style" is the save.
            />
          )}
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