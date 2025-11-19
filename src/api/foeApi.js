// src/api/foeApi.js
const API_BASE = import.meta.env.VITE_FOE_API_BASE;

async function handleJsonResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Fetch list of snapshots
 * Expected response: [{ id, label, captured_at }, ...]
 */
export async function fetchSnapshots() {
  const res = await fetch(`${API_BASE}/snapshots`);
  return handleJsonResponse(res);
}

/**
 * Fetch player rows for a given snapshot
 * Expected response: array of:
 *   { player_id, player_name, guild_id, guild_name, era_nr, points, battles }
 */
export async function fetchPlayersBySnapshot(snapshotId) {
  const res = await fetch(`${API_BASE}/snapshots/${snapshotId}/players`);
  return handleJsonResponse(res);
}
