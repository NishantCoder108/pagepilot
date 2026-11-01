import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const limit = 200;
const ignoredDirectories = new Set(["node_modules", "target", "dist", "coverage"]);
const ignoredFiles = new Set(["package-lock.json", "Cargo.lock"]);
const sourceExtensions = new Set([
  ".rs", ".ts", ".tsx", ".css", ".mjs", ".py", ".html", ".svg", ".toml", ".yaml", ".json",
]);

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (!ignoredFiles.has(entry.name) &&
      (sourceExtensions.has(extname(entry.name)) || entry.name === "Dockerfile")) files.push(path);
  }
  return files;
}

const sizes = await Promise.all((await collect(root)).map(async path => {
  const text = await readFile(path, "utf8");
  const lines = text ? text.split("\n").length - Number(text.endsWith("\n")) : 0;
  return { path: relative(root, path), lines };
}));
const violations = sizes.filter(file => file.lines > limit);
if (violations.length) {
  console.error(`Source files must contain at most ${limit} lines (including blanks/comments):`);
  for (const file of violations) console.error(`  ${file.path}: ${file.lines}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: ${sizes.length} source/config files are at most ${limit} lines.`);
}
