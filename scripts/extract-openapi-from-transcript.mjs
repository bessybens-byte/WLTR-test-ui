/**
 * One-off helper: extract OpenAPI JSON from a Cursor agent transcript line.
 * Usage: node scripts/extract-openapi-from-transcript.mjs <transcript.jsonl> [lineIndex]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "openapi", "wltr.openapi.source.json");

const transcriptPath = process.argv[2];
const lineIndex = process.argv[3] ? Number(process.argv[3]) : -1;

if (!transcriptPath) {
  console.error("Usage: node scripts/extract-openapi-from-transcript.mjs <transcript.jsonl> [lineIndex]");
  process.exit(1);
}

const lines = fs.readFileSync(transcriptPath, "utf8").split(/\r?\n/).filter(Boolean);
const idx = lineIndex >= 0 ? lineIndex : lines.length - 1;
const line = lines[idx];
if (!line) {
  console.error(`No line at index ${idx}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(line);
} catch (e) {
  console.error("Failed to parse transcript line as JSON:", e.message);
  process.exit(1);
}

const text =
  payload?.message?.content?.find?.((c) => c.type === "text")?.text ??
  payload?.message?.content?.[0]?.text;

if (!text || !text.includes('"openapi"')) {
  console.error("Line does not contain OpenAPI JSON in user message text");
  process.exit(1);
}

const start = text.indexOf("{");
const end = text.lastIndexOf("}");
if (start < 0 || end <= start) {
  console.error("Could not locate JSON object boundaries");
  process.exit(1);
}

const raw = text.slice(start, end + 1);
let doc;
try {
  doc = JSON.parse(raw);
} catch (e) {
  console.error("Extracted slice is not valid JSON:", e.message);
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(doc, null, 2));
console.log(`Wrote ${path.relative(root, out)} (${Object.keys(doc.paths ?? {}).length} paths)`);
