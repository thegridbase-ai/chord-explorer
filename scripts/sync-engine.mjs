// Vendors the RiffForge playability engine into lib/engine/.
// Usage: node scripts/sync-engine.mjs [--source <path>]
// <path> is the engine folder (or the RiffForge repo that contains engine/); default ../RiffForge/engine.
// Copies every engine .ts file except *.test.ts (subfolders kept), prepends a one-line provenance header,
// removes stale .ts files from lib/engine first, and copies engine/README.md with the header as an HTML comment.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetDir = path.join(repoRoot, 'lib', 'engine');

const fail = (message) => {
  console.error(`sync:engine: ${message}`);
  process.exit(1);
};

const parseSourceArg = (argv) => {
  let source = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--source') {
      source = argv[++i];
      if (!source) fail('--source needs a path');
    } else if (arg.startsWith('--source=')) {
      source = arg.slice('--source='.length);
    } else {
      fail(`unknown argument "${arg}". Usage: node scripts/sync-engine.mjs [--source <path>]`);
    }
  }
  return source;
};

const resolveEngineDir = (sourceArg) => {
  const base = sourceArg ? path.resolve(process.cwd(), sourceArg) : path.resolve(repoRoot, '..', 'RiffForge', 'engine');
  if (existsSync(path.join(base, 'index.ts'))) return base;
  if (existsSync(path.join(base, 'engine', 'index.ts'))) return path.join(base, 'engine');
  return fail(`no engine/index.ts found at ${base}`);
};

/** Relative paths (posix separators) of files under `dir` accepted by `keep`, sorted. */
const listFiles = (dir, keep, prefix = '') => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), keep, rel));
    else if (entry.isFile() && keep(entry.name)) out.push(rel);
  }
  return out.sort();
};

const removeEmptyDirs = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(path.join(dir, entry.name));
  }
  if (dir !== targetDir && readdirSync(dir).length === 0) rmdirSync(dir);
};

const git = (cwd, args) => {
  try {
    return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

const engineDir = resolveEngineDir(parseSourceArg(process.argv.slice(2)));

const versionMatch = readFileSync(path.join(engineDir, 'index.ts'), 'utf8').match(
  /export\s+const\s+ENGINE_VERSION\s*=\s*['"]([^'"]+)['"]/
);
if (!versionMatch) fail(`ENGINE_VERSION not found in ${path.join(engineDir, 'index.ts')}`);
const engineVersion = versionMatch[1];

const sha = git(engineDir, ['rev-parse', '--short', 'HEAD']) ?? 'unknown';
const dirty = sha !== 'unknown' && (git(engineDir, ['status', '--porcelain', '--', '.']) ?? '') !== '';
const revision = dirty ? `${sha}+dirty` : sha;

const headerText = `Vendored from RiffForge engine ${engineVersion} (${revision}). Do not edit here; run npm run sync:engine.`;

const sourceFiles = listFiles(engineDir, (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
if (sourceFiles.length === 0) fail(`no .ts files in ${engineDir}`);

// Remove stale vendored files only after the source checked out, so a bad source never empties lib/engine.
let removed = 0;
if (existsSync(targetDir)) {
  for (const rel of listFiles(targetDir, (name) => name.endsWith('.ts'))) {
    unlinkSync(path.join(targetDir, rel));
    removed++;
  }
  removeEmptyDirs(targetDir);
}
mkdirSync(targetDir, { recursive: true });

for (const rel of sourceFiles) {
  const dest = path.join(targetDir, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, `// ${headerText}\n${readFileSync(path.join(engineDir, rel), 'utf8')}`);
}

const readme = path.join(engineDir, 'README.md');
const copiedReadme = existsSync(readme) && statSync(readme).isFile();
if (copiedReadme) {
  writeFileSync(path.join(targetDir, 'README.md'), `<!-- ${headerText} -->\n${readFileSync(readme, 'utf8')}`);
}

const folders = new Set(sourceFiles.map((rel) => path.posix.dirname(rel)).filter((dir) => dir !== '.'));
console.log(
  `sync:engine: RiffForge engine ${engineVersion} (${revision}) from ${path.relative(repoRoot, engineDir) || '.'}\n` +
    `  ${sourceFiles.length} .ts files${folders.size ? ` (subfolders: ${[...folders].join(', ')})` : ''}` +
    `${copiedReadme ? ' + README.md' : ''} -> lib/engine; ${removed} previous .ts files replaced`
);
