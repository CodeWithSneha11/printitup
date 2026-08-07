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

  const [newColor, setNewColor] = useState({ name: "", code: "#ffffff" });
  const [newNeck, setNewNeck] = useState("");
  const [newSize, setNewSize] = useState("");

  useEffect(() => {
    if (loaded) setDraft(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const persist = async (next) => {
    setDraft(next);
    setSaving(true);
    setMessage("");
    try {
      await saveProductOptions(next);
      setMessage("✅ Saved");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to save: " + (err.message || "unknown error"));
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 2500);
    }
  };

  // ---------- Colors ----------
  const addColor = () => {
    if (!newColor.name.trim()) return;
    const id = slugify(newColor.name);
    if (draft.colors.some((c) => c.id === id)) {
      setMessage("❌ A color with that name already exists.");
      return;
    }
    persist({
      ...draft,
      colors: [
        ...draft.colors,
        { id, name: newColor.name.trim(), code: newColor.code, active: true },
      ],
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
    if (!newNeck.trim()) return;
    const id = slugify(newNeck);
    if (draft.necks.some((n) => n.id === id)) {
      setMessage("❌ That neck style already exists.");
      return;
    }
    persist({
      ...draft,
      necks: [...draft.necks, { id, label: newNeck.trim(), active: true }],
    });
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
      setMessage("❌ That size already exists.");
      return;
    }
    persist({
      ...draft,
      sizes: [...draft.sizes, { id: label, label, active: true }],
    });
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

  if (!loaded) return <div className="admin-options-page">Loading...</div>;

  return (
    <div className="admin-options-page">
      <h2>Product Options</h2>
      <p className="admin-options-subtitle">
        Manage the colors, neck styles and sizes customers can choose on the
        Customize page. Deactivating hides an option from customers without
        deleting it.
      </p>
      {message && <p className="admin-options-message">{message}</p>}
      {saving && <p className="admin-options-saving">Saving…</p>}

      {/* COLORS */}
      <section className="admin-options-section">
        <h3>T-Shirt Colors</h3>
        <div className="admin-options-list">
          {draft.colors.map((c) => (
            <div
              key={c.id}
              className={`admin-option-row ${c.active ? "" : "inactive"}`}
            >
              <input
                type="color"
                value={c.code}
                onChange={(e) => updateColorCode(c.id, e.target.value)}
                onBlur={commitColorCode}
              />
              <span className="admin-option-name">{c.name}</span>
              <button onClick={() => toggleColorActive(c.id)}>
                {c.active ? "Deactivate" : "Activate"}
              </button>
              <button className="danger" onClick={() => deleteColor(c.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Color name (e.g. Maroon)"
            value={newColor.name}
            onChange={(e) =>
              setNewColor((p) => ({ ...p, name: e.target.value }))
            }
          />
          <input
            type="color"
            value={newColor.code}
            onChange={(e) =>
              setNewColor((p) => ({ ...p, code: e.target.value }))
            }
          />
          <button onClick={addColor}>+ Add Color</button>
        </div>
      </section>

      {/* NECK STYLES */}
      <section className="admin-options-section">
        <h3>Neck Styles</h3>
        <div className="admin-options-list">
          {draft.necks.map((n) => (
            <div
              key={n.id}
              className={`admin-option-row ${n.active ? "" : "inactive"}`}
            >
              <span className="admin-option-name">{n.label}</span>
              <button onClick={() => toggleNeckActive(n.id)}>
                {n.active ? "Deactivate" : "Activate"}
              </button>
              <button className="danger" onClick={() => deleteNeck(n.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Neck style (e.g. Polo)"
            value={newNeck}
            onChange={(e) => setNewNeck(e.target.value)}
          />
          <button onClick={addNeck}>+ Add Neck Style</button>
        </div>
      </section>

      {/* SIZES */}
      <section className="admin-options-section">
        <h3>Sizes</h3>
        <div className="admin-options-list">
          {draft.sizes.map((s) => (
            <div
              key={s.id}
              className={`admin-option-row ${s.active ? "" : "inactive"}`}
            >
              <span className="admin-option-name">{s.label}</span>
              <button onClick={() => toggleSizeActive(s.id)}>
                {s.active ? "Deactivate" : "Activate"}
              </button>
              <button className="danger" onClick={() => deleteSize(s.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <div className="admin-option-add">
          <input
            type="text"
            placeholder="Size (e.g. 3XL)"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
          />
          <button onClick={addSize}>+ Add Size</button>
        </div>
      </section>
    </div>
  );
};

export default AdminProductOptions;