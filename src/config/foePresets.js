// src/config/foePresets.js

// This is intentionally "JSON-like": plain data, no functions.
// Any new object you add here will automatically become a button in SettingsPanel.

export const FOE_PRESETS = [
  {
    id: "default",
    label: "Default",
    description: "Blank preset with all filters cleared.",
    settings: {
      // snapshotId and comparisonSnapshotId will be filled in dynamically
      comparisonSnapshotId: "",
      minEra: "",
      minPoints: "",
      maxPoints: "",
      minBattles: "",
      maxBattles: "",
      minBattlesDiff: "",
      maxBattlesDiff: "",
      excludedGuilds: [],
      showInvitation: true,
      invitationCutoff: "",
      excludeContacted: false,
    },
    sortConfig: {
      key: "points",
      direction: "desc",
    },
  },

  {
    id: "recruit",
    label: "Recruit",
    description: "High-end players for recruitment.",
    settings: {
      // snapshotId will be filled in dynamically
      // comparisonSnapshotId will be chosen dynamically based on >= 14 days difference

      // Use a *name* here; FoeDashboard will translate it to the correct era index.
      minEraName: "FutureEra",

      minPoints: 10_000_000,
      maxPoints: "",
      minBattles: 10_000,
      maxBattles: "",
      minBattlesDiff: "",
      maxBattlesDiff: "",
      excludedGuilds: [
        "𝕯𝖊𝖘𝖕𝖊𝖗𝖆𝖉𝖔𝖘",
        "Outsiders",
        "🥇 Neuaufsteher 🥇",
        "Force of Nature",
        "Only Ronin`s",
        "🐉DragonRocker🏴‍☠️",
        "FunFighters",
        "Black Phönix",
      ],
      showInvitation: true,
      invitationCutoff: "",
      excludeContacted: false,
    },
    sortConfig: {
      key: "battles_diff",
      direction: "desc",
    },
  },
];
