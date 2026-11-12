import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

// Usage: node scripts/import-exercises-dataset.mjs /path/to/exercises.json <source-commit> [output-path]
// Imports MIT-covered non-media fields only. The generated catalog is checked in for offline use.
const sourcePath = process.argv[2];
const commit = process.argv[3];
if (!sourcePath || !/^[0-9a-f]{40}$/.test(commit || "")) {
  throw new Error("Provide a source JSON path and its full 40-character Git commit SHA");
}
const outputPath = resolve(process.argv[4] || "src/data/exercises-dataset.json");
const source = await readFile(sourcePath);
const rows = JSON.parse(source.toString("utf8"));
if (!Array.isArray(rows) || rows.length === 0) throw new Error("Invalid or empty source dataset");

const nicheEquipment = new Set(["band", "resistance band", "kettlebell", "stability ball", "medicine ball", "bosu ball", "wheel roller", "roller", "rope", "weighted", "tire", "hammer", "upper body ergometer", "stepmill machine", "stationary bike", "skierg machine", "elliptical machine"]);
const allowedHomeEquipment = new Set(["body weight", "dumbbell"]);
const namedAccessoryPattern = /\b(bench|bar(?:s)?|rack|chair|box|step|ball|band|machine|dip station|doorway|suspension|pull.?up|chin.?up|platform|rope|pole)\b/i;
const instructionAccessoryPattern = /\b(?:on|under|against|using|with|onto|from|grab|hold|grip|sit on|lie on)\s+(?:a |an |the |your )?(?:sturdy |flat |exercise |pull.?up |dip )?(?:bench|chair|box|step|ball|bar|rack|machine|band|rope|platform)\b/i;
const extraHomeApparatus = /\b(?:bench|bars?|rings?|handles?|chair|box|stepbox|balance board|exercise ball|stability ball|resistance band|cable machine|step platform|suspension trainer|straps?|arm blaster|towel)\b/i;
const apparatusVariant = /\b(?:incline|decline|preacher|peacher|chest dip|triceps dip|pull[- ]?up|chin[- ]?up|suspended|suspension|ring dips?|inverted row)\b/i;
const seen = new Set();
const records = rows.map((row) => {
  if (!row || typeof row.id !== "string" || !/^\d+$/.test(row.id) || !row.name || !row.equipment || !row.target || !row.body_part) throw new Error(`Malformed exercise ${row?.id ?? "unknown"}`);
  const id = `hasan:${row.id}`;
  if (seen.has(id)) throw new Error(`Duplicate external ID ${id}`);
  seen.add(id);
  const equipment = row.equipment.trim().toLowerCase();
  const instructionsEn = row.instruction_steps?.en ?? [];
  const instructionsZh = row.instruction_steps?.zh ?? [];
  const homeEligible = allowedHomeEquipment.has(equipment) && !namedAccessoryPattern.test(row.name) && !instructionAccessoryPattern.test(instructionsEn.join(" ")) && !apparatusVariant.test(row.name) && !extraHomeApparatus.test(`${row.name} ${instructionsEn.join(" ")}`);
  const niche = nicheEquipment.has(equipment) || ["cardio", "neck"].includes(row.body_part) || !["chest", "back", "shoulders", "upper arms", "upper legs", "waist", "lower legs", "lower arms"].includes(row.body_part);
  return {
    id, sourceId: row.id, name: row.name.trim(), bodyPart: row.body_part, equipment,
    target: row.target, secondaryMuscles: Array.isArray(row.secondary_muscles) ? row.secondary_muscles : [],
    category: row.category ?? null, instructionsEn, instructionsZh,
    tier: niche ? "niche" : "extended", homeEligible,
    reviewStatus: "unreviewed", media: { sourceRef: row.media_id ? `gymvisual:${row.media_id}` : null, rightsHolder: "Gym visual", authorization: "not_licensed", localAsset: null },
  };
}).sort((a, b) => a.sourceId.localeCompare(b.sourceId));

const metadata = {
  schemaVersion: 1,
  source: "hasaneyldrm/exercises-dataset",
  sourceUrl: "https://github.com/hasaneyldrm/exercises-dataset",
  sourceCommit: commit,
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  dataLicense: "MIT; copyright 2026 Hasan Emir Yıldırım; media excluded",
  sourceCount: records.length,
};
const next = `${JSON.stringify({ metadata, records })}\n`;
await mkdir(dirname(outputPath), { recursive: true });
let existing = "";
try { existing = await readFile(outputPath, "utf8"); } catch { /* first import */ }
if (existing !== next) await writeFile(outputPath, next);
process.stdout.write(`${records.length} records (${records.filter((row) => row.tier === "extended").length} extended, ${records.filter((row) => row.tier === "niche").length} niche); ${existing === next ? "unchanged" : "updated"}\n`);
