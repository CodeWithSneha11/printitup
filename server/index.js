/**
 * Standalone backend for PrintItUp.
 *
 * Holds the Gemini API key server-side and proxies text-to-image
 * requests to Google's gemini-2.5-flash-image model ("Nano Banana").
 * This is a plain Node/Express server rather than a Firebase Cloud
 * Function, specifically so it can run anywhere without requiring the
 * Firebase Blaze plan.
 *
 * IMPORTANT — read before deploying:
 * As of late 2025, Google set the free-tier image-generation quota to
 * 0 IPM. You must enable billing on the Google Cloud project behind
 * your Gemini API key for this to work at all. Once billing is
 * enabled, Tier 1 gives 10 images/minute with no minimum spend
 * requirement — you are not prepaying anything, but a card has to be
 * on file. If you want a route that needs no billing at all, use
 * Pollinations.ai directly from the client instead (no backend
 * required for that option).
 *
 * It still uses Firebase Admin to verify the caller is a logged-in
 * user (via their Firebase Auth ID token) and to store a lightweight
 * per-user cooldown in Firestore — both of these work fine on the
 * free Spark plan, since only Cloud Functions + Secret Manager
 * require Blaze, not Admin SDK usage from your own server.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// --- Firebase Admin setup -------------------------------------------------
// Uses a service account key downloaded from:
// Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// This is free on the Spark plan; it's just credentials for server-side access.
const serviceAccount = require(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json",
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// --- Config ----------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_PROMPT_LENGTH = 500;
const COOLDOWN_MS = 10 * 1000; // 10s between generations per user

if (!GEMINI_API_KEY) {
  console.error(
    "Missing GEMINI_API_KEY. Set it in server/.env before starting the server.",
  );
  process.exit(1);
}

// --- App ---------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
  }),
);

// Verifies the Firebase ID token sent by the frontend, so only signed-in
// users can trigger (billed) image generation.
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization header." });
  }

  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
};

app.post("/api/generate-image", requireAuth, async (req, res) => {
  const prompt = (req.body?.prompt || "").trim();

  if (!prompt) {
    return res.status(400).json({ error: "A prompt is required." });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Prompt must be under ${MAX_PROMPT_LENGTH} characters.` });
  }

  const uid = req.user.uid;
  const cooldownRef = db.collection("aiImageCooldowns").doc(uid);

  // Lightweight per-user cooldown so a runaway client can't rack up
  // charges quickly.
  const now = Date.now();
  const cooldownSnap = await cooldownRef.get();
  if (cooldownSnap.exists) {
    const lastRequestAt = cooldownSnap.data().lastRequestAt || 0;
    const elapsed = now - lastRequestAt;
    if (elapsed < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSeconds}s before generating another image.`,
      });
    }
  }
  await cooldownRef.set({ lastRequestAt: now }, { merge: true });

  let geminiResponse;
  try {
    geminiResponse = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
  } catch (err) {
    console.error("Gemini request failed:", err);
    return res
      .status(503)
      .json({ error: "Could not reach the image generation service. Please try again." });
  }

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    console.error("Gemini API error:", geminiResponse.status, errText);

    if (geminiResponse.status === 429) {
      return res.status(429).json({
        error:
          "Image generation quota reached. If billing isn't enabled on your Google Cloud project yet, that's why — Gemini's free tier for images is 0 without it.",
      });
    }
    if (geminiResponse.status === 400) {
      return res.status(400).json({
        error: "That prompt couldn't be used to generate an image. Try rephrasing it.",
      });
    }

    return res.status(502).json({ error: "Image generation failed." });
  }

  const data = await geminiResponse.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data);

  if (!imagePart) {
    console.error("Gemini response missing image data:", JSON.stringify(data));
    const textPart = parts.find((part) => part.text);
    return res.status(400).json({
      error: textPart?.text || "No image was returned. Try a different prompt.",
    });
  }

  res.json({
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`PrintItUp backend listening on port ${PORT}`);
});
