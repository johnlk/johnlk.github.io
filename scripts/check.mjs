import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as csstree from "css-tree";
import { HtmlValidate } from "html-validate";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_ASSET_BYTES = 200 * 1024;
const MAX_ASSETS_TOTAL_BYTES = 500 * 1024;
const RELEASES_URL = "https://api.github.com/repos/johnlk/youtube-music-wrapper/releases?per_page=10";

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

  const visible = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  parts.push(visible);

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/i.test(match[1]) || /application\/ld\+json/i.test(match[1])) continue;
    for (const literal of match[2].matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g)) {
      const value = (literal[1] ?? literal[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
      if (/[A-Za-z]/.test(value) && /\s/.test(value)) parts.push(value);
    }
  }

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

function localReferences(file, html) {
  const refs = [];
  for (const tag of html.matchAll(/<[^>]+>/g)) {
    for (const name of ["href", "src"]) {
      const value = attr(tag[0], name);
      if (value) refs.push(value);
    }
  }
  return refs.flatMap((value) => {
    if (!value || value.startsWith("#") || value.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
      return [];
    }
    let decoded;
    try {
      decoded = decodeURIComponent(value.split("#")[0].split("?")[0]);
    } catch {
      fail(`${rel(file)} has an invalid link: ${value}`);
      return [];
    }
    const target = path.resolve(path.dirname(file), decoded);
    const relative = path.relative(root, target);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      fail(`${rel(file)} links outside the site: ${value}`);
      return [];
    }
    return [{ from: file, value, target }];
  });
}

function checkLocalFiles(htmlFiles) {
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const ref of localReferences(file, html)) {
      if (!statExists(ref.target)) {
        fail(`${rel(ref.from)} links to a missing file: ${ref.value}`);
        continue;
      }
      if (statSync(ref.target).isDirectory() && !statExists(path.join(ref.target, "index.html"))) {
        fail(`${rel(ref.from)} links to a directory without index.html: ${ref.value}`);
      }
    }
  }
}

function statExists(file) {
  try {
    statSync(file);
    return true;
  } catch {
    return false;
  }
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

function checkCss(files) {
  for (const file of files.filter((item) => item.endsWith(".css"))) {
    try {
      csstree.parse(readFileSync(file, "utf8"), { positions: true });
    } catch (error) {
      const line = error.line == null ? "" : `:${error.line}:${error.column}`;
      fail(`CSS ${rel(file)}${line} ${error.message}`);
    }
  }
}

function checkJavaScript(files, htmlFiles) {
  const scripts = new Set(files.filter((file) => file.endsWith(".js")));
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    let index = 0;
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/i.test(match[1]) || /application\/ld\+json/i.test(match[1])) continue;
      const source = match[2].trim();
      if (!source) continue;
      const temp = path.join(tmpdir(), `site-inline-${rel(file).replaceAll("/", "-")}-${index}.js`);
      writeFileSync(temp, source);
      scripts.add(temp);
      index += 1;
    }

    for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        JSON.parse(match[1]);
      } catch (error) {
        fail(`${rel(file)} has invalid JSON-LD: ${error.message}`);
      }
    }
  }

  for (const file of scripts) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "syntax error").trim();
      const label = file.startsWith(root) ? rel(file) : path.basename(file);
      fail(`JavaScript ${label}\n${detail}`);
    }
  }
}

function checkAssets() {
  const assetsDir = path.join(root, "assets");
  const assets = walk(assetsDir);
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

function macDmg(assets) {
  const dmgs = (assets || []).filter((asset) => /\.dmg$/i.test(asset.name));
  return dmgs.find((asset) => /arm64/i.test(asset.name)) || dmgs[0] || null;
}

async function checkDownload() {
  const page = readFileSync(path.join(root, "youtube-music", "index.html"), "utf8");
  if (!page.includes(RELEASES_URL)) {
    fail("youtube-music/index.html no longer requests the GitHub releases list.");
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "johnkuhn-me-checks",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  let releases;
  try {
    const response = await fetch(RELEASES_URL, { headers, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    releases = await response.json();
  } catch (error) {
    fail(`Could not read YouTube Music releases: ${error.message}`);
    return;
  }

  let match = null;
  for (const release of releases || []) {
    const dmg = macDmg(release.assets);
    if (dmg) {
      match = { release, dmg };
      break;
    }
  }
  if (!match) {
    fail("No Mac .dmg was found on the latest YouTube Music releases.");
    return;
  }

  try {
    const response = await fetch(match.dmg.browser_download_url, {
      method: "HEAD",
      headers: { "User-Agent": "johnkuhn-me-checks" },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`download returned ${response.status}`);
  } catch (error) {
    fail(`Mac download for ${match.release.tag_name} is not reachable: ${error.message}`);
    return;
  }

  console.log(`Mac download: ${match.release.tag_name} ${match.dmg.name}`);
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

await checkHtml(htmlFiles);
checkLocalFiles(htmlFiles);
checkCss(files);
checkJavaScript(files, htmlFiles);
checkAssets();
checkSpelling(htmlFiles);
await checkDownload();

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("All checks passed.");
