import { describe, it, expect } from 'vitest';
import { calculateCAGEDPositions } from './cagedSystem';
import { NOTES, Note } from '../constants/musicData';

// Open-string notes matching the CAGED pattern order [high e, B, G, D, A, low E]
const STRING_NOTES: Note[] = ['E', 'B', 'G', 'D', 'A', 'E'];

const MAJOR_INTERVALS = new Set([0, 4, 7]); // 1, 3, 5
const MINOR_INTERVALS = new Set([0, 3, 7]); // 1, b3, 5

const shapeIntervals = (pattern: number[], root: Note): Set<number> => {
  const rootIndex = NOTES.indexOf(root);
  const intervals = new Set<number>();
  pattern.forEach((fret, stringIndex) => {
    if (fret === -1) return;
    const openIndex = NOTES.indexOf(STRING_NOTES[stringIndex]);
    const pitchClass = (openIndex + fret) % 12;
    intervals.add((pitchClass - rootIndex + 12) % 12);
  });
  return intervals;
};

describe('CAGED shape intervals', () => {
  it('every major shape for every root contains exactly {1, 3, 5}', () => {
    for (const root of NOTES) {
      const shapes = calculateCAGEDPositions(root, 'Major');
      expect(shapes.length).toBe(5);
      for (const shape of shapes) {
        const intervals = shapeIntervals(shape.pattern, root);
        expect(intervals, `${root} Major, ${shape.name} shape at fret ${shape.fret}`).toEqual(MAJOR_INTERVALS);
      }
    }
  });

  it('every minor shape for every root contains exactly {1, b3, 5}', () => {
    for (const root of NOTES) {
      const shapes = calculateCAGEDPositions(root, 'minor');
      expect(shapes.length).toBe(5);
      for (const shape of shapes) {
        const intervals = shapeIntervals(shape.pattern, root);
        expect(intervals, `${root} minor, ${shape.name} shape at fret ${shape.fret}`).toEqual(MINOR_INTERVALS);
      }
    }
  });

  it('places the root note on the declared root string', () => {
    for (const root of NOTES) {
      for (const type of ['Major', 'minor'] as const) {
        for (const shape of calculateCAGEDPositions(root, type)) {
          const fret = shape.pattern[shape.rootString];
          expect(fret).toBeGreaterThanOrEqual(0);
          const openIndex = NOTES.indexOf(STRING_NOTES[shape.rootString]);
          expect(NOTES[(openIndex + fret) % 12]).toBe(root);
        }
      }
    }
  });
});
