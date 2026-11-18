import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HtmlValidate } from "html-validate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_ASSET_BYTES = 200 * 1024;
const MAX_ASSETS_TOTAL_BYTES = 500 * 1024;

const failures = [];

function fail(message) {
  failures.push(message);
}

function rel(file) {
  return path.relative(root, file);
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function statExists(file) {
  try {
    statSync(file);
    return true;
  } catch {
    return false;
  }
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return match ? match[2] ?? match[3] : null;
}

function decode(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&copy;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\u2019/g, "'")
    .replace(/\u2026/g, " ");
}

function pageCopy(html) {
  const parts = [];
  const title = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (title) parts.push(title[1]);

  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = attr(tag, "name") || attr(tag, "property") || "";
    if (/(^|:)(description|title)$/i.test(key) || key === "author") {
      parts.push(attr(tag, "content") || "");
    }
  }

  parts.push(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  return decode(parts.join("\n"))
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, " ");
}

function readmeCopy(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ");
}

async function checkHtml(htmlFiles) {
  const validator = new HtmlValidate({
    extends: ["html-validate:recommended"],
  });
  const report = await validator.validateMultipleFiles(htmlFiles);
  for (const result of report.results) {
    for (const message of result.messages) {
      if (message.severity < 2) continue;
      const place = `${rel(result.filePath)}:${message.line}:${message.column}`;
      fail(`HTML ${place} ${message.ruleId}: ${message.message}`);
    }
  }
}

function checkAssets() {
  const assets = walk(path.join(root, "assets"));
  let total = 0;
  for (const file of assets) {
    const size = statSync(file).size;
    total += size;
    if (size > MAX_ASSET_BYTES) {
      fail(`${rel(file)} is ${formatBytes(size)}. Each asset must be ${formatBytes(MAX_ASSET_BYTES)} or smaller.`);
    }
  }
  if (total > MAX_ASSETS_TOTAL_BYTES) {
    fail(`assets/ totals ${formatBytes(total)}. The folder must stay ${formatBytes(MAX_ASSETS_TOTAL_BYTES)} or smaller.`);
  }
}

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function checkSpelling(htmlFiles) {
  const chunks = htmlFiles.map((file) => pageCopy(readFileSync(file, "utf8")));
  const readme = path.join(root, "README.md");
  if (statExists(readme)) chunks.push(readmeCopy(readFileSync(readme, "utf8")));

  const result = spawnSync(
    path.join(root, "node_modules", ".bin", "cspell"),
    ["lint", "--no-progress", "--no-summary", "--unique", "--show-suggestions", "--no-config-search", "-c", path.join(root, ".cspell.json"), "stdin"],
    { encoding: "utf8", input: chunks.join("\n\n") }
  );
  if (result.error || result.status !== 0) {
    const detail = (result.stdout || result.stderr || result.error?.message || "spelling check failed").trim();
    fail(`Spelling\n${detail}`);
  }
}

const htmlFiles = walk(root).filter((file) => file.endsWith(".html"));

await checkHtml(htmlFiles);
checkAssets();
checkSpelling(htmlFiles);

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("All checks passed.");
