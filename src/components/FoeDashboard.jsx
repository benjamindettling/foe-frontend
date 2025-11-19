// src/components/FoeDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchSnapshots, fetchPlayersBySnapshot } from "../api/foeApi";
import PlayerTable from "./PlayerTable";
import ComparisonSelector from "./ComparisonSelector";

const FoeDashboard = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [currentSnapshotId, setCurrentSnapshotId] = useState(null);

  // cache: snapshotId -> rows
  const [playerCache, setPlayerCache] = useState(new Map());

  const [comparisonDays, setComparisonDays] = useState(null); // integer or null
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // sort state for table
  const [sortConfig, setSortConfig] = useState({
    key: "points",
    direction: "desc",
  });

  // --- load snapshots on mount ---
  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        setError(null);
        const data = await fetchSnapshots();
        if (!data || data.length === 0) {
          setSnapshots([]);
          setCurrentSnapshotId(null);
          return;
        }

        // assume API returns newest first; if not, sort by captured_at descending:
        const sorted = [...data].sort(
          (a, b) => new Date(b.captured_at) - new Date(a.captured_at)
        );

        setSnapshots(sorted);
        setCurrentSnapshotId(sorted[0].id);
      } catch (err) {
        console.error(err);
        setError("Failed to load snapshots.");
      }
    };

    loadSnapshots();
  }, []);

  // --- whenever current snapshot changes, ensure its rows are loaded ---
  useEffect(() => {
    const loadPlayers = async () => {
      if (!currentSnapshotId) return;
      if (playerCache.has(currentSnapshotId)) return; // already loaded

      try {
        setIsLoading(true);
        setError(null);

        const rows = await fetchPlayersBySnapshot(currentSnapshotId);

        setPlayerCache((prev) => {
          const next = new Map(prev);
          next.set(currentSnapshotId, rows);
          return next;
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load player data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPlayers();
  }, [currentSnapshotId, playerCache]);

  const currentSnapshot = useMemo(
    () => snapshots.find((s) => s.id === currentSnapshotId) ?? null,
    [snapshots, currentSnapshotId]
  );

  // --- compute available comparison day options from snapshots ---
  const comparisonOptions = useMemo(() => {
    if (!currentSnapshot) return [];

    const baseDate = new Date(currentSnapshot.captured_at);
    const optionsSet = new Set();

    snapshots.forEach((s) => {
      const diffMs = baseDate - new Date(s.captured_at);
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        optionsSet.add(diffDays);
      }
    });

    return Array.from(optionsSet).sort((a, b) => a - b);
  }, [snapshots, currentSnapshot]);

  // --- find snapshot matching current comparisonDays ---
  const comparisonSnapshot = useMemo(() => {
    if (!currentSnapshot || comparisonDays == null) return null;

    const baseDate = new Date(currentSnapshot.captured_at);

    // pick snapshot whose day-diff equals comparisonDays
    return (
      snapshots.find((s) => {
        const diffMs = baseDate - new Date(s.captured_at);
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        return diffDays === comparisonDays;
      }) ?? null
    );
  }, [snapshots, currentSnapshot, comparisonDays]);

  // --- ensure comparison snapshot rows are loaded when needed ---
  useEffect(() => {
    const loadComparison = async () => {
      if (!comparisonSnapshot) return;
      if (playerCache.has(comparisonSnapshot.id)) return;

      try {
        setIsLoading(true);
        setError(null);
        const rows = await fetchPlayersBySnapshot(comparisonSnapshot.id);
        setPlayerCache((prev) => {
          const next = new Map(prev);
          next.set(comparisonSnapshot.id, rows);
          return next;
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load comparison data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadComparison();
  }, [comparisonSnapshot, playerCache]);

  const currentRows = useMemo(() => {
    if (!currentSnapshotId) return [];
    return playerCache.get(currentSnapshotId) ?? [];
  }, [playerCache, currentSnapshotId]);

  const comparisonRows = useMemo(() => {
    if (!comparisonSnapshot) return null;
    return playerCache.get(comparisonSnapshot.id) ?? null;
  }, [playerCache, comparisonSnapshot]);

  // --- compute battles_diff when comparison is selected ---
  const rowsWithDiff = useMemo(() => {
    if (!comparisonRows) {
      return currentRows.map((row) => ({
        ...row,
        battles_diff: null,
      }));
    }

    const prevByPlayer = new Map();
    comparisonRows.forEach((r) => {
      prevByPlayer.set(r.player_id, r.battles);
    });

    return currentRows.map((row) => {
      const prevBattles = prevByPlayer.get(row.player_id);
      let diff = null;

      if (typeof prevBattles === "number") {
        diff = row.battles - prevBattles;
      }

      return {
        ...row,
        battles_diff: diff,
      };
    });
  }, [currentRows, comparisonRows]);

  // --- sorted rows ---
  const sortedRows = useMemo(() => {
    const rows = [...rowsWithDiff];
    if (!sortConfig.key) return rows;

    return rows.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? 0;
      const bVal = b[sortConfig.key] ?? 0;

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [rowsWithDiff, sortConfig]);

  const handleSort = (column, direction) => {
    setSortConfig((prev) => {
      if (!direction) {
        const nextDirection =
          prev.key === column && prev.direction === "asc" ? "desc" : "asc";
        return { key: column, direction: nextDirection };
      }

      return { key: column, direction };
    });
  };

  return (
    <section id="foe-section">
      <div className="container foe-container">
        <div className="foe-header">
          <h1>Forge of Empires Player Stats</h1>
          <p>
            {currentSnapshot
              ? `Snapshot: ${new Date(
                  currentSnapshot.captured_at
                ).toLocaleString()}`
              : "Loading snapshot info..."}
          </p>
        </div>

        <div className="foe-controls">
          <div className="foe-controls__group">
            <label htmlFor="snapshot-select">Dataset:</label>
            <select
              id="snapshot-select"
              value={currentSnapshotId ?? ""}
              onChange={(e) =>
                setCurrentSnapshotId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.captured_at).toLocaleString()} ({s.label})
                </option>
              ))}
            </select>
          </div>

          <div className="foe-controls__group">
            <ComparisonSelector
              options={comparisonOptions}
              value={comparisonDays}
              onChange={setComparisonDays}
            />
          </div>
        </div>

        {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

        <div className="foe-table-wrapper">
          <PlayerTable
            rows={sortedRows}
            onSort={handleSort}
            sortConfig={sortConfig}
          />
        </div>

        {comparisonSnapshot && (
          <p
            style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#fff" }}
          >
            battles_diff = battles today − battles {comparisonDays} days ago.
          </p>
        )}
      </div>
    </section>
  );
};

export default FoeDashboard;
