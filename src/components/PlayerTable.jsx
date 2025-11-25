// src/components/PlayerTable.jsx
import React, { useMemo } from "react";

const BASE_COLUMNS = [
  { key: "player_name", label: "Player" },
  { key: "guild_name", label: "Guild" },
  { key: "era_nr", label: "Era" },
  { key: "points", label: "Points" },
  { key: "battles", label: "Battles" },
  { key: "battles_diff", label: "Battles Diff" },
];

const daysSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (d.toString() === "Invalid Date") return null;
  const now = new Date();
  const diffMs = now - d;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const invitationColor = (dateStr) => {
  const days = daysSince(dateStr);
  if (days == null) return undefined;
  const clamped = Math.max(0, Math.min(365, days));
  const hue = (clamped / 365) * 120; // 0=red, 120=green
  return `hsl(${hue}, 70%, 55%)`;
};

const PlayerTable = ({
  rows,
  allRows,
  sortConfig,
  onSort,
  onGuildClick,
  showInvitation,
  onRecruitmentUpdate,
  snapshotId,
}) => {
  const columns = useMemo(() => {
    if (showInvitation) {
      return [
        ...BASE_COLUMNS,
        { key: "recruitment_status", label: "Invitation" },
      ];
    }
    return BASE_COLUMNS;
  }, [showInvitation]);
  // Compute rough width hints per column in `ch` units
  const columnWidthHints = useMemo(() => {
    const lengths = {};

    columns.forEach((col) => {
      lengths[col.key] = col.label.length;
    });

    if (allRows && allRows.length) {
      allRows.forEach((row) => {
        columns.forEach((col) => {
          let text = "";

          if (col.key === "era_nr") {
            text = row.era ?? "";
          } else if (
            col.key === "points" ||
            col.key === "battles" ||
            col.key === "battles_diff"
          ) {
            const val = row[col.key];
            text = val == null ? "" : val.toLocaleString();
          } else if (col.key === "recruitment_status") {
            text = row.recruitment_status ?? "";
          } else {
            text = row[col.key] ?? "";
          }

          const len = String(text).length;
          if (len > lengths[col.key]) {
            lengths[col.key] = len;
          }
        });
      });
    }

    const widths = {};
    columns.forEach((col) => {
      const len = lengths[col.key] || 8;
      const isNameCol =
        col.key === "player_name" ||
        col.key === "guild_name" ||
        col.key === "era_nr";
      const min = 8;
      const max = isNameCol ? 26 : 16;
      const ch = Math.min(Math.max(len + 2, min), max);
      widths[col.key] = `${ch}ch`;
    });

    return widths;
  }, [allRows]);

  const renderSortIcons = (key) => {
    const isActive = sortConfig.key === key;
    const activeDir = isActive ? sortConfig.direction : null;

    return (
      <span className="sort-indicator">
        <button
          type="button"
          className={
            "sort-icon sort-icon-asc" +
            (activeDir === "asc" ? " sort-icon--active" : "")
          }
          onClick={(e) => {
            e.stopPropagation();
            onSort(key, "asc");
          }}
          title="Sort ascending"
        >
          ^
        </button>
        <button
          type="button"
          className={
            "sort-icon sort-icon-desc" +
            (activeDir === "desc" ? " sort-icon--active" : "")
          }
          onClick={(e) => {
            e.stopPropagation();
            onSort(key, "desc");
          }}
          title="Sort descending"
        >
          v
        </button>
      </span>
    );
  };

  const [openNoteId, setOpenNoteId] = React.useState(null);
  const [drafts, setDrafts] = React.useState({});
  const [savingId, setSavingId] = React.useState(null);
  const [saveError, setSaveError] = React.useState(null);
  const tableRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!tableRef.current) return;
      if (!tableRef.current.contains(e.target)) {
        setOpenNoteId(null);
        setSaveError(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <table ref={tableRef}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="sortable"
              style={{ width: columnWidthHints[col.key] }}
            >
              <span className="header-label">{col.label}</span>
              {renderSortIcons(col.key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length}>No data available.</td>
          </tr>
        )}
        {rows.map((row) => (
          <tr key={row.player_id}>
            <td style={{ width: columnWidthHints["player_name"] }}>
              {row.player_id ? (
                <a
                  href={`https://foe.scoredb.io/DE14/Player/${row.player_id}/Overview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="player-link"
                >
                  {row.player_name ?? "-"}
                </a>
              ) : (
                row.player_name ?? "-"
              )}
            </td>

            <td style={{ width: columnWidthHints["guild_name"] }}>
              {row.guild_name ? (
                <button
                  type="button"
                  className="player-link"
                  onClick={() =>
                    onGuildClick && onGuildClick(row.guild_id, row.guild_name)
                  }
                >
                  {row.guild_name}
                </button>
              ) : (
                "-"
              )}
            </td>

            <td style={{ width: columnWidthHints["era_nr"] }}>
              {row.era ?? "-"}
            </td>

            <td style={{ width: columnWidthHints["points"] }}>
              {row.points != null ? row.points.toLocaleString() : "-"}
            </td>

            <td style={{ width: columnWidthHints["battles"] }}>
              {row.battles != null ? row.battles.toLocaleString() : "-"}
            </td>

            <td style={{ width: columnWidthHints["battles_diff"] }}>
              {row.battles_diff == null ? (
                <span className="foe-badge-missing">-</span>
              ) : row.battles_diff === 0 ? (
                <span className="foe-badge-zero">0</span>
              ) : (
                <span className="foe-badge-positive">
                  {row.battles_diff > 0 ? "+" : ""}
                  {row.battles_diff.toLocaleString()}
                </span>
              )}
            </td>

            {showInvitation && (
              <td style={{ width: columnWidthHints["recruitment_status"] }}>
                <div className="invitation-cell">
                  <button
                    type="button"
                    className="invitation-badge"
                    style={{
                      backgroundColor: invitationColor(
                        row.recruitment_last_contacted_at
                      ),
                    }}
                    onClick={() => {
                      const nextId =
                        openNoteId === row.player_id ? null : row.player_id;
                      setOpenNoteId(nextId);
                      if (nextId) {
                        setDrafts((prev) => ({
                          ...prev,
                          [row.player_id]: {
                            recruitment_status: row.recruitment_status || "",
                            recruitment_note: row.recruitment_note || "",
                            recruitment_last_contacted_at:
                              row.recruitment_last_contacted_at || "",
                          },
                        }));
                      }
                    }}
                  >
                    {row.recruitment_status || "Set status"}
                  </button>
                  {openNoteId === row.player_id && (
                    <div className="invitation-popover">
                      <label className="invitation-popover__label">
                        Status
                        <select
                          value={
                            drafts[row.player_id]?.recruitment_status || ""
                          }
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.player_id]: {
                                ...(prev[row.player_id] || {}),
                                recruitment_status: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">(none)</option>
                          <option value="fresh">fresh</option>
                          <option value="ignored">ignored</option>
                          <option value="declined">declined</option>
                        </select>
                      </label>

                      <label className="invitation-popover__label">
                        Last contacted
                        <input
                          type="date"
                          value={
                            drafts[row.player_id]
                              ?.recruitment_last_contacted_at || ""
                          }
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.player_id]: {
                                ...(prev[row.player_id] || {}),
                                recruitment_last_contacted_at: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>

                      <label className="invitation-popover__label">
                        Notes
                        <textarea
                          rows={3}
                          value={
                            drafts[row.player_id]?.recruitment_note || ""
                          }
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.player_id]: {
                                ...(prev[row.player_id] || {}),
                                recruitment_note: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>

                      {saveError && (
                        <div className="invitation-popover__error">
                          {saveError}
                        </div>
                      )}

                      <div className="invitation-popover__actions">
                        <button
                          type="button"
                          className="btn-pill btn-ghost"
                          onClick={() => {
                            setOpenNoteId(null);
                            setSaveError(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-pill"
                          disabled={savingId === row.player_id}
                          onClick={async () => {
                            if (!onRecruitmentUpdate) return;
                            const draft = drafts[row.player_id] || {};
                            setSavingId(row.player_id);
                            setSaveError(null);
                            try {
                              await onRecruitmentUpdate(row.player_id, draft, {
                                snapshotId,
                              });
                              setOpenNoteId(null);
                            } catch (err) {
                              setSaveError(
                                err?.message || "Failed to save changes."
                              );
                            } finally {
                              setSavingId(null);
                            }
                          }}
                        >
                          {savingId === row.player_id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PlayerTable;
