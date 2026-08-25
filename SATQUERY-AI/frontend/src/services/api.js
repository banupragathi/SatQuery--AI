// services/api.js
// =================
// The single place the frontend talks to the FastAPI backend. Every network
// call lives here so components stay clean and there is one obvious file to
// change if the backend URL or shape ever changes.

// Base URL of the backend. During development the FastAPI server runs on
// http://localhost:8000. If you deploy later, change this one line (or wire
// it to an environment variable).
export const API_BASE = "http://localhost:8000";

/**
 * Check whether the backend is up. Used by the workspace status indicator.
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return { ok: false, error: `Server responded ${res.status}` };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: "Backend not reachable" };
  }
}

/**
 * Upload one image file to the backend for validation + storage.
 * @param {File} file - the image chosen/dropped by the user.
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 *   On success, data contains { image_id, filename, format, width, height, size_bytes }.
 */
export async function uploadImage(file) {
  try {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // FastAPI puts validation messages in `detail`.
      return { ok: false, error: data.detail || `Upload failed (${res.status})` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: "Could not reach the backend to upload." };
  }
}

/**
 * Ask the backend to analyse a previously-uploaded image.
 * @param {string} imageId - the image_id returned by uploadImage().
 * @param {string} query - the user's natural-language question.
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 *   On success, data is the structured analysis result (task, specialist,
 *   model, answer, message, routing_reason, execution_trace, ...).
 */
export async function analyzeImage(imageId, query) {
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: imageId, query }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.detail || `Analyse failed (${res.status})` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: "Could not reach the backend to analyse." };
  }
}
