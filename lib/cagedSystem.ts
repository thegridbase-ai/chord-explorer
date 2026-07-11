
import { Note, NOTES, ChordType } from '../constants/musicData';

export interface CAGEDShape {
  name: 'C' | 'A' | 'G' | 'E' | 'D';
  fret: number;
  color: string;
  // Relative finger positions from the root fret [highE, B, G, D, A, lowE]
  // -1 = muted, 0+ = fret relative to position
  pattern: number[];
  rootString: number; // Which string has the root (0=highE, 5=lowE)
  description: string;
}

// Base patterns for Major chords - these are the open chord shapes
// Pattern values are relative to the base fret position
const MAJOR_PATTERNS: Record<CAGEDShape['name'], { pattern: number[]; rootString: number; rootOffset: number }> = {
  'C': {
    // C shape: x32010 - root on A string
    pattern: [0, 1, 0, 2, 3, -1],
    rootString: 4, // A string
    rootOffset: 3, // Root is 3 frets above the position
  },
  'A': {
    // A shape: x02220 - root on A string
    pattern: [0, 2, 2, 2, 0, -1],
    rootString: 4, // A string
    rootOffset: 0, // Root is at the barre
  },
  'G': {
    // G shape: 320003 - root on low E string
    pattern: [3, 0, 0, 0, 2, 3],
    rootString: 5, // Low E string
    rootOffset: 3, // Root is 3 frets above position
  },
  'E': {
    // E shape: 022100 - root on low E string
    pattern: [0, 0, 1, 2, 2, 0],
    rootString: 5, // Low E string
    rootOffset: 0, // Root is at the barre
  },
  'D': {
    // D shape: xx0232 - root on D string
    pattern: [2, 3, 2, 0, -1, -1],
    rootString: 3, // D string
    rootOffset: 0, // Root is at the position
  },
};

// Minor chord patterns
const MINOR_PATTERNS: Record<CAGEDShape['name'], { pattern: number[]; rootString: number; rootOffset: number }> = {
  'C': {
    // Cm shape (less common)
    pattern: [-1, 1, 0, 1, 3, -1],
    rootString: 4,
    rootOffset: 3,
  },
  'A': {
    // Am shape: x02210
    pattern: [0, 1, 2, 2, 0, -1],
    rootString: 4,
    rootOffset: 0,
  },
  'G': {
    // Gm shape (barre based) - B string plays 5th since minor 3rd is below open B
    pattern: [3, 3, 0, 0, 1, 3],
    rootString: 5,
    rootOffset: 3,
  },
  'E': {
    // Em shape: 022000
    pattern: [0, 0, 0, 2, 2, 0],
    rootString: 5,
    rootOffset: 0,
  },
  'D': {
    // Dm shape: xx0231
    pattern: [1, 3, 2, 0, -1, -1],
    rootString: 3,
    rootOffset: 0,
  },
};

// Colors for each shape
const SHAPE_COLORS: Record<CAGEDShape['name'], string> = {
  'C': '#3fb950', // Green
  'A': '#58a6ff', // Blue
  'G': '#bc8cff', // Purple
  'E': '#f85149', // Red
  'D': '#d29922', // Yellow/Orange
};

// Descriptions
const SHAPE_DESCRIPTIONS: Record<CAGEDShape['name'], string> = {
  'C': 'C shape - root on the 5th string (A). Mid-position chord.',
  'A': 'A shape - root on the 5th string (A). The most common barre chord shape.',
  'G': 'G shape - root on the 6th string (E). Wide finger stretch.',
  'E': 'E shape - root on the 6th string (E). The foundation of barre chords.',
  'D': 'D shape - root on the 4th string (D). Focused on the top 4 strings.',
};

// Find where a note is on a specific string
const getNoteOnString = (note: Note, stringOpenNote: Note): number => {
  const noteIndex = NOTES.indexOf(note);
  const stringIndex = NOTES.indexOf(stringOpenNote);
  return (noteIndex - stringIndex + 12) % 12;
};

// String open notes (highE to lowE)
const STRING_NOTES: Note[] = ['E', 'B', 'G', 'D', 'A', 'E'];

export const calculateCAGEDPositions = (
  rootNote: Note,
  chordType: ChordType
): CAGEDShape[] => {
  const isMinor = chordType === 'minor' || chordType === 'm7';
  const patterns = isMinor ? MINOR_PATTERNS : MAJOR_PATTERNS;

  // CAGED order as you go up the neck
  const cagedOrder: CAGEDShape['name'][] = ['E', 'D', 'C', 'A', 'G'];

  const shapes: CAGEDShape[] = [];

  for (const shapeName of cagedOrder) {
    const shapeData = patterns[shapeName];
    const rootStringNote = STRING_NOTES[shapeData.rootString];

    // Find where root note is on the root string
    const rootFret = getNoteOnString(rootNote, rootStringNote);

    // Calculate the position (base fret for this shape)
    let baseFret = rootFret - shapeData.rootOffset;

    // Handle negative frets by moving up an octave
    if (baseFret < 0) {
      baseFret += 12;
    }

    // Calculate actual fret positions
    const frets = shapeData.pattern.map((relativeFret, stringIndex) => {
      if (relativeFret === -1) return -1;
      return baseFret + relativeFret;
    });

    shapes.push({
      name: shapeName,
      fret: baseFret,
      color: SHAPE_COLORS[shapeName],
      pattern: frets,
      rootString: shapeData.rootString,
      description: SHAPE_DESCRIPTIONS[shapeName],
    });
  }

  // Sort by fret position
  shapes.sort((a, b) => a.fret - b.fret);

  return shapes;
};

// Convert CAGED shape to voicing format for display
export const cagedShapeToVoicing = (shape: CAGEDShape, rootNote: Note, isMinor: boolean) => {
  const voicing = shape.pattern
    .map((fret, stringIndex) => {
      if (fret === -1) return null;

      // Calculate the note at this position
      const stringOpenNote = STRING_NOTES[stringIndex];
      const stringOpenIndex = NOTES.indexOf(stringOpenNote);
      const noteIndex = (stringOpenIndex + fret) % 12;

      // Determine interval
      const rootIndex = NOTES.indexOf(rootNote);
      const interval = (noteIndex - rootIndex + 12) % 12;

      let intervalName: string;
      if (interval === 0) intervalName = 'Root';
      else if (interval === 3) intervalName = 'Minor 3rd';
      else if (interval === 4) intervalName = 'Major 3rd';
      else if (interval === 7) intervalName = 'Perfect 5th';
      else intervalName = 'Root'; // Fallback

      return {
        string: stringIndex, // 0=highE, 5=lowE (same as pattern index)
        fret,
        interval: intervalName as any,
      };
    })
    .filter((pos): pos is NonNullable<typeof pos> => pos !== null);

  return voicing;
};

// Get the note name at a specific fret on a specific string
export const getNoteAtFret = (stringIndex: number, fret: number): Note => {
  const stringOpenNote = STRING_NOTES[stringIndex];
  const stringOpenIndex = NOTES.indexOf(stringOpenNote);
  const noteIndex = (stringOpenIndex + fret) % 12;
  return NOTES[noteIndex];
};
