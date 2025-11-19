// src/components/PlayerTable.jsx
import React from "react";

const columns = [
  { key: "player_name", label: "Player" },
  { key: "guild_name", label: "Guild" },
  { key: "era_nr", label: "Era" },
  { key: "points", label: "Points" },
  { key: "battles", label: "Battles" },
  { key: "battles_diff", label: "Battles Δ" },
];

const PlayerTable = ({ rows, sortConfig, onSort }) => {
  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key)
      return <span className="sort-indicator">↕</span>;
    return (
      <span className="sort-indicator">
        {sortConfig.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="sortable"
              onClick={() => onSort(col.key)}
            >
              {col.label}
              {renderSortIndicator(col.key)}
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
            {/* Player */}
            <td>{row.player_name ?? "-"}</td>

            {/* Guild */}
            <td>{row.guild_name ?? "-"}</td>

            {/* Era: show human-readable string from backend */}
            <td>{row.era ?? "-"}</td>

            {/* Points */}
            <td>{row.points.toLocaleString()}</td>

            {/* Battles */}
            <td>{row.battles.toLocaleString()}</td>

            {/* Battles Diff */}
            <td>
              {row.battles_diff == null ? (
                <span className="foe-badge-missing">–</span>
              ) : row.battles_diff === 0 ? (
                <span className="foe-badge-zero">0</span>
              ) : (
                <span className="foe-badge-positive">
                  +{row.battles_diff.toLocaleString()}
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
