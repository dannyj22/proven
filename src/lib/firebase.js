// Firebase + AI Logic — wired lazily and safely.
//
// With no VITE_FIREBASE_* values in .env, everything here is inert: the app
// keeps running on its fixtures with no keys and no network calls. Fill in
// your Firebase web-app config (and set VITE_FIREBASE_APPCHECK_DEBUG=1 for
// local dev) and the coach starts routing real inference through AI Logic.

import { getApps, initializeApp } from "firebase/app";
import { initializeAppCheck, CustomProvider } from "firebase/app-check";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
} from "firebase/ai";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

export const isConfigured = Boolean(cfg.apiKey && cfg.projectId && cfg.appId);

let app = null;
let ai = null;

function initFirebase() {
  if (app) return app;
  if (!isConfigured) return null;
  app = getApps().length ? getApps()[0] : initializeApp(cfg);

  // Firebase AI Logic requires App Check. For local development we use the
  // debug provider: set VITE_FIREBASE_APPCHECK_DEBUG=1, reload, then register
  // the token printed in the browser console under App Check > Manage debug
  // tokens. Never commit a real debug token — only the env flag.
  if (import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === "1" && typeof self !== "undefined") {
    // Optional: pin a registered debug token so every dev browser sends the
    // same one. Without it the SDK generates a per-browser token.
    self.FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN || true;
  }
  try {
    initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: () => Promise.resolve({ token: "debug" }),
      }),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("App Check init skipped:", err);
  }
  return app;
}

function initAI() {
  const a = initFirebase();
  if (!a) return null;
  if (ai) return ai;
  ai = getAI(a, { backend: new GoogleAIBackend() });
  return ai;
}

// Returns a model for the given mode, or null when Firebase isn't configured.
export function getModel(mode = InferenceMode.PREFER_ON_DEVICE) {
  const svc = initAI();
  if (!svc) return null;
  return getGenerativeModel(svc, { mode });
}

// Generate text and report where the inference actually ran.
// Returns { text, source } where source is "on_device" | "in_cloud" | null.
export async function brainText(prompt, mode = InferenceMode.PREFER_ON_DEVICE) {
  const model = getModel(mode);
  if (!model) return { text: null, source: null };
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const source = result.response.inferenceSource || null;
  return { text, source };
}

// Stream text as the model writes it. onChunk gets the text so far plus the
// inference source as soon as the first chunk reveals it (on-device or cloud).
// Returns { text, source } when the stream finishes.
export async function brainStream(
  prompt,
  mode = InferenceMode.PREFER_ON_DEVICE,
  onChunk
) {
  const model = getModel(mode);
  if (!model) return { text: null, source: null };

  const result = await model.generateContentStream(prompt);
  let text = "";
  let source = null;

  for await (const chunk of result.stream) {
    if (!source && chunk.inferenceSource) source = chunk.inferenceSource;
    let piece = "";
    try {
      piece = chunk.text();
    } catch {
      // a chunk with no text part (e.g. blocked or metadata-only) — skip it
    }
    if (piece) {
      text += piece;
      if (onChunk) onChunk(text, source);
    }
  }

  const final = await result.response;
  if (!source) source = final.inferenceSource || null;
  const whole = text || final.text();
  return { text: whole, source };
}

export { InferenceMode, InferenceSource };
