import React, { useRef, useState, useCallback } from "react";
import "../styles/NeckShapeEditor.css";

const MIN_POINTS = 3;

// Controlled polygon editor: `points` is the source of truth (owned
// by the parent), `onChange` fires continuously while dragging (for
// live preview), `onCommit` fires once when a drag/add/remove action
// finishes (the parent's cue to persist).
export default function NeckShapeEditor({ points, onChange, onCommit, size = 220 }) {
  const svgRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);

  const toPercent = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  }, []);

  const handlePointerDown = (index) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    setDraggingIndex(index);
  };

  const handlePointerMove = (e) => {
    if (draggingIndex === null) return;
    const { x, y } = toPercent(e.clientX, e.clientY);
    onChange(points.map((p, i) => (i === draggingIndex ? { x, y } : p)));
  };

  const handlePointerUp = () => {
    if (draggingIndex !== null) {
      setDraggingIndex(null);
      onCommit?.();
    }
  };

  // Inserts a new point at the midpoint of the longest edge — usually
  // the most useful place to add detail (e.g. splitting the top edge
  // to carve a deeper notch).
  const addPoint = () => {
    let longest = -1;
    let insertAt = points.length;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > longest) {
        longest = dist;
        insertAt = i + 1;
      }
    }
    const a = points[insertAt - 1];
    const b = points[insertAt % points.length];
    const mid = {
      x: Math.round(((a.x + b.x) / 2) * 10) / 10,
      y: Math.round(((a.y + b.y) / 2) * 10) / 10,
    };
    onChange([...points.slice(0, insertAt), mid, ...points.slice(insertAt)]);
    onCommit?.();
  };

  const removePoint = (index) => {
    if (points.length <= MIN_POINTS) return;
    onChange(points.filter((_, i) => i !== index));
    onCommit?.();
  };

  const polyStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="neck-shape-editor">
      <svg
        ref={svgRef}
        className="neck-shape-editor-svg"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <rect x="0" y="0" width="100" height="100" className="neck-shape-editor-bg" />
        <polygon points={polyStr} className="neck-shape-editor-shape" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2.5}
            className="neck-shape-editor-handle"
            onPointerDown={handlePointerDown(i)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              removePoint(i);
            }}
          />
        ))}
      </svg>
      <div className="neck-shape-editor-actions">
        <button type="button" onClick={addPoint}>
          + Add point
        </button>
        <span className="neck-shape-editor-hint">
          Drag points to reshape. Double-click a point to delete it (min {MIN_POINTS}).
        </span>
      </div>
    </div>
  );
}