import React, { useEffect, useState, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import tshirtModel from "../assets/models/tshirt.glb";
/* ------------------------------------------------------------------ */
export function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/* ------------------------------------------------------------------ */
function createDesignTexture({
  text,
  textColor,
  fontSize,
  imageEl,
  imagePosition,
  imageSize,
  textPosition,
  textSize,
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 1024, 1024);
  // Canvas represents the printable area
const DESIGN_WIDTH = 300;
const DESIGN_HEIGHT = 400;

const scaleX = 1024 / DESIGN_WIDTH;
const scaleY = 1024 / DESIGN_HEIGHT;
// Printable area (approximately 70% of shirt width)
const PRINT_WIDTH = DESIGN_WIDTH * 0.7;
//const PRINT_HEIGHT = DESIGN_HEIGHT * 0.7;

const PRINT_X = (DESIGN_WIDTH - PRINT_WIDTH) / 2;
//const PRINT_Y = (DESIGN_HEIGHT - PRINT_HEIGHT) / 2;
  if (imageEl && imagePosition && imageSize) {
  ctx.drawImage(
    imageEl,
    imagePosition.x * scaleX,
    imagePosition.y * scaleY,
    imageSize.width * scaleX,
    imageSize.height * scaleY
  );
}

 if (text && textPosition && textSize) {
  ctx.fillStyle = textColor || "#000000";
let drawFontSize = fontSize * 5;

if (textSize) {
  const maxWidth = textSize.width * scaleX * 0.9;

  while (drawFontSize > 10) {
    ctx.font = `bold ${drawFontSize}px Arial`;

    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }

    drawFontSize--;
  }
}

ctx.font = `bold ${drawFontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

 const maxWidth = PRINT_WIDTH * scaleX;

const words = text.split(" ");
const lines = [];
let currentLine = "";

for (const word of words) {
  const testLine = currentLine
    ? `${currentLine} ${word}`
    : word;

  if (ctx.measureText(testLine).width > maxWidth && currentLine) {
    lines.push(currentLine);
    currentLine = word;
  } else {
    currentLine = testLine;
  }
}

if (currentLine) {
  lines.push(currentLine);
}

const lineHeight = drawFontSize * 1.2;

const startY =
  (textPosition.y + textSize.height / 2) * scaleY -
  ((lines.length - 1) * lineHeight) / 2;

lines.forEach((line, index) => {
  ctx.fillText(
    line,
  (PRINT_X + PRINT_WIDTH / 2) * scaleX,
    startY + index * lineHeight
  );
});
}

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Casts a ray at the shirt from front/back and projects the design
   texture onto whatever it hits, using the model's ACTUAL bounding box
   (computed at runtime) to aim the ray — so this works regardless of
   the specific scale/position applied to the model, instead of relying
   on hardcoded coordinates that only match one particular transform.  */
function DesignDecal({ meshes, box, side, texture }) {
  const [decalGeo, setDecalGeo] = useState(null);

  useEffect(() => {
    if (!meshes || meshes.length === 0 || !texture || !box) {
      setDecalGeo(null);
      return;
    }

    meshes.forEach((m) => m.updateWorldMatrix(true, false));

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Aim at roughly chest height: a bit above vertical center, since the
    // lower half of the bounding box includes the hem/waist area.
   // Place decal slightly below the neckline (upper chest)
const targetY = box.max.y - size.y * 0.32;
    const targetX = center.x;

    // Start the ray well outside the model on the correct side, pointing
    // straight through it, at chest height.
    const margin = Math.max(size.x, size.y, size.z) * 2;
    const originZ = side === "front" ? box.max.z + margin : box.min.z - margin;
    const dirZ = side === "front" ? -1 : 1;

    const rayOrigin = new THREE.Vector3(targetX, targetY, originZ);
    const rayDir = new THREE.Vector3(0, 0, dirZ);

    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, rayDir);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length === 0) {
      console.warn(
        `[DesignDecal] No intersection for side="${side}". ` +
          `Ray origin was (${targetX.toFixed(2)}, ${targetY.toFixed(2)}, ${originZ.toFixed(2)}), ` +
          `model bounds: x[${box.min.x.toFixed(2)}, ${box.max.x.toFixed(2)}] ` +
          `y[${box.min.y.toFixed(2)}, ${box.max.y.toFixed(2)}] ` +
          `z[${box.min.z.toFixed(2)}, ${box.max.z.toFixed(2)}]`
      );
      setDecalGeo(null);
      return;
    }

    const hit = intersects[0];
    const position = hit.point.clone();
    const normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld)
      .normalize();

    const helper = new THREE.Object3D();
    helper.position.copy(position);
    helper.lookAt(position.clone().add(normal));
    const orientation = helper.rotation.clone();

    // Decal footprint scales with the model's own size instead of a fixed
    // guess, so it stays proportional regardless of model scale.
 // More realistic printable area
const decalWidth = size.x * 0.42;
const decalHeight = size.y * 0.32;
const decalDepth = 0.25;

const decalSize = new THREE.Vector3(
  decalWidth,
  decalHeight,
  decalDepth
);

    const geo = new DecalGeometry(hit.object, position, orientation, decalSize);
    setDecalGeo(geo);
  }, [meshes, box, side, texture]);

  if (!decalGeo) return null;

  return (
    <mesh geometry={decalGeo} renderOrder={2}>
      <meshStandardMaterial
        map={texture}
        transparent
        depthTest={true}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
function TshirtModel({ color, onReady }) {
  
const { scene } = useGLTF(tshirtModel);

  useEffect(() => {
    const meshes = [];

    scene.traverse((child) => {
      if (!child.isMesh) return;

      child.material = child.material.clone();
      child.material.color = new THREE.Color(color);
      child.material.needsUpdate = true;

      meshes.push(child);
    });

    // Wait a tick so <Center>'s auto-centering offset (applied on the
    // primitive below) is baked into matrixWorld before we measure the
    // bounding box — otherwise the box would reflect the pre-centered
    // position and the decal raycast would miss the model.
    requestAnimationFrame(() => {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3();
      meshes.forEach((m) => box.expandByObject(m));
      onReady(meshes, box);
    });
  }, [scene, color, onReady]);

  return (
    <Center>
      <primitive object={scene} scale={2} />
    </Center>
  );
}

/* ------------------------------------------------------------------ */
function TShirt3DPreview({
  color = "#ffffff",
  text = "",
  textColor = "#000000",
  fontSize = 18,
  imageUrl = "",
  side = "front",

  imagePosition,
  imageSize,

  textPosition,
  textSize,
}) {
  const [meshes, setMeshes] = useState([]);
  const [box, setBox] = useState(null);
  const [imageEl, setImageEl] = useState(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  const debouncedText = useDebouncedValue(text, 250);
  const debouncedFontSize = useDebouncedValue(fontSize, 150);

  useEffect(() => {
  if (!imageUrl) {
    setImageEl(null);
    return;
  }
  const img = new Image();
  if (!imageUrl.startsWith("blob:")) {
    img.crossOrigin = "anonymous";
  }
  img.onload = () => setImageEl(img);
  img.onerror = () => setImageEl(null);
  img.src = imageUrl;
}, [imageUrl]);

const texture = useMemo(() => {
  if (!debouncedText && !imageEl) return null;

  return createDesignTexture({
    text: debouncedText,
    textColor,
    fontSize: debouncedFontSize,
    imageEl,

    imagePosition,
    imageSize,

    textPosition,
    textSize,
  });
}, [
  debouncedText,
  textColor,
  debouncedFontSize,
  imageEl,

  imagePosition,
  imageSize,

  textPosition,
  textSize,
]);

  const handleReady = (m, b) => {
    setMeshes(m);
    setBox(b);
    setModelLoaded(true);
  };

  return (
    <div style={{ width: "100%", height: "500px", position: "relative" }}>
      {!modelLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "10px",
            background: "#f3f4f6",
            zIndex: 1,
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              border: "4px solid #d1d5db",
              borderTopColor: "#4b5563",
              borderRadius: "50%",
              animation: "tshirt-spin 0.8s linear infinite",
            }}
          />
          <span style={{ color: "#6b7280", fontSize: "14px" }}>
            Loading 3D preview...
          </span>
          <style>{`
            @keyframes tshirt-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 6.5], fov: 40 }}>
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <Suspense fallback={null}>
          <TshirtModel color={color} onReady={handleReady} />
        </Suspense>

        {meshes.length > 0 && box && texture && (
          <DesignDecal meshes={meshes} box={box} side={side} texture={texture} />
        )}

        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>
    </div>
  );
}

export default TShirt3DPreview;

useGLTF.preload(tshirtModel);