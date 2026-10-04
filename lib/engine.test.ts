import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION, DEFAULT_HAND_PROFILE, E_STANDARD, generateVoicings, shapeToMidi } from './engine';

const ENGINE_DIR = fileURLToPath(new URL('./engine', import.meta.url));

const listFiles = (dir: string, prefix = ''): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), rel) : [rel];
  });

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Revision is a git short sha, "+dirty" when the engine had uncommitted changes, or "unknown" without git.
const HEADER_BODY = `Vendored from RiffForge engine ${escapeRegExp(ENGINE_VERSION)} \\(([0-9a-f]{7,}(?:\\+dirty)?|unknown)\\)\\. Do not edit here; run npm run sync:engine\\.`;
const TS_HEADER = new RegExp(`^// ${HEADER_BODY}$`);
const README_HEADER = new RegExp(`^<!-- ${HEADER_BODY} -->$`);

describe('vendored RiffForge engine', () => {
  it('exposes a version through the barrel', () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('generates no-barre A minor voicings whose sound equals their shape', () => {
    const { voicings } = generateVoicings({
      root: 'A',
      family: 'minor',
      tuning: E_STANDARD,
      profile: DEFAULT_HAND_PROFILE,
      distortion: false,
      limit: 12,
    });
    expect(voicings.length).toBeGreaterThanOrEqual(1);
    for (const v of voicings) {
      expect(v.midi).toEqual(shapeToMidi(v.shape, E_STANDARD));
      expect(v.fingering.barres).toEqual([]);
    }
  });

  it('starts every vendored file with the provenance header', () => {
    const files = listFiles(ENGINE_DIR);
    const tsFiles = files.filter(f => f.endsWith('.ts'));
    expect(tsFiles).toContain('index.ts');
    expect(tsFiles.some(f => f.includes('/')), 'subfolders are kept').toBe(true);
    expect(tsFiles.filter(f => f.endsWith('.test.ts'))).toEqual([]);

    const revisions = new Set<string>();
    for (const rel of tsFiles) {
      const firstLine = readFileSync(path.join(ENGINE_DIR, rel), 'utf8').split('\n')[0];
      const match = firstLine.match(TS_HEADER);
      expect(match, `${rel} header`).not.toBeNull();
      revisions.add(match![1]);
    }

    const readmeFirstLine = readFileSync(path.join(ENGINE_DIR, 'README.md'), 'utf8').split('\n')[0];
    const readmeMatch = readmeFirstLine.match(README_HEADER);
    expect(readmeMatch, 'README.md header').not.toBeNull();
    revisions.add(readmeMatch![1]);

    expect([...revisions], 'one sync run').toHaveLength(1);
  });
});
