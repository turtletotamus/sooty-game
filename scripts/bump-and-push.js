#!/usr/bin/env node
/**
 * 更新主站與擴充版本號、記錄發佈時間（精準到分），並 git commit + push。
 * 使用方式：node scripts/bump-and-push.js [patch|minor|major]
 * 預設為 patch（0.1.3 -> 0.1.4）。
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const versionPath = path.join(root, "lib/version.ts");
const pkgPath = path.join(root, "package.json");
const manifestPath = path.join(root, "chrome-extension/manifest.json");

const bump = process.argv[2] || "patch";

function now() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

function bumpSemver(ver, type) {
  const [a, b, c] = ver.split(".").map(Number);
  if (type === "major") return `${a + 1}.0.0`;
  if (type === "minor") return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
}

// 讀取目前主站版本
const versionTs = fs.readFileSync(versionPath, "utf8");
const mainMatch = versionTs.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
const releaseMatch = versionTs.match(/RELEASE_TIME\s*=\s*["']([^"']+)["']/);
if (!mainMatch) throw new Error("找不到 APP_VERSION");
const currentMain = mainMatch[1];
const newMain = bumpSemver(currentMain, bump);
const time = now();

// 讀取擴充版本
let manifest = fs.readFileSync(manifestPath, "utf8");
const extMatch = manifest.match(/"version"\s*:\s*"([^"]+)"/);
if (!extMatch) throw new Error("找不到 chrome-extension version");
const currentExt = extMatch[1];
const [ea, eb, ec] = currentExt.split(".").map(Number);
const newExt = `${ea}.${eb}.${ec + 1}`;

// 寫回 lib/version.ts
const newVersionTs = versionTs
  .replace(/APP_VERSION\s*=\s*["'][^"']+["']/, `APP_VERSION = "${newMain}"`)
  .replace(/RELEASE_TIME\s*=\s*["'][^"']+["']/, `RELEASE_TIME = "${time}"`);
fs.writeFileSync(versionPath, newVersionTs);

// 寫回 package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = newMain;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// 寫回 manifest.json（可能是單行）
const manifestObj = JSON.parse(manifest);
manifestObj.version = newExt;
fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 2) + "\n");

console.log(`主站 ${currentMain} -> ${newMain}`);
console.log(`擴充 ${currentExt} -> ${newExt}`);
console.log(`時間 ${time}`);

// Git add, commit, push
execSync("git add lib/version.ts package.json chrome-extension/manifest.json", { cwd: root });
execSync(`git commit -m "chore: release v${newMain} (${time})"`, { cwd: root });
execSync("git push", { cwd: root });
console.log("已 push 至 origin");
