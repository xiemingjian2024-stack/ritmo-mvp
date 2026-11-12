import type { PhaseGroup } from "./phaseExerciseCatalog";

// These are homepage photographs, independent of instructional exercise media.
const backgrounds = {
  胸: "chest", 背: "back", 肩: "shoulders", 手臂: "arms", 腿: "legs", 核心: "core",
} as const satisfies Record<PhaseGroup, string>;

export function homeBackgroundForGroup(group: PhaseGroup | null) {
  const key = group ? backgrounds[group] : "default";
  return {
    key,
    imagePath: key === "default" ? "/assets/home/immersive-athlete.jpg" : `/assets/home/muscle-v2/${key}.webp`,
    // Core reuses the approved original with the reviewed local framing.
    size: key === "core" ? "auto 1030.4px" : "auto 805px",
    position: key === "core" ? "right -95px" : "right top",
  };
}

