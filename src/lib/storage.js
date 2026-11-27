// Local persistence — the desk's memory lives on this device, not on a server.
const KEY = "proven.desk.v1";

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || state.v !== 1) return null;
    return state;
  } catch {
    return null;
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked — the app still works for this session
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
    // remove the older keys so a stale build can't resurrect them
    localStorage.removeItem("practicum.desk.v1");
    localStorage.removeItem("practicum.v1");
  } catch {
    // nothing to clear
  }
}
