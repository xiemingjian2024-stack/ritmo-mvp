// Reproducible, allowlisted import from the 0f168ce technical-audit snapshot.
// Never overwrites an existing asset with different bytes.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const reportDir = path.join(root, "reports/ritmo-v15-technical-audit");
const candidateFile = path.join(reportDir, "personal-candidates.csv");
const ledgerFile = path.join(reportDir, "technical-ledger-51.csv");
const playbackFile = path.join(reportDir, "video-playback-check.json");
const destination = path.join(root, "public/media/personal-v15");
const manifestFile = path.join(root, "src/personalSequenceMedia.ts");
const mappingFile = path.join(root, "reports/ritmo-v15-personal-media/media-mapping-20.csv");

function parseCsv(input) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (const char of input.replace(/^\uFEFF/, "")) {
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if (char === "\n" && !quoted) { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    if (char !== "\r") cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(values => Object.fromEntries(head.map((key, i) => [key, values[i] ?? ""])));
}
const candidates = parseCsv(fs.readFileSync(candidateFile, "utf8"));
const ledger = parseCsv(fs.readFileSync(ledgerFile, "utf8"));
const playback = new Map(JSON.parse(fs.readFileSync(playbackFile, "utf8")).results.map(row => [row.id, row]));
if (candidates.length !== 20 || ledger.length !== 51) throw new Error("Audited candidate or ledger count changed; review before importing");
const candidateById = new Map(candidates.map(item => [item.RITMO_ID, item]));
if (candidateById.size !== 20 || candidateById.has("smith")) throw new Error("Duplicate or excluded candidate ID");
const digest = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const items = ledger.map(row => {
  const id = row.RITMO_ID;
  const candidate = candidateById.get(id);
  const status = candidate ? "personal_test_ready" : row["技术核验状态_本轮"] === "存在疑问，待确认" ? "pending_confirmation" : "on_hold";
  const base = {
    id, status,
    visualGrade: row["视觉等级_原值"],
    historicalProfessionalReview: row["专业审校字段_原值"],
    technicalReview: row["技术核验状态_本轮"],
    professionalApproval: "not_verified",
  };
  if (!candidate) return base;
  if (row["视觉等级_原值"] !== "A" || row["专业审校字段_原值"] !== "待审校" || row["技术核验状态_本轮"] !== "通过初步技术核验") throw new Error(`Disallowed status for ${id}`);
  if (candidate["推荐媒体版本_原值"] !== row["推荐媒体版本_原值"]) throw new Error(`Media path mismatch for ${id}`);
  const result = playback.get(id);
  if (!result?.ok || !result.progressed || !result.seeked || !result.loopRolled || result.width !== 720 || result.height !== 720) throw new Error(`Media playback check missing for ${id}`);
  const source = path.resolve(root, candidate["推荐媒体版本_原值"]);
  if (!source.startsWith(path.join(root, "reports") + path.sep)) throw new Error(`Source outside reports: ${id}`);
  if (!fs.existsSync(source) || fs.statSync(source).size !== result.bytes) throw new Error(`Source missing or changed: ${id}`);
  const fileName = `${id.replaceAll(":", "-")}.mp4`;
  const target = path.join(destination, fileName);
  fs.mkdirSync(destination, { recursive: true });
  if (fs.existsSync(target)) {
    if (digest(target) !== digest(source)) throw new Error(`Refusing to overwrite changed media: ${target}`);
  } else fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  return {
    ...base, asset: `/media/personal-v15/${fileName}`, format: "mp4",
    source: "RITMO self-produced V1.5 Sequence",
    sourceVersion: "0f168ce technical audit",
    sourcePath: candidate["推荐媒体版本_原值"],
    bytes: result.bytes, width: result.width, height: result.height,
    sha256: digest(source),
  };
});

if (items.filter(item => item.status === "personal_test_ready").length !== 20) throw new Error("Ready count mismatch");
const manifest = { schemaVersion: 1, scope: "personal local test only; not professionally reviewed", auditCommit: "0f168ce", items };
fs.writeFileSync(manifestFile, `// Generated from the audited 51-action ledger; run scripts/import-personal-sequence-media.mjs to verify and refresh.\nexport const personalSequenceMedia = ${JSON.stringify(manifest, null, 2)} as const;\n`);
const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
const mapping = ["RITMO_ID,中文名称,本地MP4,原始制作文件,字节,源文件SHA256,个人版状态,技术核验,专业动作审校"];
for (const item of items.filter(item => item.asset)) {
  const candidate = candidateById.get(item.id);
  mapping.push([item.id, candidate["中文名称"], item.asset, item.sourcePath, item.bytes, item.sha256,
    "个人测试可用", item.technicalReview, "未完成"].map(quote).join(","));
}
fs.writeFileSync(mappingFile, mapping.join("\n") + "\n");
console.log(`Imported ${items.filter(item => item.asset).length} self-produced MP4s; no previous media overwritten`);
