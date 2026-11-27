# Practice Desk frontend

Plain HTML, CSS and JavaScript. No build step.

- `config.js`: app name, API address, token and agent names
- `client.js`: every backend call
- `app.js`: screens and interactions
- `API.md`: the contract your backend should follow

## Run

    python3 -m http.server 5173

Open http://localhost:5173. Serve the API at the same address under `/api`,
or set `apiBase` and allow this origin (with credentials) in your backend's CORS settings.
Until the API is connected, the landing page works and app screens show a connection error.

## Before launch

Choose the final name, add privacy and terms pages, add sign-in, and confirm that every
claim on the landing page is true of your finished backend.
