// src/components/SettingsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";

const normalizeGuild = (name) =>
  (name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();

const SettingsPanel = ({
  snapshots,
  settings,
  onChange,
  onApplyAll,
  availableGuilds,
  isBusy,
  eraOptions,
  comparisonOptions,
  onToggleInvitation,
  onPresetDefault,
  onPresetRecruit,
}) => {
  const [guildQuery, setGuildQuery] = useState("");

  useEffect(() => {
    setGuildQuery("");
  }, [settings?.snapshotId, settings?.comparisonSnapshotId]);

  const filteredGuilds = useMemo(() => {
    const needle = normalizeGuild(guildQuery.trim());
    if (!availableGuilds || availableGuilds.length === 0) return [];

    const list = needle
      ? availableGuilds.filter((name) =>
          normalizeGuild(name).includes(needle)
        )
      : availableGuilds;

    return list.slice(0, 10);
  }, [availableGuilds, guildQuery]);

  const addExcludedGuild = (name) => {
    if (!name) return;
    const already = settings.excludedGuilds || [];
    if (already.some((g) => normalizeGuild(g) === normalizeGuild(name))) return;
    onChange("excludedGuilds", [...already, name]);
    setGuildQuery("");
  };

  const removeExcludedGuild = (name) => {
    const next = (settings.excludedGuilds || []).filter((g) => g !== name);
    onChange("excludedGuilds", next);
  };

  const formatNumber = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const num = Number(String(val).replace(/[',\s]/g, ""));
    if (!Number.isFinite(num)) return val;
    return num.toLocaleString("de-CH");
  };

  const sanitizeNumberInput = (value) =>
    value.replace(/[^0-9-]/g, "");

  return (
    <div className="foe-settings-panel">
      <div className="foe-settings-header">
        <h3>Settings</h3>
        <div className="foe-settings-actions">
          <button
            type="button"
            className="btn-pill btn-ghost"
            onClick={onApplyAll}
            disabled={isBusy}
          >
            Apply to all
          </button>
        </div>
      </div>

      <div className="foe-settings-group">
        <label htmlFor="dataset-select">Dataset</label>
        <select
          id="dataset-select"
          value={settings.snapshotId ?? ""}
          onChange={(e) => onChange("snapshotId", e.target.value)}
        >
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.captured_at).toLocaleString()} ({s.label})
            </option>
          ))}
        </select>
      </div>

      <div className="foe-settings-group">
        <label htmlFor="comparison-select">Comparison dataset</label>
        <select
          id="comparison-select"
          value={settings.comparisonSnapshotId ?? ""}
          onChange={(e) => onChange("comparisonSnapshotId", e.target.value)}
        >
          <option value="">None</option>
          {comparisonOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="foe-settings-group foe-settings-grid">
        <label>Era >=</label>
        <select
          value={settings.minEra ?? ""}
          onChange={(e) => onChange("minEra", e.target.value)}
        >
          <option value="">All eras</option>
          {eraOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="foe-settings-group foe-settings-grid">
        <label>Points</label>
        <div className="foe-range">
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.minPoints)}
            onChange={(e) =>
              onChange("minPoints", sanitizeNumberInput(e.target.value))
            }
            placeholder="min"
          />
          <span>to</span>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.maxPoints)}
            onChange={(e) =>
              onChange("maxPoints", sanitizeNumberInput(e.target.value))
            }
            placeholder="max"
          />
        </div>
      </div>

      <div className="foe-settings-group foe-settings-grid">
        <label>Battles</label>
        <div className="foe-range">
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.minBattles)}
            onChange={(e) =>
              onChange("minBattles", sanitizeNumberInput(e.target.value))
            }
            placeholder="min"
          />
          <span>to</span>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.maxBattles)}
            onChange={(e) =>
              onChange("maxBattles", sanitizeNumberInput(e.target.value))
            }
            placeholder="max"
          />
        </div>
      </div>

      <div className="foe-settings-group foe-settings-grid">
        <label>Battles Diff</label>
        <div className="foe-range">
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.minBattlesDiff)}
            onChange={(e) =>
              onChange("minBattlesDiff", sanitizeNumberInput(e.target.value))
            }
            placeholder="min"
          />
          <span>to</span>
          <input
            type="text"
            inputMode="numeric"
            value={formatNumber(settings.maxBattlesDiff)}
            onChange={(e) =>
              onChange("maxBattlesDiff", sanitizeNumberInput(e.target.value))
            }
            placeholder="max"
          />
        </div>
      </div>

      <div className="foe-settings-group">
        <label>Exclude guilds</label>
        <div className="foe-exclude-input">
          <input
            type="text"
            value={guildQuery}
            placeholder="Type to search..."
            onChange={(e) => setGuildQuery(e.target.value)}
          />
          {guildQuery.trim().length > 0 && filteredGuilds.length > 0 && (
            <div className="foe-suggestions">
              {filteredGuilds.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => addExcludedGuild(name)}
                  className="foe-suggestion"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="foe-chip-list">
          {(settings.excludedGuilds || []).map((name) => (
            <span key={name} className="foe-chip">
              {name}
              <button
                type="button"
                onClick={() => removeExcludedGuild(name)}
                aria-label={`Remove ${name}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="foe-settings-group">
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={!!settings.showInvitation}
            onChange={(e) => onToggleInvitation?.(e.target.checked)}
          />
          Show invitation column
        </label>
        <input
          type="date"
          value={settings.invitationCutoff ?? ""}
          onChange={(e) => onChange("invitationCutoff", e.target.value)}
          disabled={!settings.showInvitation}
        />
        <small>
          Exclude players contacted after this date (only when invitation column
          is shown).
        </small>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={!!settings.excludeContacted}
            onChange={(e) => onChange("excludeContacted", e.target.checked)}
          />
          Exclude all contacted players
        </label>
      </div>

      <div className="foe-settings-group">
        <div className="foe-settings-actions">
          <button
            type="button"
            className="btn-pill btn-ghost"
            onClick={onPresetDefault}
            disabled={isBusy}
          >
            Default
          </button>
          <button
            type="button"
            className="btn-pill"
            onClick={onPresetRecruit}
            disabled={isBusy}
          >
            Recruit
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
