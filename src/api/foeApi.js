// src/api/foeApi.js
const API_BASE = import.meta.env.VITE_FOE_API_BASE;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function handleJsonResponse(res) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = 3,
    baseDelayMs = 700,
    retryStatuses = [429, 503],
  } = retryOptions;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, options);

      if (retryStatuses.includes(res.status)) {
        const retryAfterHeader = res.headers.get("Retry-After");
        const retryAfterMs = Number.isFinite(Number(retryAfterHeader))
          ? Number(retryAfterHeader) * 1000
          : baseDelayMs * Math.pow(2, attempt);

        if (attempt === retries) {
          const text = await res.text();
          const err = new Error(
            `HTTP ${res.status}: ${text || res.statusText || "Too Many Requests"}`
          );
          err.status = res.status;
          err.retryAfterMs = retryAfterMs;
          throw err;
        }

        await wait(retryAfterMs);
        attempt += 1;
        continue;
      }

      return handleJsonResponse(res);
    } catch (err) {
      const isNetworkError =
        err?.name === "TypeError" ||
        err?.message?.includes("NetworkError") ||
        err?.message?.includes("Failed to fetch");

      if (
        attempt === retries ||
        (!isNetworkError && !retryStatuses.includes(err?.status))
      ) {
        throw err;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      attempt += 1;
      await wait(delayMs);
    }
  }

  throw new Error("fetchWithRetry exhausted attempts without success.");
}

/**
 * Fetch list of snapshots
 * Expected response: [{ id, label, captured_at }, ...]
 */
export async function fetchSnapshots() {
  return fetchWithRetry(`${API_BASE}/snapshots`);
}

/**
 * Fetch player rows for a given snapshot
 * Expected response: array of:
 *   { player_id, player_name, guild_id, guild_name, era_nr, points, battles }
 */
export async function fetchPlayersBySnapshot(snapshotId) {
  const data = await fetchWithRetry(
    `${API_BASE}/snapshots/${snapshotId}/players`
  );

  // Normalize possible response shapes
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.players)) return data.players;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/**
 * Update recruitment info for a player.
 * Backend needs to accept PUT/PATCH body:
 *   { recruitment_status, recruitment_note, recruitment_last_contacted_at }
 */
export async function updateRecruitmentStatus(playerId, payload) {
  const res = await fetch(`${API_BASE}/players/${playerId}/recruitment`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse(res);
}
