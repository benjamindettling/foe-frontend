// src/components/PlayerTable.jsx
import React from "react";

const columns = [
  { key: "player_name", label: "Player" },
  { key: "guild_name", label: "Guild" },
  // Sort by numeric era_nr but display human-readable era name
  { key: "era_nr", label: "Era" },
  { key: "points", label: "Points" },
  { key: "battles", label: "Battles" },
  { key: "battles_diff", label: "Battles Diff" },
];

const PlayerTable = ({ rows, sortConfig, onSort }) => {
  const renderSortIcons = (key) => {
    const isActive = sortConfig.key === key;
    const activeDir = isActive ? sortConfig.direction : null;

    return (
      <span className="sort-indicator">
        <span
          className={
            "sort-icon sort-icon-asc" +
            (isActive && activeDir === "asc" ? " active" : "")
          }
          onClick={(e) => {
            e.stopPropagation();
            onSort(key, "asc");
          }}
          title="Sort ascending"
        >
          ▲
        </span>
        <span
          className={
            "sort-icon sort-icon-desc" +
            (isActive && activeDir === "desc" ? " active" : "")
          }
          onClick={(e) => {
            e.stopPropagation();
            onSort(key, "desc");
          }}
          title="Sort descending"
        >
          ▼
        </span>
      </span>
    );
  };

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="sortable">
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
            {/* Player name links to external FOE stats page in a new tab */}
            <td>
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

            {/* Guild name (no ID column shown) */}
            <td>{row.guild_name ?? "-"}</td>

            {/* Era: human-readable era string from backend */}
            <td>{row.era ?? "-"}</td>

            {/* Points */}
            <td>{row.points?.toLocaleString() ?? "-"}</td>

            {/* Battles */}
            <td>{row.battles?.toLocaleString() ?? "-"}</td>

            {/* Battles Diff */}
            <td>
              {row.battles_diff == null ? (
                <span className="foe-badge-missing">–</span>
              ) : row.battles_diff === 0 ? (
                <span className="foe-badge-zero">0</span>
              ) : (
                <span className="foe-badge-positive">
                  {row.battles_diff > 0 ? "+" : ""}
                  {row.battles_diff.toLocaleString()}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default PlayerTable;
