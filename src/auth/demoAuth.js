/** Client-only demo credentials (prototype — not for production). */
export const DEMO_ADMIN_EMAIL = "admin@agrimonitor.app";
export const DEMO_ADMIN_PASSWORD = "agrimonitor@2026";

const STORAGE_KEY = "agrimonitor_demo_session_v1";

export function readStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.v !== 1 || data?.email !== DEMO_ADMIN_EMAIL) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}

export function writeSession() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: 1, email: DEMO_ADMIN_EMAIL, at: Date.now() }),
  );
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function credentialsMatch(email, password) {
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  return e === DEMO_ADMIN_EMAIL.toLowerCase() && p === DEMO_ADMIN_PASSWORD;
}
