// src/components/FoeDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchPlayersBySnapshot,
  fetchSnapshots,
  updateRecruitmentStatus,
} from "../api/foeApi";
import PlayerTable from "./PlayerTable";
import SettingsPanel from "./SettingsPanel";
import { FOE_PRESETS } from "../config/foePresets";

const DEFAULT_SORT = { key: "points", direction: "desc" };

const ERA_ORDER = [
  "IronAge",
  "EarlyMiddleAge",
  "HighMiddleAge",
  "LateMiddleAge",
  "ColonialAge",
  "IndustrialAge",
  "ProgressiveEra",
  "ModernEra",
  "PostModernEra",
  "ContemporaryEra",
  "TomorrowEra",
  "FutureEra",
  "ArcticFuture",
  "OceanicFuture",
  "VirtualFuture",
  "SpaceAgeMars",
  "SpaceAgeAsteroidBelt",
  "SpaceAgeVenus",
  "SpaceAgeJupiterMoon",
  "SpaceAgeTitan",
  "SpaceAgeSpaceHub",
];

const makeDefaultSettings = (snapshotId) => ({
  snapshotId: snapshotId ?? "",
  comparisonSnapshotId: "",
  minEra: "",
  minPoints: "",
  maxPoints: "",
  minBattles: "",
  maxBattles: "",
  minBattlesDiff: "",
  maxBattlesDiff: "",
  excludedGuilds: [],
  showInvitation: false,
  invitationCutoff: "",
  excludeContacted: false,
});

const normalizeSettings = (draft) => ({
  ...draft,
  excludedGuilds: Array.from(
    new Set((draft.excludedGuilds || []).filter(Boolean))
  ),
});

const parseNumber = (val) => {
  if (val === "" || val === null || val === undefined) return null;
  const raw = typeof val === "string" ? val.replace(/[',\s]/g, "").trim() : val;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const normalizeGuildName = (name) => {
  if (!name) return "";
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
};

const FoeDashboard = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [playerCache, setPlayerCache] = useState(new Map());
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState("all");
  const [settingsDraft, setSettingsDraft] = useState(null);
  const [loadingSnapshotIds, setLoadingSnapshotIds] = useState(new Set());
  const [error, setError] = useState(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // Initial snapshot load
  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        const data = await fetchSnapshots();
        const sorted = [...data].sort(
          (a, b) => new Date(b.captured_at) - new Date(a.captured_at)
        );
        setSnapshots(sorted);

        if (sorted.length && tabs.length === 0) {
          const baseSettings = makeDefaultSettings(sorted[0].id);
          setTabs([
            {
              id: "all",
              label: "All Players",
              type: "all",
              sortConfig: DEFAULT_SORT,
              settings: baseSettings,
            },
          ]);
          setActiveTabId("all");
          setSettingsDraft(baseSettings);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load snapshots.");
      }
    };

    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure required snapshot datasets are loaded
  useEffect(() => {
    const neededIds = new Set();
    tabs.forEach((tab) => {
      if (tab.settings?.snapshotId) {
        neededIds.add(Number(tab.settings.snapshotId));
      }
      if (tab.settings?.comparisonSnapshotId) {
        neededIds.add(Number(tab.settings.comparisonSnapshotId));
      }
    });

    neededIds.forEach((id) => {
      if (!Number.isFinite(id)) return;
      if (playerCache.has(id)) return;
      if (loadingSnapshotIds.has(id)) return;

      setLoadingSnapshotIds((prev) => new Set(prev).add(id));
      fetchPlayersBySnapshot(id)
        .then((rows) => {
          const normalized = Array.isArray(rows) ? rows : [];
          setPlayerCache((prev) => {
            const next = new Map(prev);
            next.set(id, normalized);
            return next;
          });
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load player data.");
        })
        .finally(() => {
          setLoadingSnapshotIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        });
    });
  }, [tabs, playerCache, loadingSnapshotIds]);

  // Explicitly load active snapshot rows if missing
  useEffect(() => {
    const id = Number(activeTab?.settings?.snapshotId);
    if (!Number.isFinite(id)) return;
    if (playerCache.has(id) || loadingSnapshotIds.has(id)) return;

    setLoadingSnapshotIds((prev) => new Set(prev).add(id));
    fetchPlayersBySnapshot(id)
      .then((rows) => {
        const normalized = Array.isArray(rows) ? rows : [];
        setPlayerCache((prev) => {
          const next = new Map(prev);
          next.set(id, normalized);
          return next;
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load player data.");
      })
      .finally(() => {
        setLoadingSnapshotIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
  }, [activeTab, playerCache, loadingSnapshotIds]);

  // Keep settings draft aligned with active tab
  useEffect(() => {
    if (activeTab?.settings) {
      setSettingsDraft(activeTab.settings);
    }
  }, [activeTab]);

  const activeSnapshot = useMemo(
    () =>
      snapshots.find(
        (s) => Number(s.id) === Number(activeTab?.settings?.snapshotId)
      ),
    [snapshots, activeTab]
  );

  const baseRows = useMemo(() => {
    const id = Number(activeTab?.settings?.snapshotId);
    if (!Number.isFinite(id)) return [];
    return playerCache.get(id) || [];
  }, [playerCache, activeTab]);

  const comparisonRows = useMemo(() => {
    const id = Number(activeTab?.settings?.comparisonSnapshotId);
    if (!Number.isFinite(id)) return null;
    return playerCache.get(id) || null;
  }, [playerCache, activeTab]);

  const comparisonOptions = useMemo(() => {
    if (!activeSnapshot) return [];
    const baseDate = new Date(activeSnapshot.captured_at);

    return snapshots
      .filter((s) => Number(s.id) !== Number(activeSnapshot.id))
      .map((s) => {
        const diffMs = baseDate - new Date(s.captured_at);
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const label =
          diffDays >= 0
            ? `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
            : `${Math.abs(diffDays)} day${
                Math.abs(diffDays) === 1 ? "" : "s"
              } ahead`;
        return { id: s.id, label, diffDays };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [snapshots, activeSnapshot]);

  const availableGuilds = useMemo(() => {
    const seen = new Map();
    baseRows.forEach((row) => {
      if (!row.guild_name) return;
      const key = normalizeGuildName(row.guild_name);
      if (!seen.has(key)) {
        seen.set(key, row.guild_name);
      }
    });
    return Array.from(seen.values()).sort();
  }, [baseRows]);

  const tabRows = useMemo(() => {
    if (!activeTab) return [];
    if (activeTab.type !== "guild") return baseRows;

    const targetGuildId = activeTab.guildId;
    const targetGuildName = activeTab.guildName;
    return baseRows.filter((row) => {
      if (targetGuildId != null && row.guild_id != null) {
        return row.guild_id === targetGuildId;
      }
      if (targetGuildName) {
        return row.guild_name === targetGuildName;
      }
      return false;
    });
  }, [activeTab, baseRows]);

  const filteredRows = useMemo(() => {
    if (!activeTab?.settings) return tabRows;
    const settings = activeTab.settings;

    const minEra = parseNumber(settings.minEra);
    const minPoints = parseNumber(settings.minPoints);
    const maxPoints = parseNumber(settings.maxPoints);
    const minBattles = parseNumber(settings.minBattles);
    const maxBattles = parseNumber(settings.maxBattles);

    const excludedSet = new Set(
      (settings.excludedGuilds || []).map((g) => normalizeGuildName(g))
    );
    const cutoffDate =
      settings.showInvitation && settings.invitationCutoff
        ? new Date(settings.invitationCutoff)
        : null;
    const excludeContacted = !!settings.excludeContacted;

    return tabRows.filter((row) => {
      if (minEra != null) {
        const eraNr = Number(row.era_nr);
        if (!Number.isFinite(eraNr) || eraNr < minEra) return false;
      }

      if (minPoints != null && !(row.points >= minPoints)) return false;
      if (maxPoints != null && !(row.points <= maxPoints)) return false;

      if (minBattles != null && !(row.battles >= minBattles)) return false;
      if (maxBattles != null && !(row.battles <= maxBattles)) return false;

      if (excludedSet.size) {
        const name = normalizeGuildName(row.guild_name || "");
        if (excludedSet.has(name)) return false;
      }

      if (excludeContacted && row.recruitment_last_contacted_at) {
        return false;
      }

      if (cutoffDate && cutoffDate.toString() !== "Invalid Date") {
        if (row.recruitment_last_contacted_at) {
          const contacted = new Date(row.recruitment_last_contacted_at);
          if (contacted.toString() !== "Invalid Date") {
            // Exclude if contacted after cutoff (i.e., too recent)
            if (contacted > cutoffDate) return false;
          }
        }
      }

      return true;
    });
  }, [activeTab, tabRows]);

  const rowsWithDiff = useMemo(() => {
    if (!comparisonRows) {
      return filteredRows.map((row) => ({ ...row, battles_diff: null }));
    }

    const comparisonMap = new Map();
    comparisonRows.forEach((r) => comparisonMap.set(r.player_id, r.battles));

    return filteredRows.map((row) => {
      const prev = comparisonMap.get(row.player_id);
      const diff =
        typeof prev === "number" ? Number(row.battles) - Number(prev) : null;
      return { ...row, battles_diff: diff };
    });
  }, [filteredRows, comparisonRows]);

  const fullyFilteredRows = useMemo(() => {
    if (!activeTab?.settings) return rowsWithDiff;
    const settings = activeTab.settings;
    const minDiff = parseNumber(settings.minBattlesDiff);
    const maxDiff = parseNumber(settings.maxBattlesDiff);

    return rowsWithDiff.filter((row) => {
      if (minDiff != null) {
        if (row.battles_diff == null || row.battles_diff < minDiff) {
          return false;
        }
      }
      if (maxDiff != null) {
        if (row.battles_diff == null || row.battles_diff > maxDiff) {
          return false;
        }
      }
      return true;
    });
  }, [rowsWithDiff, activeTab]);

  const sortedRows = useMemo(() => {
    if (!activeTab) return [];
    const { key, direction } = activeTab.sortConfig || DEFAULT_SORT;
    const dir = direction === "asc" ? 1 : -1;

    const mapInvitation = (row) => {
      const date = row.recruitment_last_contacted_at;
      if (!date) return Number.NEGATIVE_INFINITY; // never contacted comes first on asc
      const ts = new Date(date).getTime();
      return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
    };

    const rowsCopy = [...fullyFilteredRows];
    rowsCopy.sort((a, b) => {
      if (key === "recruitment_status") {
        const aVal = mapInvitation(a);
        const bVal = mapInvitation(b);
        if (aVal === bVal) return 0;
        return aVal < bVal ? -dir : dir;
      }

      const aVal = a[key];
      const bVal = b[key];

      if (typeof aVal === "number" && typeof bVal === "number") {
        if (aVal === bVal) return 0;
        return aVal < bVal ? -dir : dir;
      }

      const aStr = (aVal ?? "").toString().toLowerCase();
      const bStr = (bVal ?? "").toString().toLowerCase();
      if (aStr === bStr) return 0;
      return aStr < bStr ? -dir : dir;
    });

    return rowsCopy;
  }, [fullyFilteredRows, activeTab]);

  const [displayRows, setDisplayRows] = useState([]);

  // Progressive rendering: show first 20 rows instantly, then append in chunks
  useEffect(() => {
    if (!sortedRows || sortedRows.length === 0) {
      setDisplayRows([]);
      return;
    }

    const total = sortedRows.length;
    const initial = Math.min(20, total);
    const chunkSize = total > 2000 ? 500 : total > 200 ? 120 : 40;
    const delay = total > 2000 ? 35 : 75;

    let cancelled = false;
    let current = initial;

    setDisplayRows(sortedRows.slice(0, initial));

    const step = () => {
      if (cancelled || current >= total) return;
      current = Math.min(current + chunkSize, total);
      setDisplayRows(sortedRows.slice(0, current));
      if (current < total) {
        setTimeout(step, delay);
      }
    };

    if (initial < total) {
      setTimeout(step, delay);
    }

    return () => {
      cancelled = true;
    };
  }, [sortedRows, activeTabId]);

  const handleSort = (column, direction) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId
          ? {
              ...tab,
              sortConfig: { key: column, direction },
            }
          : tab
      )
    );
  };

  const handleGuildClick = (guildId, guildName) => {
    const existing = tabs.find(
      (t) => t.type === "guild" && t.guildId === guildId
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    const label = guildName || `Guild ${guildId ?? ""}`;
    const baseSettings = normalizeSettings(
      activeTab?.settings || makeDefaultSettings(snapshots[0]?.id)
    );
    baseSettings.excludedGuilds = [...baseSettings.excludedGuilds];

    const newTab = {
      id: `guild-${guildId ?? label}-${tabs.length + 1}`,
      type: "guild",
      guildId: guildId ?? null,
      guildName: label,
      label,
      sortConfig: DEFAULT_SORT,
      settings: baseSettings,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId) => {
    if (tabId === "all") return;
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    if (activeTabId === tabId) {
      setActiveTabId("all");
    }
  };

  const handleSettingsChange = (field, value) => {
    const base =
      settingsDraft ||
      activeTab?.settings ||
      makeDefaultSettings(activeTab?.settings?.snapshotId);
    const next = { ...base, [field]: value };
    const normalized = normalizeSettings(next);
    setSettingsDraft(normalized);
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, settings: normalized } : tab
      )
    );
  };

  const applySettingsToAll = () => {
    const sourceSettings =
      settingsDraft ||
      activeTab?.settings ||
      makeDefaultSettings(activeTab?.settings?.snapshotId);
    const normalized = normalizeSettings(sourceSettings);
    setTabs((prev) => prev.map((tab) => ({ ...tab, settings: normalized })));
    setSettingsDraft(normalized);
  };

  const handleRecruitmentUpdate = async (playerId, updates) => {
    const snapshotId = Number(activeTab?.settings?.snapshotId);
    if (!Number.isFinite(snapshotId)) return;

    const payload = {
      recruitment_status: updates.recruitment_status ?? "",
      recruitment_note: updates.recruitment_note ?? "",
      recruitment_last_contacted_at:
        updates.recruitment_last_contacted_at ?? "",
    };

    await updateRecruitmentStatus(playerId, payload);

    setPlayerCache((prev) => {
      const next = new Map(prev);
      const rows = next.get(snapshotId);
      if (rows && Array.isArray(rows)) {
        const updated = rows.map((r) =>
          r.player_id === playerId ? { ...r, ...updates } : r
        );
        next.set(snapshotId, updated);
      }
      return next;
    });
  };

  const handleApplyPreset = (presetId) => {
    if (!activeTab) return;

    const preset = FOE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    // Make sure we always have a dataset to work with
    const snapshotId = activeTab.settings?.snapshotId ?? snapshots[0]?.id ?? "";

    // Start from your "blank" default for this snapshot
    const base = makeDefaultSettings(snapshotId);

    // Merge preset settings on top of that
    let nextSettings = {
      ...base,
      ...preset.settings,
    };

    // --- Dynamic: resolve minEraName into the numeric era index (1-based) ---
    if (preset.settings.minEraName) {
      const eraIndex = ERA_ORDER.indexOf(preset.settings.minEraName);
      if (eraIndex >= 0) {
        nextSettings.minEra = eraIndex + 1; // your UI expects 1-based era index
      }
    }

    // --- Dynamic: for "recruit", choose a comparison snapshot >= 14 days ago ---
    if (presetId === "recruit") {
      const sortedByDiff = [...(comparisonOptions || [])].sort(
        (a, b) => a.diffDays - b.diffDays
      );
      const candidate = sortedByDiff.find((opt) => opt.diffDays >= 14);

      nextSettings.comparisonSnapshotId = candidate
        ? candidate.id
        : sortedByDiff.length
        ? sortedByDiff[sortedByDiff.length - 1].id
        : "";
    }

    const normalized = normalizeSettings(nextSettings);

    setSettingsDraft(normalized);
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTab.id
          ? {
              ...tab,
              settings: normalized,
              // If the preset specifies a sortConfig, apply it; otherwise keep the tab's sort.
              sortConfig: preset.sortConfig || tab.sortConfig || DEFAULT_SORT,
            }
          : tab
      )
    );
  };

  const isBaseLoading =
    activeTab?.settings?.snapshotId &&
    !playerCache.has(Number(activeTab.settings.snapshotId));
  const isComparisonLoading =
    activeTab?.settings?.comparisonSnapshotId &&
    !playerCache.has(Number(activeTab.settings.comparisonSnapshotId));

  return (
    <section id="foe-section">
      <div className="container foe-container">
        <div className="foe-header">
          <h1>Forge of Empires Player Stats</h1>
          <p>
            {activeSnapshot
              ? `Dataset: ${new Date(
                  activeSnapshot.captured_at
                ).toLocaleString()} (${activeSnapshot.label})`
              : "Pick a dataset to get started"}
          </p>
        </div>

        <div className="foe-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={
                "foe-tab" + (tab.id === activeTabId ? " foe-tab--active" : "")
              }
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="foe-tab__label">{tab.label}</span>
              {tab.type === "guild" && (
                <span
                  className="foe-tab__close"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(tab.id);
                  }}
                >
                  x
                </span>
              )}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <div className="foe-layout">
          {settingsDraft && (
            <SettingsPanel
              snapshots={snapshots}
              settings={settingsDraft}
              onChange={handleSettingsChange}
              onApplyAll={applySettingsToAll}
              presets={FOE_PRESETS}
              onApplyPreset={handleApplyPreset}
              availableGuilds={availableGuilds}
              isBusy={isBaseLoading || isComparisonLoading}
              eraOptions={ERA_ORDER.map((name, idx) => ({
                value: idx + 1,
                label: name,
              }))}
              comparisonOptions={comparisonOptions}
              onToggleInvitation={(checked) =>
                handleSettingsChange("showInvitation", checked)
              }
            />
          )}

          <div className="foe-table-area">
            <div className="foe-table-meta">
              <span>
                Showing {displayRows.length.toLocaleString()} of{" "}
                {sortedRows.length.toLocaleString()} rows
              </span>
              {isBaseLoading && (
                <span className="pill pill-warn">Loading...</span>
              )}
              {isComparisonLoading && (
                <span className="pill pill-ghost">Loading comparison...</span>
              )}
            </div>

            <div className="foe-table-wrapper">
              <PlayerTable
                rows={displayRows}
                allRows={sortedRows}
                onSort={handleSort}
                sortConfig={activeTab?.sortConfig || DEFAULT_SORT}
                onGuildClick={handleGuildClick}
                showInvitation={!!activeTab?.settings?.showInvitation}
                onRecruitmentUpdate={handleRecruitmentUpdate}
                snapshotId={activeTab?.settings?.snapshotId}
              />
            </div>

            {activeTab?.settings?.comparisonSnapshotId && (
              <p className="foe-legend">
                Battles Diff = Battles in dataset - Battles in comparison
                dataset.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FoeDashboard;
