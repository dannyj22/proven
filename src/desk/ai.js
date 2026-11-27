// The agent bridge to Firebase AI Logic.
//
// One short single-turn request per agent turn, with PREFER_ON_DEVICE: on a
// machine with Gemini Nano the answer stays local, otherwise the SDK routes it
// to the cloud. We never ask the student; we stamp what actually happened.

import {
  brainStream,
  InferenceMode,
  InferenceSource,
  isConfigured,
} from "../lib/firebase.js";

export const brainOf = (source) =>
  source === InferenceSource.ON_DEVICE
    ? "LOCAL"
    : source === InferenceSource.IN_CLOUD
      ? "CLOUD"
      : null;

// Returns { text, brain, error }. Never throws: the caller decides what to show
// if the model is unreachable.
export async function askAgent(prompt, onChunk) {
  if (!isConfigured) {
    return { text: null, brain: "OFFLINE", error: "Firebase is not configured." };
  }

  try {
    const result = await brainStream(
      prompt,
      InferenceMode.PREFER_ON_DEVICE,
      (text, source) => {
        if (onChunk) onChunk(text, brainOf(source));
      }
    );
    return {
      text: (result.text || "").trim(),
      brain: brainOf(result.source),
      error: null,
    };
  } catch (err) {
    console.error("AI Logic error:", err);
    return {
      text: null,
      brain: "OFFLINE",
      error: err?.message || err?.code || "unknown error",
    };
  }
}
