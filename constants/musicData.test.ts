import { describe, it, expect } from 'vitest';
import { GUITAR_VOICINGS, CHORD_TYPES, CHORD_TYPE_IDS, NOTES, ChordType, Note } from './musicData';

// Standard tuning MIDI values matching the frets array order:
// index 0 = high e, 1 = B, 2 = G, 3 = D, 4 = A, 5 = low E
const OPEN_STRING_MIDI = [64, 59, 55, 50, 45, 40];

const parseKey = (key: string): { root: Note; type: ChordType } => {
  const separator = key.lastIndexOf('_');
  return { root: key.slice(0, separator) as Note, type: key.slice(separator + 1) as ChordType };
};

describe('guitar voicing data validation', () => {
  it('covers every root for every chord type', () => {
    for (const root of NOTES) {
      for (const type of CHORD_TYPE_IDS) {
        const defs = GUITAR_VOICINGS[`${root}_${type}`];
        expect(defs, `${root}_${type} has no voicings`).toBeDefined();
        expect(defs.length, `${root}_${type} voicing count`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('provides at least two voicings for every sus2/sus4 root', () => {
    for (const root of NOTES) {
      for (const type of ['sus2', 'sus4'] as const) {
        expect(GUITAR_VOICINGS[`${root}_${type}`].length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every fretted note in every voicing belongs to the chord formula', () => {
    const problems: string[] = [];

    for (const [key, defs] of Object.entries(GUITAR_VOICINGS)) {
      const { root, type } = parseKey(key);
      const rootIndex = NOTES.indexOf(root);
      const formula = CHORD_TYPES[type].intervals;

      for (const def of defs) {
        expect(def.frets.length, `${key} "${def.name}" frets length`).toBe(6);
        const intervals = new Set<number>();

        def.frets.forEach((fret, stringIndex) => {
          if (fret < 0) return;
          const pitchClass = (OPEN_STRING_MIDI[stringIndex] + fret) % 12;
          const interval = (pitchClass - rootIndex + 12) % 12;
          intervals.add(interval);
          if (!formula.includes(interval)) {
            problems.push(
              `${key} "${def.name}": string ${stringIndex} fret ${fret} plays ${NOTES[pitchClass]} (interval ${interval}), not in formula [${formula}]`,
            );
          }
        });

        // Every voicing must at least contain its root
        if (!intervals.has(0)) {
          problems.push(`${key} "${def.name}": voicing does not contain the root note`);
        }
        // A voicing needs at least three sounding strings to be a chord
        const soundingStrings = def.frets.filter(f => f >= 0).length;
        if (soundingStrings < 3) {
          problems.push(`${key} "${def.name}": only ${soundingStrings} sounding strings`);
        }
      }
    }

    expect(problems, `\n${problems.join('\n')}`).toEqual([]);
  });

  it('sus voicings contain the full formula (1, 2/4, 5)', () => {
    for (const root of NOTES) {
      const rootIndex = NOTES.indexOf(root);
      for (const type of ['sus2', 'sus4'] as const) {
        for (const def of GUITAR_VOICINGS[`${root}_${type}`]) {
          const intervals = new Set<number>();
          def.frets.forEach((fret, stringIndex) => {
            if (fret < 0) return;
            const pitchClass = (OPEN_STRING_MIDI[stringIndex] + fret) % 12;
            intervals.add((pitchClass - rootIndex + 12) % 12);
          });
          expect([...intervals].sort((a, b) => a - b), `${root}_${type} "${def.name}"`).toEqual(
            CHORD_TYPES[type].intervals,
          );
        }
      }
    }
  });

  it('keeps all voicings within a playable fret range', () => {
    for (const [key, defs] of Object.entries(GUITAR_VOICINGS)) {
      for (const def of defs) {
        for (const fret of def.frets) {
          expect(fret, `${key} "${def.name}"`).toBeGreaterThanOrEqual(-1);
          expect(fret, `${key} "${def.name}"`).toBeLessThanOrEqual(15);
        }
      }
    }
  });
});
