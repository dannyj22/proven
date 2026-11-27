# Firebase AI Logic — setup walkthrough

The app runs without any keys: the deterministic code checks and the whole
Learn/Portfolio track work locally, and the language agents show a short,
honest offline fallback line. This guide wires the **Mentor**, **Reader** and
**Reviewer** onto real Firebase AI Logic so inference runs on-device (Gemini
Nano) when available and in the cloud otherwise — with each message stamped
`LOCAL` or `CLOUD` from the source that actually answered.

You'll need a Google account. No credit card, no billing — text inference is
free on the free tier.

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> and sign in.
2. Click **Add project**.
3. Name it (e.g. `practicum`).
4. **Google Analytics**: leave it **off** — you don't need it.
5. Click **Create project**, wait a few seconds, then **Continue**.

## 2. Register a Web app and grab the config

1. On the project overview, click the **Web** icon (`</>`).
2. Give it a nickname (e.g. `practicum`). You can skip "set up Firebase
   Hosting" for now.
3. Click **Register app**.
4. Copy the `firebaseConfig` object it shows (the `apiKey`, `projectId`,
   `appId`, and friends).
5. In this project, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
6. Paste your values into `.env`. Leave `VITE_FIREBASE_APPCHECK_DEBUG=1`.
   (`.env` is already gitignored — it will never be committed.)

## 3. Turn on AI Logic

1. In the left sidebar, open **AI Services** → **AI Logic**.
2. Click **Get started** and follow the guided workflow.
3. When asked for a **Gemini API provider**, choose **Gemini Developer API**
   (free, no billing required).
4. Finish the workflow. It enables the needed APIs and enforces **App Check**
   for AI Logic automatically.

## 4. Register the App Check debug token (local development)

1. Make sure `.env` has `VITE_FIREBASE_APPCHECK_DEBUG=1`.
2. Run the app:
   ```bash
   npm run dev
   ```
3. Open it in Chrome, then open **DevTools → Console**. You'll see a line like:
   ```
   AppCheck debug token: "123a4567-…"
   ```
4. In the Firebase console, go to **Security** → **App Check** → **Apps** tab.
5. Find your web app, open its overflow menu (⋮), choose **Manage debug
   tokens**, and add the token from the console.

   > Never commit a debug token. The token lives only in the Firebase console;
   > the repo only stores the `VITE_FIREBASE_APPCHECK_DEBUG=1` flag.

## 5. Run it

```bash
npm run dev
```

- **Cloud inference** works anywhere (needs internet).
- **On-device inference** needs **Chrome 139+** on Desktop. Enable the model
  flag and restart:
  `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
  The Nano model downloads in the background on first use. On a machine without
  Nano, `PREFER_ON_DEVICE` automatically falls back to the cloud.

## How it's wired

- `src/lib/firebase.js` — lazy Firebase + App Check + AI Logic init, and
  `brainText(prompt, mode)` / `brainStream(prompt, mode, onChunk)` which return
  the text **and** the real inference source (`on_device` / `in_cloud`).
- `src/desk/ai.js` — `askAgent(prompt, onChunk)` sends one short, single-turn
  request through `InferenceMode.PREFER_ON_DEVICE` and reports `LOCAL` /
  `CLOUD` / `OFFLINE`. It never throws.
- `src/App.jsx` — `sayAI` stamps each agent message with a `LOCAL` / `CLOUD`
  badge and logs it in **Memory → "Where it runs"**, the receipt. The
  deterministic checks (`src/desk/data.js`) never call the model — your code is
  graded on the device.
