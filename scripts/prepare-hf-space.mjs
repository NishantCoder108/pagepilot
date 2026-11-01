import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const argument = process.argv[2];
if (!argument) throw new Error("Usage: node scripts/prepare-hf-space.mjs /absolute/path/to/empty-output");
const output = resolve(argument);
const offset = relative(root, output);
if (offset !== ".." && !offset.startsWith(`..${sep}`) && !isAbsolute(offset))
  throw new Error("Use an output directory outside the project checkout.");
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error("Output directory must be empty; existing files will not be overwritten.");

for (const file of ["Cargo.toml", "Cargo.lock", "server/Cargo.toml", "server/src", "server/tests"]) {
  await cp(join(root, file), join(output, file), { recursive: true });
}
await cp(join(root, "deploy/huggingface/Dockerfile"), join(output, "Dockerfile"));
await cp(join(root, "deploy/huggingface/README.md"), join(output, "README.md"));
await writeFile(join(output, ".dockerignore"), "target\n.git\n.env\n.env.*\n");
console.log(`Prepared a backend-only Space source bundle at ${output}`);
console.log("No credentials, Git metadata, or frontend files were copied. Review the bundle before uploading.");
